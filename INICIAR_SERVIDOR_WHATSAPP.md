# 🚀 COMO INICIAR O SERVIDOR WHATSAPP

## ⚡ PASSO A PASSO (2 minutos)

### 1️⃣ Abra um novo terminal

- **Windows:** `Windows + R` → digite `cmd` → Enter
- **Mac/Linux:** Abra o Terminal

### 2️⃣ Navegue até a pasta do servidor

```bash
cd server
```

### 3️⃣ Instale as dependências (só na primeira vez)

```bash
npm install
```

Aguarde terminar (pode demorar 1-2 minutos na primeira vez).

### 4️⃣ Inicie o servidor

```bash
node whatsapp-server.js
```

### ✅ PRONTO!

Você verá algo assim:

```
🚀 Servidor iniciado na porta 3001
✅ Firebase inicializado
✅ CORS configurado
📡 Aguardando conexões...
```

**IMPORTANTE:** 
- ⚠️ **NÃO FECHE ESTE TERMINAL!** O servidor precisa ficar rodando.
- ✅ Deixe rodando em background
- ✅ Agora volte para o navegador e conecte o WhatsApp

---

## 🌐 CONECTAR NO NAVEGADOR

1. Abra seu sistema: `http://localhost:5173`
2. Faça login como **Admin**
3. Clique em **"Conectar WhatsApp"**
4. Na página que abrir:
   - Clique em **"⚙️ Configurar URL do Servidor"**
   - Confirme que está: `http://localhost:3001`
   - Clique **"Salvar"**
5. Clique em **"Conectar WhatsApp"**
6. Escaneie o QR Code

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### Erro: "Servidor não está rodando"

**Causa:** O servidor não foi iniciado.

**Solução:**
```bash
cd server
node whatsapp-server.js
```

### Erro: "EADDRINUSE" ou "Porta 3001 já está em uso"

**Causa:** Já existe outro servidor rodando.

**Solução 1 - Fechar o servidor anterior:**
- Windows: `Ctrl + C` no terminal
- Mac/Linux: `Ctrl + C` no terminal

**Solução 2 - Mudar a porta:**
1. Abra `server/whatsapp-server.js`
2. Linha ~400: Mude `3001` para `3002`
3. Salve e reinicie

### Erro: "Failed to fetch"

**Causa:** URL do servidor está errada.

**Solução:**
1. Na interface, clique **"⚙️ Configurar URL do Servidor"**
2. Digite: `http://localhost:3001`
3. Clique **"Salvar"**

### Erro: "Cannot find module"

**Causa:** Dependências não instaladas.

**Solução:**
```bash
cd server
npm install
node whatsapp-server.js
```

---

## 📝 COMANDOS ÚTEIS

### Parar o servidor
```bash
Ctrl + C
```

### Reiniciar o servidor
```bash
Ctrl + C
node whatsapp-server.js
```

### Ver logs em tempo real
Os logs aparecem automaticamente no terminal onde o servidor está rodando.

### Limpar sessão do WhatsApp
```bash
cd server
rm -rf .wwebjs_auth
node whatsapp-server.js
```

---

## ✅ CHECKLIST

Antes de conectar o WhatsApp, confirme:

- [ ] Terminal aberto
- [ ] Comando `cd server` executado
- [ ] Comando `npm install` executado (primeira vez)
- [ ] Comando `node whatsapp-server.js` rodando
- [ ] Vê mensagem "🚀 Servidor iniciado na porta 3001"
- [ ] URL configurada: `http://localhost:3001`
- [ ] Agora pode conectar o WhatsApp!

---

## 🎯 RESUMO RÁPIDO

```bash
# 1. Abra terminal
cd server

# 2. Instale (primeira vez)
npm install

# 3. Inicie servidor
node whatsapp-server.js

# 4. Deixe rodando e volte ao navegador!
```

**PRONTO! Agora pode conectar o WhatsApp via QR Code!** 🎉
