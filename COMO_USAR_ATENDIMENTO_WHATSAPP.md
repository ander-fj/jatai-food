# 📱 Como Usar o Atendimento WhatsApp

## 🎯 O Que É Esta Página?

Esta é a **interface de atendimento ao cliente via WhatsApp**. Quando clientes enviam mensagens para o número WhatsApp Business do seu restaurante, as conversas aparecem aqui para você responder.

## ✨ Funcionalidades

### 1️⃣ Lista de Conversas (Esquerda)
- **Ver todas conversas ativas** com clientes
- **Contador de mensagens não lidas** (badge verde)
- **Buscar conversas** por nome ou telefone
- **Ordenação automática** pela mensagem mais recente

### 2️⃣ Área de Chat (Centro)
- **Ver todo histórico** de mensagens com o cliente
- **Status de entrega**:
  - ✓ Enviado
  - ✓✓ Entregue
  - ✓✓ (azul) Lido
- **Horário de cada mensagem**
- **Interface tipo WhatsApp** (verde para suas mensagens, branco para cliente)

### 3️⃣ Enviar Mensagens (Rodapé)
- **Digite e envie** respostas ao cliente
- **Enter para enviar** (Shift+Enter para quebra de linha)
- **Feedback visual** ao enviar

## 🚀 Como Funciona o Fluxo

```
Cliente envia WhatsApp → Aparece na lista → Você responde → Cliente recebe
```

### Exemplo Prático:

1. **Cliente envia**: "Quero pedir uma pizza"
2. **Aparece na lista** com badge "1" (não lida)
3. **Você clica** na conversa
4. **Você responde**: "Ótimo! Qual sabor você prefere?"
5. **Cliente recebe** sua mensagem no WhatsApp dele

## 📋 Pré-requisitos

Antes de usar, você precisa configurar o WhatsApp Business API:

### 1️⃣ Configure no Meta for Developers

Acesse: https://developers.facebook.com/apps/

**Crie uma aplicação WhatsApp Business:**
- Entre na sua aplicação
- Vá em **WhatsApp** → **API Setup**
- Copie:
  - **Access Token** (token de acesso)
  - **Phone Number ID** (ID do número)

### 2️⃣ Salve no Firebase

As configurações são salvas em:
```
whatsapp_config/{username}/
  ├── accessToken
  ├── phoneNumberId
  ├── isActive
  └── ...
```

### 3️⃣ Configure o Webhook

Para receber mensagens, configure:

**URL do Webhook:**
```
https://seu-projeto.supabase.co/functions/v1/whatsapp-webhook
```

**Verify Token:**
```
seu_token_seguro_123
```

No Meta:
1. Vá em **WhatsApp** → **Configuration**
2. Clique em **Edit** na seção Webhook
3. Cole a URL e Token
4. Marque **"messages"**
5. Salve

## 💡 Funcionalidades Automáticas

### ✅ Mensagens Salvas Automaticamente
Todas as conversas são salvas em:
```
whatsapp_messages/{username}/{telefone}/
  ├── {messageId}
  │   ├── from
  │   ├── to
  │   ├── body
  │   ├── timestamp
  │   ├── isFromCustomer
  │   └── status
```

### ✅ Atualização em Tempo Real
- Firebase Realtime Database sincroniza automaticamente
- Novas mensagens aparecem instantaneamente
- Status de leitura atualiza automaticamente

### ✅ Contador de Não Lidas
- Badge verde mostra quantas mensagens não foram lidas
- Marca como lida automaticamente ao abrir conversa

## 🎨 Interface

### Cores e Visual
- **Verde**: Suas mensagens (como no WhatsApp)
- **Branco**: Mensagens do cliente
- **Badge Verde**: Contador de não lidas
- **Avatar**: Primeira letra do nome

### Responsivo
- Funciona em desktop e tablet
- Layout adaptativo

## 🔧 Estrutura de Dados

### Mensagem no Firebase
```json
{
  "id": "msg_123",
  "from": "5511999999999",
  "to": "5511888888888",
  "body": "Quero pedir uma pizza",
  "timestamp": 1699999999999,
  "isFromCustomer": true,
  "status": "read"
}
```

### Chat Processado
```typescript
{
  phoneNumber: "5511999999999",
  customerName: "Cliente",
  lastMessage: "Quero pedir uma pizza",
  lastMessageTime: 1699999999999,
  unreadCount: 1,
  messages: [...]
}
```

## 🚨 Solução de Problemas

### Mensagens não aparecem?
1. Verifique se o webhook está configurado
2. Confirme que o token está correto
3. Veja logs no Supabase Edge Functions

### Não consegue enviar?
1. Verifique se o accessToken está válido
2. Confirme o phoneNumberId
3. Veja se a Edge Function `whatsapp-send` está deployed

### Cliente não recebe?
1. Verifique se o número está correto (formato internacional)
2. Confirme que o número está registrado no WhatsApp
3. Veja logs da API do WhatsApp

## 📊 Monitoramento

### Ver Logs
Acesse Supabase Dashboard:
- **Edge Functions** → **whatsapp-webhook** → Logs
- **Edge Functions** → **whatsapp-send** → Logs

### Testar Webhook
```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5511999999999",
            "text": {"body": "teste"}
          }]
        }
      }]
    }]
  }'
```

## 🎯 Próximos Passos

- [ ] Adicionar respostas rápidas (templates)
- [ ] Integração com sistema de pedidos
- [ ] IA para sugestões de resposta
- [ ] Métricas de atendimento
- [ ] Transferência entre atendentes
- [ ] Anexar imagens/arquivos
- [ ] Áudios de voz

## 📞 Dicas de Uso

### Boas Práticas:
✅ Responda rápido (clientes esperam isso no WhatsApp)
✅ Seja cordial e use emojis 😊
✅ Confirme entendimento antes de finalizar
✅ Use a busca para encontrar conversas antigas

### Evite:
❌ Deixar mensagens sem resposta
❌ Respostas genéricas demais
❌ Não confirmar detalhes importantes

---

## 🎉 Pronto Para Usar!

1. **Configure** o WhatsApp Business API
2. **Salve** as credenciais no Firebase
3. **Configure** o webhook
4. **Aguarde** mensagens dos clientes
5. **Responda** pela interface

**Tudo sincronizado em tempo real!** ⚡
