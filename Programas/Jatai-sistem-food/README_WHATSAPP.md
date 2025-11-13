# 🚀 Instalação da Integração WhatsApp

## Arquivos Adicionados

Esta integração adiciona os seguintes arquivos ao projeto:

### Frontend
- `src/components/WhatsAppAttendanceSection.tsx` - Componente da página de configuração

### Backend (APIs)
- `api/whatsapp/webhook.ts` - Webhook para receber mensagens do WhatsApp
- `api/config/[username].ts` - API para buscar configurações
- `api/orders/[username].ts` - API para criar pedidos

### Configuração
- `vercel.json` - Configuração de rotas da Vercel (atualizado)
- `package.json` - Dependências (atualizado)

### Documentação
- `WHATSAPP_INTEGRATION.md` - Documentação completa da integração
- `README_WHATSAPP.md` - Este arquivo

## 📦 Instalação

### 1. Instalar Dependências

```bash
npm install
# ou
yarn install
```

Novas dependências adicionadas:
- `@google/generative-ai` - SDK do Gemini AI
- `@vercel/node` - Runtime da Vercel para APIs
- `firebase-admin` - SDK Admin do Firebase

### 2. Configurar Variáveis de Ambiente

Crie ou atualize o arquivo `.env` na raiz do projeto:

```env
# Firebase
FIREBASE_DATABASE_URL=https://seu-projeto.firebaseio.com

# Opcional: Credenciais do Firebase Admin SDK (para produção)
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Deploy

#### Deploy na Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

#### Deploy Manual

1. Faça commit das alterações:
```bash
git add .
git commit -m "Adiciona integração WhatsApp com Gemini AI"
git push origin main
```

2. A Vercel fará o deploy automaticamente se estiver conectada ao repositório

### 4. Configurar no Sistema

1. Acesse: `https://seu-dominio.vercel.app/admin/SEU_USUARIO`
2. Faça login
3. Clique em "Atendimento WhatsApp" no menu lateral
4. Configure conforme a documentação em `WHATSAPP_INTEGRATION.md`

## 🧪 Testar Localmente

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Executar em Desenvolvimento

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - APIs (Vercel Dev)
vercel dev
```

### 3. Testar o Webhook

Use ferramentas como Postman ou curl:

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook/A \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quero 1 pizza grande de calabresa",
    "from": "5564999999999",
    "messageType": "text"
  }'
```

## 📋 Checklist de Instalação

- [ ] Dependências instaladas (`npm install`)
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Deploy realizado na Vercel
- [ ] Chave da API do Gemini obtida
- [ ] Configuração salva no painel administrativo
- [ ] Serviço de WhatsApp configurado (Evolution API/Twilio)
- [ ] Webhook testado e funcionando
- [ ] Atendimento ativado no sistema
- [ ] Teste real com mensagem do WhatsApp

## 🔍 Verificar Instalação

### 1. Verificar se as APIs estão funcionando

```bash
# Testar API de configuração
curl https://seu-dominio.vercel.app/api/config/SEU_USUARIO

# Testar webhook (deve retornar erro de configuração se não configurado)
curl -X POST https://seu-dominio.vercel.app/api/whatsapp/webhook/SEU_USUARIO \
  -H "Content-Type: application/json" \
  -d '{"message": "teste", "from": "123", "messageType": "text"}'
```

### 2. Verificar no Painel Administrativo

1. Acesse a página "Atendimento WhatsApp"
2. Verifique se a interface carrega corretamente
3. Preencha os campos e salve
4. Clique em "Testar Configuração"

## 🐛 Problemas Comuns

### Erro: "Module not found: @google/generative-ai"

**Solução**: Execute `npm install` novamente

### Erro: "Firebase Admin not initialized"

**Solução**: Configure as variáveis de ambiente do Firebase

### Erro: "API route not found"

**Solução**: Verifique se o arquivo `vercel.json` está correto e faça redeploy

### Erro: "CORS error"

**Solução**: Verifique os headers no `vercel.json`

## 📚 Documentação Adicional

- [Documentação Completa da Integração](./WHATSAPP_INTEGRATION.md)
- [Google Gemini AI](https://ai.google.dev/)
- [Evolution API](https://evolution-api.com/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

## 🎉 Pronto!

Após seguir todos os passos, sua integração WhatsApp com Gemini AI estará funcionando!

Os clientes poderão enviar pedidos via WhatsApp e o sistema criará automaticamente no painel administrativo.

---

**Desenvolvido para JataíFood** 🍕
