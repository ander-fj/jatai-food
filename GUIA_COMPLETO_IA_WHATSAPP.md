# 🤖 Sistema de Atendimento WhatsApp com IA Gemini

## 🎯 Como Funciona

**FLUXO AUTOMÁTICO:**
```
Cliente envia mensagem → IA Gemini responde automaticamente → Se necessário, transfere para humano
```

### 1️⃣ **IA Gemini Atende Primeiro**
- Cliente faz pergunta → **IA responde automaticamente**
- Cliente faz pedido → **IA extrai informações e processa**
- Respostas instantâneas 24/7

### 2️⃣ **Atendente Humano Assume Quando Necessário**
- Conversas complexas → **Botão "Assumir Atendimento"**
- Cliente solicita humano → **IA transfere automaticamente**
- Problemas específicos → **Atendente intervém**

## 🚀 Interface de Atendimento

### 📊 Filtros Inteligentes

Na parte superior da lista de conversas:

**🟢 Todas** → Mostra todas as conversas
**🔵 IA** → Apenas conversas sendo atendidas pela IA
**🟣 Humano** → Apenas conversas assumidas por atendente humano

### 💬 Indicadores Visuais

#### Na Lista de Conversas:
- **Badge Azul 🤖 "IA"** → IA Gemini está atendendo
- **Badge Roxo 👤 "Humano"** → Atendente humano assumiu

#### No Cabeçalho do Chat:
- **"Atendido por IA" (azul)** → IA respondendo
- **"Atendimento Humano" (roxo)** → Humano respondendo
- **Botão "Assumir Atendimento"** → Transfere para você

#### Nas Mensagens:
- **Mensagem AZUL** → Enviada pela IA Gemini
- **Mensagem VERDE** → Enviada por atendente humano
- **Mensagem BRANCA** → Cliente
- **Tag "Resposta automática"** → Acima de mensagens da IA

## 🎨 Cores do Sistema

| Cor | Significado | Onde Aparece |
|-----|-------------|--------------|
| 🔵 Azul | IA Gemini | Mensagens da IA, badges, filtro |
| 🟣 Roxo | Atendente Humano | Mensagens humanas, badges, filtro |
| 🟢 Verde | Todas conversas | Filtro padrão, interface geral |
| ⚪ Branco | Cliente | Mensagens do cliente |

## 🔄 Como Transferir para Humano

### Método 1: Manual (Atendente Decide)
1. Abra a conversa que está **"Atendido por IA"**
2. Clique em **"Assumir Atendimento"** (botão roxo no topo)
3. ✅ **Pronto!** Agora você responde e IA para de responder

### Método 2: Automático (Cliente Pede)
Cliente escreve algo como:
- "Quero falar com atendente"
- "Preciso de um humano"
- "Transferir para atendente"

→ **IA detecta e transfere automaticamente**

## 🤖 Configuração da IA Gemini

### Pré-requisitos
1. **API Key do Google Gemini**
   - Acesse: https://makersuite.google.com/app/apikey
   - Crie uma API Key
   - Copie a chave

2. **Salvar no Firebase**
```
tenants/{username}/whatsappConfig/
  ├── geminiApiKey: "sua_api_key_aqui"
  ├── restaurantName: "Nome do Restaurante"
  ├── hours: "Seg-Sex: 11h-23h"
  ├── address: "Rua X, 123"
  └── menuUrl: "https://cardapio.com"
```

### O que a IA Sabe
A IA Gemini tem acesso a:
- ✅ Nome do restaurante
- ✅ Horário de funcionamento
- ✅ Endereço
- ✅ Link do cardápio
- ✅ Histórico da conversa

### O que a IA Faz
1. **Responde perguntas gerais**
   - Horário de funcionamento
   - Endereço
   - Formas de pagamento
   - Cardápio

2. **Processa pedidos**
   - Extrai itens do pedido
   - Confirma endereço de entrega
   - Valida informações
   - Cria pedido no sistema

3. **Transfere quando necessário**
   - Cliente pede atendimento humano
   - Situação complexa
   - Reclamação
   - Cancelamento

## 📊 Monitoramento

### Estatísticas
- **Total de conversas**: Todas as badges
- **Atendidas por IA**: Filtro 🔵 IA
- **Atendidas por Humano**: Filtro 🟣 Humano

## 🎉 Pronto Para Usar!

Agora você tem um sistema completo com IA Gemini respondendo automaticamente e interface para o atendente assumir quando necessário!
