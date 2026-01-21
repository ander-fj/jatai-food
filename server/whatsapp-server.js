// --- IMPORTS ---
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set, remove } = require('firebase/database');
const fs = require('fs');
const path = require('path');

// --- CONFIGURAÇÃO DE SESSÃO PERSISTENTE ---
let SESSION_BASE_PATH = process.env.SESSION_PATH || '/var/data/wwebjs_auth';
let sessionPathResolved = SESSION_BASE_PATH;

const ensureDir = (p) => {
  try {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
    const testFile = path.join(p, `.writetest-${Date.now()}`);
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return true;
  } catch (err) {
    return false;
  }
};

if (!ensureDir(SESSION_BASE_PATH)) {
  const fallback = path.join(__dirname, '.wwebjs_auth');
  console.warn(`[Sessão] Não foi possível usar SESSION_BASE_PATH="${SESSION_BASE_PATH}". Tentando fallback: ${fallback}`);
  if (!ensureDir(fallback)) {
    console.error('[Sessão] Não foi possível criar diretório de sessão nem no fallback.');
  } else {
    sessionPathResolved = fallback;
    console.log(`[Sessão] Diretório de sessão persistente criado em (fallback): ${sessionPathResolved}`);
  }
} else {
  console.log(`[Sessão] Diretório de sessão persistente: ${sessionPathResolved}`);
}

// --- VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE ---
let requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const AI_PROVIDER = (process.env.AI_PROVIDER || 'LOCAL').toUpperCase();

if (AI_PROVIDER === 'OPENAI') {
  requiredEnvVars.push('OPENAI_API_KEY');
  console.log('[AI] Usando provedor: OpenAI');
} else if (AI_PROVIDER === 'GEMINI') {
  requiredEnvVars.push('GEMINI_API_KEY');
  console.log('[AI] Usando provedor: Gemini');
} else {
  console.log('[AI] Usando provedor: Local (respostas por regras)');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('[ERRO CRÍTICO] Variáveis de ambiente faltando:');
  missingEnvVars.forEach(v => console.error(`- ${v}`));
  process.exit(1);
}

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// --- EXPRESS ---
const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = [
  'https://www.jataifood.com.br',
  'https://jataifood.com.br',
  'https://jatai-food-backend-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Adicione aqui outras origens permitidas em produção, se houver.
  // Em ambientes de desenvolvimento, 'http://localhost:5173' é geralmente suficiente.
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem não permitida: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  credentials: true,
}));

app.options('*', cors());
app.use(express.json());

// --- SESSÕES ---
const sessions = {};
const sessionModels = {};
const userChats = {};
const activeInitializations = {};
const reconnectionAttempts = {};
const startRequestTimestamps = {};
const reconnectionTimers = {};
const qrRegenerationTimers = {};
const messageProcessingLocks = {};
const globalInitLock = {}; // Lock global para evitar múltiplas inicializações

// --- CONSTANTES ---
const MAX_RECONNECTION_ATTEMPTS = 3; // Reduzido para evitar loops
const RECONNECTION_DELAY = 10000; // 10 segundos (aumentado)
const HEARTBEAT_INTERVAL = 30000; // 30 segundos
const MESSAGE_TIMEOUT = 30000; // 30 segundos
const QR_READY_TIMEOUT = 60000; // 1 minuto para atingir ready
const INIT_COOLDOWN = 5000; // Aguardar 5 segundos antes de reconectar

// --- SISTEMA IA ---
const createSystemInstruction = (config) => `
  Atue como o Jataí, o assistente virtual do restaurante ${config.restaurantName || 'Secontaf Food AQUI TEM'}. 🍕🤖
  
  OBJETIVO: Atender o usuário com excelência, tirando dúvidas básicas e enviando o cardápio.

  Sua personalidade:
  - Você é MUITO GENTIL e DIVERTIDO.
  - Use emojis para tornar a conversa leve e amigável. 😄
  - Respostas curtas e diretas, ideais para WhatsApp.

  Sua base de dados (Responda APENAS com base nisso):
  - 🕒 Horário: ${config.hours || 'Terça a Domingo das 18:00 ás 23:00'}
  - 📍 Endereço: ${config.address || 'Av, Padre Manoel da Nobrega, 215'}
  - 📝 Cardápio: ${config.menuUrl || 'https://www.jataifood.com.br/pedido?user=A'}
  - 📞 Contato: ${config.phoneNumber || '(13) 99610-5397'}

  Regras:
  1. Se perguntarem algo que não está nos dados acima, faça uma piada leve sobre ser um robô e peça para chamarem no WhatsApp oficial.
  2. Se pedirem o cardápio, envie o link ${config.menuUrl || 'https://www.jataifood.com.br/pedido?user=A'} com entusiasmo!
  3. Nunca invente informações que não estão listadas aqui.
`;

const wait = ms => new Promise(r => setTimeout(r, ms));

// --- FUNÇÃO DE ENVIO SEGURO (ANTI-CRASH) ---
const safeSend = async (client, to, text) => {
  try {
    // linkPreview: false ajuda a evitar travamentos com LIDs
    await client.sendMessage(to, text, { linkPreview: false });
  } catch (e) {
    const msg = (e.message || String(e)).toLowerCase();
    // O erro 'markedUnread' é um bug conhecido da biblioteca (especialmente com LIDs).
    // A mensagem geralmente é enviada, então apenas logamos um aviso e NÃO relançamos o erro.
    if (msg.includes('markedunread') || msg.includes('reading \'markedunread\'')) {
      console.warn(`[SAFE SEND] ⚠️ Erro 'markedUnread' ignorado para ${to}. (Bug da lib, mensagem enviada)`);
      return; // Retorna como se fosse sucesso para não quebrar o fluxo
    } else {
      // Para outros erros, loga e relança para que o bloco superior possa tratar.
      console.error(`[SAFE SEND ERROR] Falha ao enviar para ${to}:`, e.message || e);
      throw e;
    }
  }
};

// --- FUNÇÃO ABSTRATA DE IA ---
const getAiResponse = async (sessionId, chatId, userMessage, config) => {
  const AI_PROVIDER = (process.env.AI_PROVIDER || 'LOCAL').toUpperCase();

  if (AI_PROVIDER === 'LOCAL') {
    const message = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Lowercase and remove accents
    
    // Configuração com os dados padrão do Secontaf Food
    const menuUrl = config.menuUrl || 'https://www.jataifood.com.br/pedido?user=A';
    const hours = config.hours || 'Terça a Domingo das 18:00 ás 23:00';
    const address = config.address || 'Av, Padre Manoel da Nobrega, 215';
    const restaurantName = config.restaurantName || 'Secontaf Food AQUI TEM';
    const phoneNumber = config.phoneNumber || '(13) 99610-5397';
    const welcomeMessage = config.welcomeMessage || 'SEJAAAAAAAAAAAAAAA BEM VINDO a secontaf';

    // Rule for menu
    if (message.includes('cardapio') || message.includes('menu')) {
        return `Claro! 🥳 Aqui está o nosso cardápio recheado de delícias. É só clicar no link para conferir:\n\n${menuUrl}`;
    }

    // Rule for hours
    if (message.includes('horario') || message.includes('aberto') || message.includes('atendimento') || message.includes('fecha')) {
        return `Nosso horário de funcionamento é: ${hours} ⏰. Esperamos por você!`;
    }

    // Rule for address
    if (message.includes('endereco') || message.includes('onde') || message.includes('localizacao')) {
        return `Ficamos na ${address} 📍. Venha nos visitar!`;
    }

    // Default "I don't understand" response
    const contactInfo = `Se preferir, fale com um atendente pelo número ${phoneNumber}.`;
    return `${welcomeMessage}\n\nEu sou o assistente virtual do ${restaurantName}. No momento, consigo te ajudar com o cardápio, nosso horário e endereço. Para outros assuntos, ${contactInfo}`;

  } else if (AI_PROVIDER === 'OPENAI') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set in environment variables.');

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemInstruction = createSystemInstruction(config);

    if (!userChats[sessionId]) userChats[sessionId] = {};
    // Se o histórico não existe ou é de outro provedor, cria um novo.
    if (!userChats[sessionId][chatId] || userChats[sessionId][chatId].provider !== 'OPENAI') {
      console.log(`[Sessão ${sessionId}] Iniciando nova conversa OpenAI para ${chatId}`);
      userChats[sessionId][chatId] = {
        provider: 'OPENAI',
        history: [{ role: 'system', content: systemInstruction }]
      };
    }

    userChats[sessionId][chatId].history.push({ role: 'user', content: userMessage });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_NAME || "gpt-3.5-turbo",
      messages: userChats[sessionId][chatId].history,
    });

    const responseText = completion.choices[0].message.content;
    userChats[sessionId][chatId].history.push({ role: 'assistant', content: responseText });
    return responseText;

  } else if (AI_PROVIDER === 'GEMINI') {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in environment variables.');

    // Se o modelo não existe ou é de outro provedor, cria um novo.
    if (!sessionModels[sessionId] || sessionModels[sessionId].provider !== 'GEMINI') {
      console.log(`[Sessão ${sessionId}] (Re)Iniciando modelo Gemini...`);
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      let modelName = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash";
      if (modelName.startsWith('models/')) modelName = modelName.replace('models/', '');
      
      sessionModels[sessionId] = {
        provider: 'GEMINI',
        model: genAI.getGenerativeModel({ model: modelName, systemInstruction: createSystemInstruction(config) })
      };
      // Quando o modelo principal muda, limpa os chats de usuário para evitar conflitos de histórico
      userChats[sessionId] = {};
    }

    if (!userChats[sessionId]) userChats[sessionId] = {};
    if (!userChats[sessionId][chatId]) {
      console.log(`[Sessão ${sessionId}] Iniciando nova conversa Gemini para ${chatId}`);
      userChats[sessionId][chatId] = sessionModels[sessionId].model.startChat({ history: [] });
    }

    const chat = userChats[sessionId][chatId];
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } else {
      throw new Error(`Provedor de IA '${AI_PROVIDER}' desconhecido. Defina AI_PROVIDER como LOCAL, GEMINI ou OPENAI.`);
  }
};

// --- HELPER: RESOLVER ID REAL (LID FIX) ---
const resolveTargetId = async (message) => {
  if (message.from.includes('@lid')) {
    try {
      // 1. Tenta obter o contato (Geralmente retorna o ID @c.us correto)
      const contact = await message.getContact();
      if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith('@c.us')) {
        return contact.id._serialized;
      }
      // 2. Tenta obter o chat
      const chat = await message.getChat();
      if (chat && chat.id && chat.id._serialized && chat.id._serialized.endsWith('@c.us')) {
        return chat.id._serialized;
      }
    } catch (e) {
      console.warn('Erro ao resolver LID:', e.message);
    }
  }
  return message.from;
};

// --- FUNÇÕES DE VALIDAÇÃO ---
const isPuppeteerError = (error) => {
  const errorStr = String(error);
  return errorStr.includes('Falha na avaliação') || 
         errorStr.includes('ExecutionContext') ||
         errorStr.includes('Target closed') ||
         errorStr.includes('Session closed');
};

// --- LIMPEZA DE SESSÃO ---
const cleanupSession = async (sessionId, forceRemoveAuth = false) => {
  console.log(`[Sessão ${sessionId}] 🧹 Limpando sessão... RemoveAuth=${forceRemoveAuth}`);

  const client = sessions[sessionId]?.client || null;

  try { await remove(ref(database, `tenants/${sessionId}/session`)); } catch {}

  if (client) {
    try {
      client.removeAllListeners();
      await client.destroy();
    } catch (e) {
      console.error(`[Sessão ${sessionId}] Erro ao destruir cliente:`, e.message);
    }
    delete sessions[sessionId];
  }

  delete sessionModels[sessionId];
  delete userChats[sessionId];
  delete messageProcessingLocks[sessionId];

  // Limpar timers
  if (reconnectionTimers[sessionId]) {
    clearTimeout(reconnectionTimers[sessionId]);
    delete reconnectionTimers[sessionId];
  }

  if (qrRegenerationTimers[sessionId]) {
    clearTimeout(qrRegenerationTimers[sessionId]);
    delete qrRegenerationTimers[sessionId];
  }

  if (forceRemoveAuth) {
    const folder = path.join(sessionPathResolved, `session-${sessionId}`);
    if (fs.existsSync(folder)) {
      try {
        fs.rmSync(folder, { recursive: true, force: true });
        console.log(`[Sessão ${sessionId}] Pasta removida: ${folder}`);
      } catch (e) {
        console.error(`[Sessão ${sessionId}] Erro ao remover pasta:`, e.message);
      }
    }
  }
};

// --- VERIFICAÇÃO DE ESTADO DO CLIENTE ---
const isClientValid = async (sessionId) => {
  const session = sessions[sessionId];
  if (!session || !session.client) return false;

  try {
    const state = await session.client.getState();
    return state === 'CONNECTED';
  } catch (e) {
    return false;
  }
};

// --- HEARTBEAT PARA MANTER CONEXÃO VIVA ---
const startHeartbeat = (sessionId) => {
  const interval = setInterval(async () => {
    try {
      if (await isClientValid(sessionId)) {
        // OK
      } else {
        clearInterval(interval);
      }
    } catch (e) {
      clearInterval(interval);
    }
  }, HEARTBEAT_INTERVAL);

  return interval;
};

// --- LISTENERS DE CICLO ---
const attachLifecycleListeners = (client, sessionId) => {
  const sessionRef = ref(database, `tenants/${sessionId}/session`);
  let qrCount = 0;
  let readyDetected = false;

  client.on('qr', async (qr) => {
    const session = sessions[sessionId];
    if (!session) return;
    
    qrCount++;
    session.qrAttempts++;
    const qrUrl = await qrcode.toDataURL(qr);

    console.log(`[Sessão ${sessionId}] QR gerado #${session.qrAttempts}`);

    // Se QR foi gerado APÓS a sessão estar ready, é um logout automático
    if (readyDetected) {
      console.warn(`[Sessão ${sessionId}] ⚠️  QR regenerado após estar ready - Múltiplas conexões detectadas`);
      
      if (qrRegenerationTimers[sessionId]) {
        clearTimeout(qrRegenerationTimers[sessionId]);
      }

      qrRegenerationTimers[sessionId] = setTimeout(async () => {
        const isValid = await isClientValid(sessionId);
        if (!isValid) {
          console.error(`[Sessão ${sessionId}] ❌ Confirmado: Múltiplas conexões - Desconectando`);
          await cleanupSession(sessionId, true);
          await set(sessionRef, { status: 'logged_out', reason: 'multiple_connections' });
        }
      }, 2000);
    } else {
      await set(sessionRef, {
        status: 'QR_CODE',
        qr: qrUrl,
        attempt: session.qrAttempts
      });
    }
  });

  client.once('authenticated', () => {
    console.log(`[Sessão ${sessionId}] 🔐 Autenticado`);
  });

  client.once('ready', async () => {
    console.log(`[Sessão ${sessionId}] ✅ Cliente pronto`);
    readyDetected = true;
    await set(sessionRef, { status: 'ready' });
    sessions[sessionId].status = 'ready';
    sessions[sessionId].qrAttempts = 0;
    sessions[sessionId].reconnectAttempts = 0;
    sessions[sessionId].lastActivity = Date.now();

    if (!sessions[sessionId].heartbeatInterval) {
      sessions[sessionId].heartbeatInterval = startHeartbeat(sessionId);
    }

    if (qrRegenerationTimers[sessionId]) {
      clearTimeout(qrRegenerationTimers[sessionId]);
      delete qrRegenerationTimers[sessionId];
    }
  });

  client.on('message', async (message) => {
    if (message.fromMe) return;

    // --- VALIDAÇÕES DE SEGURANÇA (ROBUSTEZ) ---
    // 1. Ignorar atualizações de status (broadcasts) para evitar crash de 'markedUnread'
    if (message.isStatus || message.from === 'status@broadcast') {
      return;
    }

    // 2. Validar se o remetente existe e é uma string válida
    if (!message.from || typeof message.from !== 'string') {
      console.warn(`[Sessão ${sessionId}] ⚠️ Mensagem ignorada: remetente inválido.`);
      return;
    }

    const chatId = message.from;
    const messageId = message.id.id || `${Date.now()}-${Math.random()}`;

    if (messageProcessingLocks[messageId]) {
      return;
    }

    messageProcessingLocks[messageId] = true;

    try {
      console.log(`[Sessão ${sessionId}] 📩 Mensagem de ${chatId}: "${message.body}"`);

      if (!await isClientValid(sessionId)) {
        console.warn(`[Sessão ${sessionId}] ⚠️  Cliente inválido ao receber mensagem`);
        return;
      }

      if (!message.body || message.body.trim() === '') {
        console.log(`[Sessão ${sessionId}] ⏭️  Mensagem vazia, ignorando`);
        return;
      }

      const configSnap = await get(ref(database, `tenants/${sessionId}/whatsappConfig`));
      const config = configSnap.exists() ? configSnap.val() : {};

      // Verifica se o atendimento está ativo nas configurações
      if (config.isActive === false) {
        console.log(`[Sessão ${sessionId}] 🔇 Atendimento desativado nas configurações. Ignorando mensagem.`);
        return;
      }

      // --- GERAÇÃO DA RESPOSTA (SEM FALLBACKS) ---
      let text;
      try {
        const aiPromise = getAiResponse(sessionId, chatId, message.body, config);
        text = await Promise.race([
          aiPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout (${MESSAGE_TIMEOUT}ms) ao aguardar resposta da IA`)), MESSAGE_TIMEOUT)
          )
        ]);
      } catch (aiErr) {
        console.error(`[Sessão ${sessionId}] ❌ Erro da API de IA: ${aiErr.message}`);
        throw aiErr; // Re-lança o erro para o handler principal, que enviará a mensagem de erro ao usuário.
      }
      
      console.log(`[Sessão ${sessionId}] 🤖 Resposta gerada: "${text.slice(0, 60).replace(/\n/g, ' ')}..."`);

      // --- ENVIO DA RESPOSTA ---
      if (!await isClientValid(sessionId)) {
        console.warn(`[Sessão ${sessionId}] ⚠️  Cliente desconectou antes de enviar resposta`);
        return;
      }

      try {
        const targetId = await resolveTargetId(message);
        await safeSend(sessions[sessionId].client, targetId, text);
        console.log(`[Sessão ${sessionId}] ✅ Resposta processada para ${message.from} (Destino real: ${targetId})`);
      } catch (sendErr) {
        // O safeSend já logou o erro, aqui apenas registramos a falha total.
        console.error(`[Sessão ${sessionId}] ❌ Falha total no envio para ${message.from}. Erro:`, sendErr.message);
      }
      
      sessions[sessionId].lastActivity = Date.now();

    } catch (err) {
      console.error(`[Sessão ${sessionId}] Erro ao processar mensagem:`, err.message);

      // AUTO-HEALING: Limpa a sessão da IA em caso de erro para forçar reinicialização na próxima mensagem
      // Isso resolve problemas de modelos travados ou configurados errados
      if (sessionModels[sessionId]) {
        delete sessionModels[sessionId];
        delete userChats[sessionId];
        console.log(`[Sessão ${sessionId}] ♻️ Sessão da IA resetada para recuperação automática.`);
      }

      // Envia uma mensagem de erro genérica para o usuário final,
      // independentemente do tipo de erro (API, Puppeteer, etc),
      // desde que o cliente ainda esteja conectado.
      const isAiError = String(err).includes('GoogleGenerativeAI') || String(err).includes('OpenAI') || String(err).includes('Timeout');
      if (await isClientValid(sessionId) && isAiError) {
        try {
          const errorMsg = '🤖 Desculpe, estou com um problema para me conectar à minha inteligência. Tente novamente em alguns instantes.';
          // Usa o chatId já resolvido para enviar a mensagem de erro diretamente,
          // evitando depender do objeto 'message' que pode estar inválido.
          // O safeSend já lida com o 'markedUnread' relançando-o.
          await safeSend(sessions[sessionId].client, chatId, errorMsg);
        } catch (replyErr) {
          console.error(`[Sessão ${sessionId}] Falha ao enviar a mensagem de erro para o usuário:`, replyErr.message);
        }
      }
    } finally {
      delete messageProcessingLocks[messageId];
    }
  });

  client.on('disconnected', async (reason) => {
    console.log(`[Sessão ${sessionId}] ❌ Desconectado: ${reason}`);
    readyDetected = false;

    if (String(reason).toUpperCase() === 'LOGOUT') {
      console.log(`[Sessão ${sessionId}] Logout detectado, limpando sessão...`);
      await cleanupSession(sessionId, true);
      await set(sessionRef, { status: 'logged_out' });
      return;
    }

    await set(sessionRef, { status: 'disconnected' }); // Garante a atualização imediata do status
    await cleanupSession(sessionId, false);

    // Tentar reconectar com delay maior
    const attempts = sessions[sessionId]?.reconnectAttempts || 0;
    if (attempts < MAX_RECONNECTION_ATTEMPTS) {
      const delay = RECONNECTION_DELAY * Math.pow(2, attempts); // Backoff exponencial
      console.log(`[Sessão ${sessionId}] Tentando reconectar em ${delay/1000}s (${attempts + 1}/${MAX_RECONNECTION_ATTEMPTS})...`);
      
      reconnectionTimers[sessionId] = setTimeout(() => {
        initializeWhatsAppClient(sessionId)
          .then(() => console.log(`[Sessão ${sessionId}] Reconexão bem-sucedida`))
          .catch(e => console.error(`[Sessão ${sessionId}] Falha na reconexão:`, e.message));
      }, delay);
    } else {
      console.error(`[Sessão ${sessionId}] Máximo de tentativas de reconexão atingido`);
    }
  });

  client.on('error', (err) => {
    console.error(`[Sessão ${sessionId}] Erro do cliente:`, err.message);
  });
};

// --- INICIALIZAÇÃO DO CLIENTE ---
const initializeWhatsAppClient = async (sessionId) => {
  // Usar lock global para evitar múltiplas inicializações simultâneas
  if (globalInitLock[sessionId]) {
    console.log(`[Sessão ${sessionId}] Inicialização já em progresso, aguardando...`);
    return globalInitLock[sessionId];
  }

  if (activeInitializations[sessionId]) {
    return activeInitializations[sessionId];
  }

  globalInitLock[sessionId] = new Promise(async (resolve, reject) => {
    activeInitializations[sessionId] = new Promise(async (resolveInit, rejectInit) => {
      try {
        // Verificar se já existe uma instância ativa
        if (sessions[sessionId]?.client && await isClientValid(sessionId)) {
          console.log(`[Sessão ${sessionId}] Cliente já está ativo, retornando sessão existente`);
          resolveInit(sessions[sessionId]);
          resolve(sessions[sessionId]);
          delete globalInitLock[sessionId];
          return;
        }

        // Limpar sessão anterior se existir
        if (sessions[sessionId]) {
          await cleanupSession(sessionId, false);
        }

        // Aguardar um pouco antes de inicializar para evitar conflito
        await wait(INIT_COOLDOWN);

        let client = new Client({
          authStrategy: new LocalAuth({
            clientId: sessionId,
            dataPath: sessionPathResolved
          }),
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-plugins',
              '--disable-images',
            ],
          }
        });

        attachLifecycleListeners(client, sessionId);

        sessions[sessionId] = {
          client,
          status: 'INITIALIZING',
          qrAttempts: 0,
          reconnectAttempts: (sessions[sessionId]?.reconnectAttempts || 0) + 1,
          lastActivity: Date.now(),
          heartbeatInterval: null
        };

        await client.initialize();
        resolveInit(sessions[sessionId]);
        resolve(sessions[sessionId]);

      } catch (e) {
        console.error(`[Sessão ${sessionId}] Erro na inicialização:`, e.message);
        rejectInit(e);
        reject(e);
      } finally {
        delete activeInitializations[sessionId];
        delete globalInitLock[sessionId];
      }
    });

    return activeInitializations[sessionId];
  });

  return globalInitLock[sessionId];
};

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    time: new Date().toISOString(),
    sessions: Object.keys(sessions)
  });
});

// --- STATUS ROUTE ---
app.get('/api/whatsapp/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  const isValid = await isClientValid(sessionId);
  
  if (isValid) {
    res.json({ status: 'ready' });
  } else {
    try {
      const snap = await get(ref(database, `tenants/${sessionId}/session/status`));
      res.json({ status: snap.exists() ? snap.val() : 'disconnected' });
    } catch (e) {
      res.json({ status: 'disconnected' });
    }
  }
});

// --- QR ROUTE ---
app.get('/api/whatsapp/qr/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const qrRef = ref(database, `tenants/${sessionId}/session/qr`);
    const snapshot = await get(qrRef);
    if (snapshot.exists()) {
      res.json({ qr: snapshot.val() });
    } else {
      res.json({ qr: null, message: 'QR ainda não gerado.' });
    }
  } catch (e) {
    console.error(`[QR ${sessionId}] erro:`, e.message);
    res.status(500).json({ error: 'Erro ao buscar QR' });
  }
});

// --- GET CHATS ROUTE ---
app.get('/api/whatsapp/chats/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessions[sessionId] || !sessions[sessionId].client) {
    return res.status(404).json({ error: 'Sessão não ativa' });
  }

  if (!await isClientValid(sessionId)) {
     return res.status(503).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const client = sessions[sessionId].client;
    const chats = await client.getChats();
    
    console.log(`[Chats ${sessionId}] Buscando chats. Encontrados: ${chats.length}`);
    
    const formattedChats = chats
      .filter(chat => !chat.isGroup) // Filtra grupos para focar em atendimento
      .slice(0, 15) // Limita aos 15 mais recentes
      .map(chat => ({
        id: chat.id._serialized,
        name: chat.name || chat.id.user,
        number: chat.id.user,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? (chat.lastMessage.body || '[Mídia/Outros]') : '',
        timestamp: chat.timestamp || (Date.now() / 1000),
        isGroup: chat.isGroup
      }));

    res.json({ success: true, chats: formattedChats });
  } catch (e) {
    console.error(`[Chats ${sessionId}] erro:`, e.message);
    res.status(500).json({ error: 'Erro ao buscar chats' });
  }
});

// --- GET MESSAGES ROUTE ---
app.get('/api/whatsapp/messages/:sessionId/:chatId', async (req, res) => {
  const { sessionId, chatId } = req.params;
  
  if (!sessions[sessionId] || !sessions[sessionId].client) {
    return res.status(404).json({ error: 'Sessão não ativa' });
  }

  if (!await isClientValid(sessionId)) {
     return res.status(503).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const client = sessions[sessionId].client;
    console.log(`[Messages ${sessionId}] Buscando mensagens para: ${chatId}`);

    const chat = await client.getChatById(chatId);
    if (!chat) {
      console.warn(`[Messages ${sessionId}] Chat não encontrado: ${chatId}`);
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    const messages = await chat.fetchMessages({ limit: 50 });
    
    const formattedMessages = messages.map(msg => ({
      id: msg.id.id,
      fromMe: msg.fromMe,
      body: msg.body || (msg.hasMedia ? '[Mídia/Arquivo]' : `[${msg.type}]`), // Tratamento para mensagens sem texto (fotos, áudios)
      timestamp: msg.timestamp,
      type: msg.type
    }));

    res.json({ success: true, messages: formattedMessages });
  } catch (e) {
    console.error(`[Messages ${sessionId}] erro:`, e.message);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// --- START SESSION ---
app.post('/api/whatsapp/start/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const now = Date.now();
  const WINDOW = 10000;

  if (startRequestTimestamps[sessionId]) {
    const delta = now - startRequestTimestamps[sessionId];
    if (delta < WINDOW) {
      return res.status(429).json({
        success: false,
        message: `Espere ${Math.ceil((WINDOW - delta) / 1000)} segundos para tentar novamente`
      });
    }
  }

  startRequestTimestamps[sessionId] = now;

  const sessionRef = ref(database, `tenants/${sessionId}/session`);
  const snap = await get(sessionRef);
  const fbStatus = snap.exists() ? snap.val().status : 'disconnected';

  if (fbStatus === 'ready' && sessions[sessionId]) {
    const isValid = await isClientValid(sessionId);
    if (isValid) {
      return res.json({ success: true, message: 'Sessão já conectada' });
    }
  }

  console.log(`[Sessão ${sessionId}] Iniciando inicialização...`);

  initializeWhatsAppClient(sessionId)
    .then(() => console.log(`[Sessão ${sessionId}] Inicialização concluída`))
    .catch(e => console.error(`[Sessão ${sessionId}] Falha init:`, e.message));

  res.json({ success: true, message: 'Inicialização iniciada' });
});

// --- STOP SESSION ---
app.post('/api/whatsapp/stop/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const session = sessions[sessionId];
  
  try {
    if (session && session.client) {
      try {
        await session.client.logout();
      } catch (e) {
        console.warn(`[Sessão ${sessionId}] Erro ao fazer logout (pode já estar fechado):`, e.message);
      }
    }

    await cleanupSession(sessionId, true);
    res.json({ success: true, message: 'Sessão encerrada' });
  } catch (e) {
    console.error(`[Sessão ${sessionId}] Erro ao desconectar:`, e.message);
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

// --- UPDATE CONFIG ---
app.post('/api/config/update/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Nenhum dado enviado' });
  }

  try {
    const cfgRef = ref(database, `tenants/${sessionId}/whatsappConfig`);
    await set(cfgRef, data);

    delete sessionModels[sessionId];
    delete userChats[sessionId];

    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (e) {
    console.error(`[Config ${sessionId}] erro:`, e.message);
    res.status(500).json({ error: 'Falha ao salvar config' });
  }
});

// --- GLOBAL ERROR HANDLERS ---
process.on('unhandledRejection', (reason, p) => {
  const errorStr = String(reason);
  // Ignora erros de "detached Frame" ou sessão fechada que ocorrem durante o logout/cleanup
  if (errorStr.includes('detached Frame') || errorStr.includes('Session closed') || errorStr.includes('Target closed')) {
    return;
  }
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

// --- CLEANUP ON EXIT ---
process.on('SIGINT', async () => {
  console.log('\n[Sistema] Encerrando servidor...');
  for (const sessionId of Object.keys(sessions)) {
    await cleanupSession(sessionId, false);
  }
  process.exit(0);
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  console.log('📱 Aguardando sessões do WhatsApp...');
});