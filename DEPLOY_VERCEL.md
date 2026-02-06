# 🚀 Guia Completo de Deploy na Vercel

## ✅ O Problema Foi Resolvido

O erro que você estava enfrentando ocorria porque:

1. **Estrutura de pastas incorreta**: O projeto React estava dentro de `Jatai-sistem-food/Jatai-sistem-food/`, causando confusão no build
2. **Configuração do vercel.json**: Não especificava corretamente o diretório de saída
3. **Dependências faltantes**: O `@vercel/node` não estava nas devDependencies

## 🔧 O Que Foi Corrigido

### 1. Estrutura Reorganizada
```
jatai-system-fixed/          ← Agora tudo está na raiz
├── api/                     ← Funções serverless
│   ├── config/[username].ts
│   ├── orders/[username].ts
│   └── whatsapp/webhook.ts
├── src/                     ← Frontend React
├── dist/                    ← Build gerado
├── package.json             ← Atualizado com todas as dependências
├── vercel.json              ← Configuração correta
└── vite.config.ts
```

### 2. Package.json Atualizado
- Adicionado `firebase-admin` nas dependencies
- Adicionado `@vercel/node` nas devDependencies
- Nome do projeto atualizado para `jatai-system`

### 3. Vercel.json Otimizado
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [...],
  "headers": [...]
}
```

## 📋 Passo a Passo para Deploy

### Etapa 1: Preparar o Repositório Git

```bash
# 1. Entre na pasta do projeto corrigido
cd jatai-system-fixed

# 2. Inicialize o Git (se ainda não foi feito)
git init

# 3. Adicione todos os arquivos
git add .

# 4. Faça o commit
git commit -m "Estrutura corrigida para deploy na Vercel"

# 5. Crie um repositório no GitHub
# Acesse: https://github.com/new
# Nome sugerido: jatai-system

# 6. Adicione o repositório remoto (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/jatai-system.git

# 7. Faça o push
git branch -M main
git push -u origin main
```

### Etapa 2: Configurar na Vercel

#### 2.1. Criar Novo Projeto

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta
3. Clique em **"Add New Project"**
4. Selecione **"Import Git Repository"**
5. Escolha o repositório `jatai-system` que você acabou de criar

#### 2.2. Configurações do Projeto

Na tela de configuração, preencha:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (deixe em branco ou selecione raiz) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

#### 2.3. Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```
FIREBASE_DATABASE_URL=https://jataifood-default-rtdb.firebaseio.com
```

**IMPORTANTE**: Se você tiver credenciais do Firebase Admin SDK (arquivo JSON), adicione também:

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

#### 2.4. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (leva cerca de 2-3 minutos)
3. ✅ Pronto! Seu site estará no ar

### Etapa 3: Verificar o Deploy

Após o deploy bem-sucedido:

1. **Frontend**: Acesse a URL fornecida pela Vercel (ex: `jatai-system.vercel.app`)
2. **APIs**: Teste os endpoints:
   - `https://jatai-system.vercel.app/api/config/seu-usuario`
   - `https://jatai-system.vercel.app/api/orders/seu-usuario`

## 🔍 Como Verificar se Está Funcionando

### Teste 1: Frontend
Abra a URL do projeto e verifique se a interface carrega corretamente.

### Teste 2: API de Configuração
```bash
curl https://SEU-PROJETO.vercel.app/api/config/teste
```

Deve retornar algo como:
```json
{
  "error": "Configuration not found"
}
```
(Isso é normal se não houver dados no Firebase para esse usuário)

### Teste 3: API de Pedidos
```bash
curl -X POST https://SEU-PROJETO.vercel.app/api/orders/teste \
  -H "Content-Type: application/json" \
  -d '{"trackingCode":"ABC123","customerName":"Teste"}'
```

## ⚠️ Importante: Servidor WhatsApp

O servidor Node.js com `whatsapp-web.js` (pasta `server/`) **NÃO PODE** rodar na Vercel porque:

- Funções serverless têm timeout de 10-60 segundos
- WhatsApp Web precisa de uma conexão persistente
- Puppeteer precisa de recursos que não estão disponíveis em serverless

### Solução: Hospedar Separadamente

Você precisa hospedar o servidor WhatsApp em uma das seguintes plataformas:

#### Opção 1: Railway (Recomendado)
1. Acesse [railway.app](https://railway.app)
2. Crie um novo projeto
3. Faça deploy da pasta `server/`
4. Configure as variáveis de ambiente

#### Opção 2: Render
1. Acesse [render.com](https://render.com)
2. Crie um novo Web Service
3. Conecte ao repositório
4. Configure o Root Directory como `server/`

#### Opção 3: Heroku
```bash
cd server/
heroku create jatai-whatsapp-server
git push heroku main
```

#### Opção 4: VPS Própria
- DigitalOcean
- Linode
- AWS EC2
- Google Cloud

## 🔐 Variáveis de Ambiente Necessárias

### Para a Vercel (Frontend + APIs)
```
FIREBASE_DATABASE_URL=https://jataifood-default-rtdb.firebaseio.com
```

### Para o Servidor WhatsApp (Railway/Render/etc)
```
FIREBASE_DATABASE_URL=https://jataifood-default-rtdb.firebaseio.com
GEMINI_API_KEY=sua-chave-gemini
PORT=3001
```

## 🆘 Solução de Problemas

### Erro: "Build failed"
**Causa**: Erro de TypeScript ou dependências faltantes

**Solução**:
```bash
# Teste localmente primeiro
npm install
npm run build

# Se funcionar localmente, o problema é na Vercel
# Verifique os logs de build na dashboard da Vercel
```

### Erro: "404 Not Found" nas APIs
**Causa**: Rewrites não configurados corretamente

**Solução**:
- Verifique se o `vercel.json` está na raiz do projeto
- Confirme que as rotas estão corretas

### Erro: "Firebase Admin not initialized"
**Causa**: Variáveis de ambiente não configuradas

**Solução**:
1. Vá em Settings → Environment Variables
2. Adicione `FIREBASE_DATABASE_URL`
3. Faça um novo deploy (Deployments → ... → Redeploy)

### Erro: "Module not found: @vercel/node"
**Causa**: Dependência não instalada

**Solução**:
```bash
npm install --save-dev @vercel/node
git add package.json package-lock.json
git commit -m "Add @vercel/node"
git push
```

## 📊 Estrutura Final no Ar

```
Frontend (Vercel)
├── https://jatai-system.vercel.app/
├── /api/config/:username
├── /api/orders/:username
└── /api/whatsapp/webhook

Backend WhatsApp (Railway/Render)
└── https://jatai-whatsapp.railway.app/
    ├── /qrcode
    ├── /status
    └── /webhook
```

## 🎯 Próximos Passos

1. ✅ Deploy do frontend e APIs na Vercel
2. ⬜ Deploy do servidor WhatsApp no Railway/Render
3. ⬜ Conectar o webhook do WhatsApp às APIs da Vercel
4. ⬜ Configurar domínio customizado (opcional)
5. ⬜ Configurar SSL (automático na Vercel)

## 📞 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)

---

**Dúvidas?** Consulte os logs de build na Vercel ou teste localmente com `npm run build`.
