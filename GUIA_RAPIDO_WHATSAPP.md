# 🚀 Guia Rápido - WhatsApp Business API

## ✅ Sistema 100% Automatizado (Sem Servidor Local!)

### 📝 Passo a Passo (3 minutos)

#### 1️⃣ Acesse a Página Admin
- Faça login no sistema
- Clique na aba **"Atendimento WhatsApp"**

#### 2️⃣ Configure com 1 Clique
- Clique no botão verde **"Setup Rápido"** no canto superior direito
- ✅ Seu token já será preenchido automaticamente!

#### 3️⃣ Adicione o Phone Number ID
1. Acesse: https://developers.facebook.com/
2. Vá na sua aplicação WhatsApp Business
3. Clique em **WhatsApp** → **API Setup**
4. Copie o **"Phone number ID"** (são 15 dígitos)
5. Cole no campo **"Phone Number ID"**

#### 4️⃣ Teste a Conexão
- Clique em **"Testar Conexão"**
- Aguarde a confirmação ✅

#### 5️⃣ Salve
- Clique em **"Salvar Configurações"**
- ✅ Sistema ativo!

#### 6️⃣ Configure o Webhook (Última etapa)
Após salvar, você verá uma caixa azul com:
- **Webhook URL** - Copie clicando no botão "Copiar"
- **Verify Token** - Copie clicando no botão "Copiar"

Agora configure no Meta:
1. Acesse https://developers.facebook.com/
2. Vá em **WhatsApp** → **Configuration**
3. Clique em **"Edit"** na seção Webhook
4. Cole a **Webhook URL**
5. Cole o **Verify Token**
6. Clique em **"Verify and Save"**
7. Marque o checkbox **"messages"**
8. Clique em **"Save"**

---

## 🎉 Pronto! Seu WhatsApp Está Ativo!

### O que acontece agora?

✅ **Mensagens recebidas** → Sistema responde automaticamente
✅ **Histórico salvo** → Todas conversas no Supabase
✅ **Sem servidor local** → Tudo na nuvem
✅ **Multi-tenant** → Cada restaurante tem sua config

---

## 📊 Dados Configurados

**Seu Token:**
```
EAATJ10ButJwBP4QZAwUo8DtOKLHG77pTM1OgtIEqqpS9EbpdC1q12vM0QvbYKZCqWaRMxOA6IlQvjWJgquU1QNTCRJgdiUSJOF2o5LmugyAoiXJa5xCJKpj4nfNYD0xr0zqzAA1ysScJCoSQjSgNLY9VrGK6QkzlYsmYrtnazfVyG7H6m68YEtHCkbbzt8
```

**Expira em:** ~60 dias (você pode gerar um token permanente depois)

---

## 🔧 Solução de Problemas

### Erro: "Token Inválido"
- Verifique se copiou o token completo
- Tokens temporários expiram, gere um novo

### Erro: "Phone Number ID Inválido"
- Certifique-se de copiar o ID correto (15 dígitos)
- Verifique se o número está ativo no Meta

### Webhook não Verifica
- Confira se copiou a URL e Token corretamente
- Aguarde alguns segundos e tente novamente
- Verifique se salvou as configurações antes

---

## 💡 Dicas

✅ **Token Permanente:** No Meta for Developers, gere um token que não expire
✅ **Teste Primeiro:** Use o botão "Testar Conexão" antes de salvar
✅ **Personalize:** Edite a mensagem de boas-vindas no formulário
✅ **Multi-Restaurante:** Cada usuário pode ter sua própria configuração

---

## 📱 Testando

1. Envie uma mensagem para seu número WhatsApp Business
2. O sistema responderá automaticamente com a mensagem de boas-vindas
3. Verifique o histórico no banco Supabase

---

## 🎯 Arquitetura

```
Cliente envia mensagem
    ↓
WhatsApp Business API
    ↓
Webhook (Supabase Edge Function)
    ↓
Salva no Banco de Dados
    ↓
Envia Resposta Automática
```

**Zero configuração de servidor!** 🚀

---

## 📞 Próximos Passos

- [ ] Adicionar IA para respostas inteligentes
- [ ] Integrar com sistema de pedidos
- [ ] Dashboard de métricas
- [ ] Respostas automáticas personalizadas por horário
- [ ] Templates de mensagens

---

**Tudo funcionando 100% na nuvem! ☁️**
