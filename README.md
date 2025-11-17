# Jataí System - Sistema de Gestão de Pedidos

Sistema completo de gestão de pedidos com integração WhatsApp e Firebase.

## 📋 Estrutura do Projeto

```
jatai-system/
├── api/                    # Funções serverless da Vercel
│   ├── config/
│   │   └── [username].ts  # API de configuração
│   ├── orders/
│   │   └── [username].ts  # API de pedidos
│   └── whatsapp/
│       └── webhook.ts     # Webhook do WhatsApp
├── src/                   # Código fonte do frontend React
├── public/                # Arquivos públicos estáticos
├── dist/                  # Build de produção (gerado)
├── package.json           # Dependências do projeto
├── vercel.json           # Configuração da Vercel
├── vite.config.ts        # Configuração do Vite
└── tsconfig.json         # Configuração do TypeScript
```

## 🚀 Deploy na Vercel

### 1. Preparar o Repositório

```bash
# Inicializar git (se ainda não foi feito)
git init

# Adicionar todos os arquivos
git add .

# Fazer o commit inicial
git commit -m "Estrutura corrigida para deploy na Vercel"

# Adicionar repositório remoto (substitua pela sua URL)
git remote add origin https://github.com/seu-usuario/jatai-system.git

# Fazer push
git push -u origin main
```

### 2. Configurar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New Project"
3. Importe seu repositório do GitHub
4. **Configurações importantes:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (raiz do projeto)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 3. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente na Vercel:

```
FIREBASE_DATABASE_URL=https://jataifood-default-rtdb.firebaseio.com
```

Para adicionar variáveis de ambiente:
1. Vá em "Settings" do seu projeto na Vercel
2. Clique em "Environment Variables"
3. Adicione cada variável

### 4. Deploy

Após configurar tudo, clique em "Deploy". A Vercel irá:
- Instalar as dependências
- Compilar o TypeScript
- Fazer o build do frontend com Vite
- Configurar as funções serverless da pasta `/api`

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

## 📡 APIs Disponíveis

### GET /api/config/:username
Busca a configuração do WhatsApp para um usuário específico.

**Resposta:**
```json
{
  "phoneNumber": "+5511999999999",
  "isActive": true,
  "webhookUrl": "https://...",
  "hasGeminiKey": true
}
```

### POST /api/orders/:username
Cria um novo pedido para um usuário específico.

**Body:**
```json
{
  "trackingCode": "ABC123",
  "customerName": "João Silva",
  "items": [...],
  "total": 50.00
}
```

**Resposta:**
```json
{
  "success": true,
  "orderId": "xyz789",
  "trackingCode": "ABC123"
}
```

### POST /api/whatsapp/webhook
Webhook para receber mensagens do WhatsApp (a implementar).

## 🔐 Segurança

- As APIs usam Firebase Admin SDK para acesso seguro ao banco de dados
- Chaves de API não são expostas no frontend
- Headers de segurança configurados no `vercel.json`
- CORS configurado para permitir acesso controlado

## 📝 Notas Importantes

1. **Servidor WhatsApp Separado**: O servidor Node.js com `whatsapp-web.js` não pode rodar na Vercel (funções serverless têm timeout). Você precisa hospedá-lo separadamente em:
   - Railway
   - Render
   - Heroku
   - VPS própria

2. **Firebase Admin**: Certifique-se de que as credenciais do Firebase Admin estejam configuradas corretamente nas variáveis de ambiente.

3. **TypeScript**: Todas as APIs estão em TypeScript e são compiladas automaticamente durante o deploy.

## 🆘 Solução de Problemas

### Erro: "ENOENT: no such file or directory"
- Certifique-se de que o `vercel.json` está na raiz do projeto
- Verifique se o `outputDirectory` está configurado como `dist`

### Erro: "Module not found"
- Execute `npm install` para instalar todas as dependências
- Verifique se `firebase-admin` e `@vercel/node` estão no `package.json`

### Build falha
- Verifique os logs de build na Vercel
- Certifique-se de que não há erros de TypeScript
- Execute `npm run build` localmente para testar

## 📞 Suporte

Para mais informações sobre o projeto, consulte a documentação do Firebase e da Vercel.
