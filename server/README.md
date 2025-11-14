# WhatsApp Server - Instruções de Configuração

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- WhatsApp instalado no celular
- Credenciais do Firebase Admin SDK

## 🚀 Instalação

1. **Instale as dependências:**
```bash
npm install
```

2. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` na pasta `server` com o seguinte conteúdo:

```env
# Porta do servidor
PORT=3001

# URL do Firebase Realtime Database
FIREBASE_DATABASE_URL=https://jataifood-default-rtdb.firebaseio.com

# Credenciais do Firebase Admin SDK (JSON completo ou arquivo separado)
# Opção 1: JSON inline (para produção/Render)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"seu-projeto",...}

# Opção 2: Arquivo separado (para desenvolvimento local)
# Crie um arquivo firebase-credentials.json na pasta server
```

3. **Obtenha as credenciais do Firebase:**

- Acesse o [Console do Firebase](https://console.firebase.google.com)
- Vá em **Configurações do Projeto** → **Contas de Serviço**
- Clique em **Gerar nova chave privada**
- Salve o arquivo JSON na pasta `server` como `firebase-credentials.json`

## ▶️ Executar o Servidor

### Modo de Produção:
```bash
npm start
```

### Modo de Desenvolvimento (com auto-reload):
```bash
npm run dev
```

O servidor iniciará em `http://localhost:3001`

## 🔌 Conectar ao WhatsApp

1. Acesse a página de administração do sistema
2. Vá para a seção "Atendimento WhatsApp"
3. Clique em "Conectar WhatsApp"
4. Escaneie o QR Code que será exibido com seu WhatsApp

## 🔍 Verificar se o Servidor está Funcionando

Teste o endpoint de health check:
```bash
curl http://localhost:3001/health
```

Deve retornar:
```json
{
  "status": "UP",
  "timestamp": "2025-11-14T...",
  "message": "Server is alive"
}
```

## 📁 Estrutura de Arquivos

```
server/
├── whatsapp-server.js      # Servidor principal
├── package.json            # Dependências do projeto
├── .env                    # Variáveis de ambiente (criar)
├── .env.example            # Exemplo de configuração
├── firebase-credentials.json  # Credenciais Firebase (criar)
└── README.md              # Este arquivo
```

## ⚠️ Problemas Comuns

### Erro "Firebase not initialized"
- Verifique se o arquivo `.env` está configurado corretamente
- Confirme que as credenciais do Firebase estão válidas

### Erro "Port 3001 already in use"
- Altere a porta no arquivo `.env`
- Ou finalize o processo que está usando a porta 3001

### QR Code não aparece
- Verifique os logs do servidor no terminal
- Aguarde até 30 segundos para o QR Code ser gerado
- Tente desconectar e conectar novamente

## 📞 Suporte

Para mais informações, consulte a documentação principal do projeto.
