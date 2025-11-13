# 📱 Guia Completo - WhatsApp Web com QR Code

## 🎯 Visão Geral

Esta integração permite conectar o WhatsApp Web diretamente ao sistema JataíFood usando **QR Code**, exatamente como você faz no navegador. Não precisa de APIs externas pagas!

### ✨ Características

- ✅ **Conexão via QR Code** - Igual ao WhatsApp Web
- ✅ **100% Gratuito** - Não precisa de Twilio, Evolution API ou outras APIs pagas
- ✅ **IA Gemini integrada** - Processa pedidos automaticamente
- ✅ **Interface visual** - QR Code aparece direto no painel administrativo
- ✅ **Sessão persistente** - Conecta uma vez e mantém conectado
- ✅ **Múltiplos usuários** - Cada estabelecimento tem sua própria conexão

## 🚀 Instalação Rápida

### 1. Instalar Dependências do Servidor

```bash
cd server
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
PORT=3001
FIREBASE_DATABASE_URL=https://jataifood-default-rtdb.firebaseio.com
```

### 3. Iniciar o Servidor WhatsApp

```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

Você verá:
```
🚀 Servidor WhatsApp rodando na porta 3001
📱 Endpoints disponíveis:
   POST /api/whatsapp/start/:username - Iniciar conexão
   GET  /api/whatsapp/qr/:username - Obter QR Code
   GET  /api/whatsapp/status/:username - Obter status
   POST /api/whatsapp/disconnect/:username - Desconectar
```

### 4. Configurar no Frontend

Adicione a URL do servidor no arquivo `.env` do frontend:
```env
REACT_APP_WHATSAPP_SERVER_URL=http://localhost:3001
```

Para produção:
```env
REACT_APP_WHATSAPP_SERVER_URL=https://seu-servidor.com
```

## 📖 Como Usar

### Passo 1: Acessar o Painel

1. Acesse: `https://jataifood.vercel.app/admin/SEU_USUARIO`
2. Faça login
3. Clique em **"Atendimento WhatsApp"** no menu lateral

### Passo 2: Configurar

1. Preencha o **número do WhatsApp** (formato: (64) 99999-9999)
2. Obtenha a **chave da API do Gemini**:
   - Acesse: https://makersuite.google.com/app/apikey
   - Faça login com sua conta Google
   - Clique em "Create API Key"
   - Copie a chave (começa com "AIza...")
3. Cole a chave no campo
4. Clique em **"Salvar Configurações"**

### Passo 3: Conectar WhatsApp

1. Clique no botão **"Conectar WhatsApp"**
2. Aguarde alguns segundos
3. Um **QR Code** aparecerá na tela

### Passo 4: Escanear QR Code

1. Abra o WhatsApp no seu celular
2. Toque em **⋮** (três pontos) → **Dispositivos conectados**
3. Toque em **"Conectar um dispositivo"**
4. Aponte a câmera para o QR Code na tela
5. Aguarde a conexão

### Passo 5: Ativar Atendimento

1. Após conectar, ative o **toggle** no topo da página
2. Pronto! O sistema está recebendo pedidos automaticamente

## 🎨 Interface Visual

### Status da Conexão

A interface mostra diferentes estados:

| Status | Ícone | Cor | Descrição |
|--------|-------|-----|-----------|
| **Desconectado** | 📵 | Cinza | WhatsApp não está conectado |
| **Inicializando** | ⏳ | Amarelo | Preparando conexão |
| **QR Code** | 📱 | Amarelo | Aguardando leitura do QR Code |
| **Autenticado** | ✅ | Azul | Autenticação concluída |
| **Conectado** | 📶 | Verde | WhatsApp conectado e funcionando |
| **Erro** | ❌ | Vermelho | Erro na conexão |

### QR Code

Quando o status for "QR Code", você verá:

```
┌─────────────────────────────┐
│  📱 Escaneie o QR Code      │
├─────────────────────────────┤
│                             │
│     ████████████████        │
│     ████████████████        │
│     ████████████████        │
│     ████████████████        │
│                             │
├─────────────────────────────┤
│ Abra o WhatsApp no celular  │
│ → Dispositivos conectados   │
│ → Conectar um dispositivo   │
└─────────────────────────────┘
```

## 🤖 Processamento de Pedidos

### Como a IA Funciona

Quando um cliente envia uma mensagem, o sistema:

1. **Recebe a mensagem** via WhatsApp Web
2. **Envia para o Gemini AI** processar
3. **Extrai os dados**:
   - Itens do pedido
   - Quantidades
   - Tamanhos
   - Endereço de entrega
   - Nome do cliente
   - Telefone
   - Forma de pagamento
4. **Cria o pedido** no Firebase automaticamente
5. **Envia confirmação** para o cliente com código de rastreamento

### Exemplo de Conversa

**Cliente:**
```
Olá! Quero fazer um pedido:

- 1 Pizza Grande de Calabresa
- 1 Pizza Média de Mussarela
- 2 Coca-Cola 2L

Entregar na Rua das Flores, 123, Centro
Nome: João Silva
Telefone: (64) 99999-9999
Pagamento: Dinheiro
```

**Sistema (automático):**
```
✅ Pedido confirmado!

Código de rastreamento: JKJXVT1C

Itens:
- 1x Pizza Grande de Calabresa
- 1x Pizza Média de Mussarela
- 2x Coca-Cola 2L

Endereço: Rua das Flores, 123, Centro
Pagamento: Dinheiro

Seu pedido foi recebido e está sendo preparado! 🍕

Você pode acompanhar o status em:
https://jataifood.vercel.app/rastreamento/JKJXVT1C

Obrigado por escolher o JataíFood! 😊
```

## 🔧 Arquitetura Técnica

### Componentes

```
┌─────────────────────────────────────────┐
│         Cliente (WhatsApp)              │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│    whatsapp-web.js (Servidor Node.js)   │
│  • Conecta via QR Code                  │
│  • Recebe mensagens                     │
│  • Mantém sessão                        │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│         Gemini AI (Google)              │
│  • Processa mensagem                    │
│  • Extrai dados do pedido               │
│  • Retorna JSON estruturado             │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│       Firebase (Banco de Dados)         │
│  • Armazena configurações               │
│  • Cria pedidos                         │
│  • Sincroniza com frontend              │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│    Frontend React (Painel Admin)        │
│  • Exibe QR Code                        │
│  • Mostra status                        │
│  • Gerencia configurações               │
└─────────────────────────────────────────┘
```

### Fluxo de Dados

```
1. Usuário clica em "Conectar WhatsApp"
   ↓
2. Frontend chama: POST /api/whatsapp/start/:username
   ↓
3. Servidor cria instância do whatsapp-web.js
   ↓
4. whatsapp-web.js gera QR Code
   ↓
5. Frontend busca: GET /api/whatsapp/qr/:username
   ↓
6. QR Code é exibido na tela
   ↓
7. Usuário escaneia com celular
   ↓
8. WhatsApp autentica e conecta
   ↓
9. Status muda para "Conectado"
   ↓
10. Sistema começa a receber mensagens
```

## 🛠️ Solução de Problemas

### Problema: QR Code não aparece

**Soluções:**
1. Verifique se o servidor está rodando: `npm start` na pasta `server/`
2. Verifique a URL no `.env`: `REACT_APP_WHATSAPP_SERVER_URL`
3. Aguarde 5-10 segundos após clicar em "Conectar"
4. Verifique o console do navegador (F12) para erros

### Problema: QR Code expira

**Soluções:**
1. Clique em "Desconectar" e depois "Conectar" novamente
2. O QR Code é válido por 20 segundos
3. Um novo QR Code é gerado automaticamente

### Problema: Erro "ECONNREFUSED"

**Causa:** Servidor Node.js não está rodando

**Solução:**
```bash
cd server
npm start
```

### Problema: Sessão desconecta sozinha

**Soluções:**
1. Não desconecte o dispositivo no WhatsApp do celular
2. Mantenha o servidor Node.js sempre rodando
3. Use PM2 para manter o servidor ativo:
```bash
npm install -g pm2
pm2 start whatsapp-server.js --name jataifood-whatsapp
pm2 save
pm2 startup
```

### Problema: IA não entende os pedidos

**Soluções:**
1. Verifique se a chave da API do Gemini está correta
2. Peça ao cliente para ser mais específico
3. Inclua todos os dados: itens, endereço, nome, telefone
4. Use formato claro e organizado

### Problema: Pedidos não aparecem no painel

**Soluções:**
1. Verifique se o atendimento está ativo (toggle ligado)
2. Confirme a conexão com Firebase
3. Verifique os logs do servidor: `tail -f server/logs/whatsapp.log`

## 📦 Deploy em Produção

### Opção 1: VPS (Recomendado)

1. **Escolha um provedor:**
   - DigitalOcean
   - AWS EC2
   - Google Cloud
   - Azure
   - Contabo

2. **Configure o servidor:**
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar repositório
git clone seu-repositorio.git
cd Jatai-sistem-food/server

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
nano .env

# Instalar PM2
npm install -g pm2

# Iniciar servidor
pm2 start whatsapp-server.js --name jataifood-whatsapp
pm2 save
pm2 startup
```

3. **Configurar firewall:**
```bash
sudo ufw allow 3001
sudo ufw enable
```

4. **Configurar domínio (opcional):**
```bash
# Instalar Nginx
sudo apt install nginx

# Configurar proxy reverso
sudo nano /etc/nginx/sites-available/whatsapp

# Adicionar:
server {
    listen 80;
    server_name whatsapp.seudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Ativar site
sudo ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Instalar SSL (opcional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d whatsapp.seudominio.com
```

### Opção 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build
docker build -t jataifood-whatsapp .

# Run
docker run -d -p 3001:3001 \
  -v $(pwd)/whatsapp-sessions:/app/whatsapp-sessions \
  --name jataifood-whatsapp \
  jataifood-whatsapp
```

## 🔐 Segurança

### Recomendações

1. **Use HTTPS** em produção
2. **Configure firewall** para permitir apenas portas necessárias
3. **Não compartilhe** a chave da API do Gemini
4. **Faça backup** das sessões do WhatsApp regularmente
5. **Use variáveis de ambiente** para dados sensíveis
6. **Monitore logs** para detectar atividades suspeitas

### Backup das Sessões

```bash
# Fazer backup
tar -czf whatsapp-backup-$(date +%Y%m%d).tar.gz whatsapp-sessions/

# Restaurar backup
tar -xzf whatsapp-backup-20240101.tar.gz
```

## 📊 Monitoramento

### Logs do Servidor

```bash
# Ver logs em tempo real
pm2 logs jataifood-whatsapp

# Ver status
pm2 status

# Ver métricas
pm2 monit
```

### Verificar Conexão

```bash
# Testar API
curl http://localhost:3001/api/whatsapp/status/SEU_USUARIO
```

## 🎉 Pronto!

Agora você tem um sistema completo de atendimento WhatsApp com:

- ✅ Conexão via QR Code (igual WhatsApp Web)
- ✅ IA Gemini processando pedidos
- ✅ Criação automática de pedidos
- ✅ Confirmação automática para clientes
- ✅ 100% gratuito (exceto custos de servidor)

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique esta documentação
2. Consulte os logs do servidor
3. Teste a conexão manualmente
4. Entre em contato com o suporte técnico

---

**Desenvolvido para JataíFood** 🍕
**Com ❤️ e tecnologia de ponta**
