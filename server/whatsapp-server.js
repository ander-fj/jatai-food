const https = require('https');
require('dotenv').config();


const express = require('express');
const cors = require('cors');
// require('dotenv').config(); // <-- MOVIDO PARA CIMA
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs'); 
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Importar o SDK do Gemini
const admin = require('firebase-admin');

// --- Inicialização do Firebase Admin (com tratamento de erro) ---
// A inicialização do Firebase agora é opcional.
// O servidor continuará funcionando para a conexão do WhatsApp,
// mas funcionalidades que dependem do Firebase (como salvar configs) não funcionarão
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    // Fallback for local development if file exists
    serviceAccount = require('./firebase-credentials.json');
  }

  // Tenta inicializar o Firebase com as credenciais
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Garante que a URL do banco de dados seja definida (se estiver usando o Realtime Database)
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  console.log('🔥 Firebase Admin SDK inicializado com sucesso!');
} catch (error) {
  // Se a inicialização falhar (ex: credenciais não encontradas), o servidor continuará rodando.
  console.warn('⚠️  Atenção: As credenciais do Firebase Admin SDK não foram encontradas. O servidor iniciará, mas as funcionalidades que dependem do Firebase (como IA e salvamento de configurações) estarão desabilitadas.');
  console.error('Detalhe do erro do Firebase:', error.message);
}

const app = express();
const router = express.Router();
const port = process.env.PORT || 3001;
const db = admin.database(); // Obter a referência do banco de dados

// --- Configuração de Log ---
const logStream = fs.createWriteStream('./server.log', { flags: 'a' });
const log = (message) => {
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] ${message}\n`);
};

// --- Configuração do CORS ---
// Permite que a URL do frontend seja configurada via variável de ambiente
const allowedOrigins = [
  'http://localhost:5173',
  'https://jataifood.vercel.app',
  'https://jataifood-alpha.vercel.app',
  'https://www.jataifood.com.br',
  'https://jataifood.com.br',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove valores undefined/null

// Log das origens permitidas na inicialização
console.log('🔒 Origens CORS permitidas:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Log detalhado para debug
    console.log(`📡 Requisição recebida de origem: ${origin || 'sem origem'}`);
    
    // Permite requisições sem origin (como apps mobile ou Postman)
    if (!origin) {
      console.log('✅ Origem vazia - permitida');
      return callback(null, true);
    }
    
    // Correção final: Forçar a permissão para a origem de produção, ignorando a lista se necessário
    if (origin === 'https://www.jataifood.com.br' || origin === 'https://jataifood.com.br') {
      console.log(`✅ Origem de produção (${origin}) - Permissão forçada.`);
      callback(null, true);
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ Origem permitida: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ Origem bloqueada por CORS: ${origin}`);
      console.log(`   Origens permitidas: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Gerenciamento de Clientes WhatsApp ---
const clients = {};

/**
 * Cria e inicializa um novo cliente WhatsApp.
 * @param {string} username - O identificador único para o cliente (ex: nome do restaurante).
 */
function createClient(username) {
  log(`[Debug] 1. Entrando na função createClient para: ${username}`);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: username }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
    },
  });

  log('[Debug] 2. Objeto cliente criado. Configurando eventos.');

  // Armazena o cliente e seu estado
  clients[username] = {
    client,
    status: 'INITIALIZING',
    qr: null,
  };

  // --- Eventos do Cliente ---

  client.on('qr', (qr) => {
    log(`[Debug] Evento 'qr' recebido para ${username}.`);
    clients[username].status = 'QR_CODE';
    clients[username].qr = qr;
  });

  const qrTimeout = setTimeout(() => {
    if (clients[username] && clients[username].status === 'INITIALIZING') {
      log(`❌ [Debug] Timeout de 30s atingido. QR Code não foi gerado para ${username}.`);
      if (client && client.pupBrowser) {
        client.destroy().catch(err => log(`[Debug] Erro ao destruir cliente no timeout: ${err.message}`));
      }
      clients[username].status = 'AUTH_FAILURE';
    }
  }, 30000);

  client.on('ready', () => {
    clearTimeout(qrTimeout);
    log(`✅ [Debug] Evento 'ready' recebido. Cliente ${username} conectado.`);
    clients[username].status = 'CONNECTED';
    clients[username].qr = null;
  });

  client.on('authenticated', () => {
    clearTimeout(qrTimeout);
    log(`🔒 [Debug] Evento 'authenticated' recebido para ${username}.`);
    clients[username].status = 'AUTHENTICATED';
  });

  client.on('auth_failure', (msg) => {
    clearTimeout(qrTimeout);
    log(`❌ [Debug] Evento 'auth_failure' recebido para ${username}: ${msg}`);
    clients[username].status = 'AUTH_FAILURE';
  });

  client.on('disconnected', (reason) => {
    log(`🔌 [Debug] Evento 'disconnected' recebido para ${username}: ${reason}`);
    clearTimeout(qrTimeout);
    const session = clients[username];
    if (session) {
      if (session.client && session.client.pupBrowser) {
        session.client.destroy().catch(err => log(`[Debug] Erro ao destruir cliente na desconexão: ${err.message}`));
      }
      delete clients[username];
    }
  });

  log('[Debug] 3. Eventos configurados. Chamando client.initialize().');
  
  client.initialize().catch(error => {
    log(`❌ [Debug] Erro CRÍTICO durante client.initialize() para ${username}: ${error.message}`);
    clearTimeout(qrTimeout);
    clients[username].status = 'AUTH_FAILURE';
  });

  log('[Debug] 4. Chamada para client.initialize() feita. Aguardando eventos...');

  // --- Lógica de Mensagens (IA Gemini) ---
  client.on('message', async (message) => {
    log(`Nova mensagem de ${message.from}: "${message.body}"`);

    // Ignorar mensagens de status, que não precisam de resposta
    if (message.isStatus) {
      return;
    }

    // Comando de teste simples para verificar se o bot está online
    if (message.body.toLowerCase() === '!ping') {
      await client.sendMessage(message.from, 'pong');
      log(`Resposta 'pong' enviada para ${message.from}`);
      return;
    }

    // --- Integração com Gemini AI ---
    // Verifica se o Firebase Admin SDK foi inicializado com sucesso.
    // Se admin.apps estiver vazio, significa que a inicialização falhou.
    if (admin.apps.length === 0) {
      log('⚠️  Firebase não inicializado. Enviando resposta padrão.');
      await client.sendMessage(message.from, 'Desculpe, o serviço de inteligência artificial não está disponível no momento. Por favor, contate o suporte.');
      return;
    }

    try {
      // 1. Obter as configurações do WhatsApp, incluindo a chave da API do Gemini, do Firebase
      const configRef = db.ref(`tenants/${username}/whatsappConfig`);
      const snapshot = await configRef.once('value');
      const whatsappConfig = snapshot.val();

      // Verifica se a configuração e a chave da API existem
      if (!whatsappConfig || !whatsappConfig.geminiApiKey) {
        log(`⚠️  Chave da API do Gemini não encontrada para ${username} no Firebase.`);
        await client.sendMessage(message.from, 'Desculpe, o serviço de inteligência artificial não está configurado corretamente. Por favor, contate o suporte.');
        return;
      }

      // 2. Inicializar o Gemini AI com a chave específica do usuário
      console.log('--- [VERIFICAÇÃO] INICIANDO GEMINI COM MODELO gemini-2.5-flash ---');
      const genAI = new GoogleGenerativeAI(whatsappConfig.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 3. Enviar a mensagem para o Gemini
      const prompt = `Você é um assistente de pedidos do restaurante "${whatsappConfig.restaurantName || 'nosso restaurante'}".
      Nosso horário de funcionamento é: ${whatsappConfig.hours || 'não informado'}.
      Nosso endereço é: ${whatsappConfig.address || 'não informado'}.
      Nosso cardápio está em: ${whatsappConfig.menuUrl || 'não informado'}.
      Analise a seguinte mensagem do cliente e extraia os detalhes do pedido (itens, quantidades, endereço, nome, telefone, forma de pagamento). Se for um pedido, responda com um JSON estruturado. Se for uma pergunta geral, responda de forma amigável.
      Mensagem do cliente: "${message.body}"`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const geminiText = response.text();
      log(`Resposta do Gemini para ${username}: ${geminiText}`);

      // 4. Processar a resposta do Gemini
      // Esta lógica de exemplo verifica se a resposta parece ser um JSON de pedido
      if (geminiText.startsWith('{') && geminiText.endsWith('}')) {
        // Tenta analisar o JSON de forma segura
        try {
          const orderDetails = JSON.parse(geminiText);
          // TODO: Salvar `orderDetails` no Firebase de forma segura.
          // Ex: db.ref(`tenants/${username}/orders`).push(orderDetails);
          await client.sendMessage(message.from, '✅ Seu pedido foi recebido e está sendo processado! Em breve você receberá a confirmação.');
        } catch (jsonError) {
          log(`❌ Erro ao analisar JSON do Gemini: ${jsonError.message}. Resposta original: ${geminiText}`);
          await client.sendMessage(message.from, geminiText); // Envia a resposta como texto normal se não for um JSON válido
        }
      } else {
        // Se não for um JSON de pedido, enviar a resposta do Gemini diretamente
        await client.sendMessage(message.from, geminiText);
      }

    } catch (error) {
      log(`❌ Erro ao processar mensagem com Gemini AI para ${username}: ${error.message}`);
      console.error(error); // Log completo do erro para depuração
      await client.sendMessage(message.from, 'Desculpe, tive um problema ao processar sua solicitação. Por favor, tente novamente mais tarde ou entre em contato com o suporte.');
    }
  });
}

/**
 * Inicia a conexão para um usuário.
 * Rota: POST /start/:username
 */
// Monta o router sob o prefixo '/api/whatsapp'
app.use('/api/whatsapp', router);
router.post('/start/:username', (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, message: 'O nome de usuário é obrigatório.' });
  }

  if (clients[username] && ['CONNECTED', 'AUTHENTICATED', 'QR_CODE'].includes(clients[username].status)) {
    log(`Tentativa de iniciar cliente já existente: ${username} com status ${clients[username].status}`);
    return res.status(200).json({ success: true, message: 'Cliente já está em processo de conexão.', status: clients[username].status });
  }

  createClient(username);
  res.status(202).json({ success: true, message: 'Inicialização do cliente iniciada. Aguarde o QR Code.' });
});

/**
 * Obtém o QR Code para um usuário.
 * Rota: GET /qr/:username
 */
router.get('/qr/:username', async (req, res) => {
  const { username } = req.params;
  const session = clients[username];

  if (session && session.status === 'QR_CODE' && session.qr) {
    try {
      // Gera o QR code como uma imagem PNG em base64
      const qrImage = await qrcode.toDataURL(session.qr);
      res.status(200).json({ success: true, qr: qrImage });
    } catch (err) {
      log(`❌ Erro ao gerar imagem do QR Code para ${username}: ${err}`);
      res.status(500).json({ success: false, message: 'Erro ao gerar imagem do QR Code.' });
    }
  } else {
    res.status(404).json({ success: false, message: 'QR Code não está disponível no momento.' });
  }
});

/**
 * Verifica o status da conexão para um usuário.
 * Rota: GET /status/:username
 */
router.get('/status/:username', (req, res) => {
  const { username } = req.params;
  const session = clients[username];

  if (session) {
    res.status(200).json({ success: true, status: session.status });
  } else {
    res.status(404).json({ success: false, status: 'DISCONNECTED' });
  }
});

/**
 * Desconecta a sessão de um usuário.
 * Rota: POST /disconnect/:username
 */
router.post('/disconnect/:username', async (req, res) => {
  const { username } = req.params;
  const session = clients[username];

  if (session) {
    log(`Desconectando cliente ${username}...`);
    try {
      // Destruir a instância do cliente força a limpeza completa da sessão.
      // O evento 'disconnected' será acionado, que por sua vez remove o cliente da lista.
      await session.client.destroy();
      log(`Sessão para ${username} destruída. Aguardando evento 'disconnected' para limpeza final.`);

      res.status(200).json({ success: true, message: 'Cliente desconectado com sucesso.' });
    } catch (err) {
      log(`❌ Erro ao desconectar ${username}: ${err}`);
      // Mesmo com erro, removemos a referência para permitir nova conexão
      delete clients[username];
      res.status(500).json({ success: false, message: 'Erro ao tentar desconectar.' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Cliente não encontrado ou já desconectado.' });
  }
});

/**
 * Envia uma mensagem de texto.
 * Rota: POST /send-message
 */
router.post('/send-message', async (req, res) => {
  const { username, number, message } = req.body;

  if (!username || !number || !message) {
    return res.status(400).json({ success: false, message: 'Os campos "username", "number" e "message" são obrigatórios.' });
  }

  const session = clients[username];
  if (!session || session.status !== 'CONNECTED') {
    return res.status(400).json({ success: false, message: 'O cliente para este usuário não está conectado.' });
  }

  try {
    // Formata o número para o padrão do WhatsApp (ex: 5564999999999@c.us)
    const sanitizedNumber = number.replace(/\D/g, '');
    const finalNumber = `${sanitizedNumber}@c.us`;

    log(`Enviando mensagem para ${finalNumber} via cliente ${username}`);
    await session.client.sendMessage(finalNumber, message);

    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    log(`❌ Erro ao enviar mensagem para ${number} via ${username}: ${err}`);
    res.status(500).json({ success: false, message: 'Falha ao enviar a mensagem.' });
  }
});

// --- Inicialização do Servidor ---

app.listen(port, () => {
  log(`🚀 Servidor WhatsApp rodando na porta ${port}`);
  log(`🔗 Frontend permitido de: ${corsOptions.origin}`);
  log('📋 Endpoints disponíveis (prefixo /api/whatsapp):');
  log('   POST /start/:username');
  log('   GET  /qr/:username');
  log('   GET  /status/:username');
  log('   POST /disconnect/:username');
  log('   POST /send-message');
});

// --- Tratamento de Encerramento ---

process.on('SIGINT', async () => {
  log('🔌 Desligando o servidor...');
  const allClients = Object.values(clients);
  for (const session of allClients) {
    if (session && session.client) {
      await session.client.destroy();
    }
  }
  logStream.end();
  process.exit(0);
});