import React, { useState } from 'react';
import { MessageCircle, Send, Zap, Users } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { database } from '../config/firebase';
import { toast } from 'sonner';

const WhatsAppTestMessages: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [isCreating, setIsCreating] = useState(false);

  const createTestMessages = async () => {
    setIsCreating(true);
    toast.info('Criando mensagens de teste...');

    try {
      const testChats = [
        {
          phoneNumber: '5511999887766',
          customerName: 'João Silva',
          messages: [
            { body: 'Olá! Gostaria de fazer um pedido', isFromCustomer: true },
            { body: 'Olá João! Claro, temos pizzas deliciosas! Qual sabor você gostaria?', isFromCustomer: false, isFromAI: true },
            { body: 'Quais sabores vocês tem?', isFromCustomer: true },
            { body: 'Temos: Margherita (R$45,90), Pepperoni (R$47,90), Portuguesa (R$47,90), 4 Queijos (R$49,90), Calabresa (R$46,90), Frango Catupiry (R$47,90)', isFromCustomer: false, isFromAI: true },
            { body: 'Quero uma pizza de Calabresa e uma Coca-Cola 2L', isFromCustomer: true },
          ]
        },
        {
          phoneNumber: '5511988776655',
          customerName: 'Maria Santos',
          messages: [
            { body: 'Boa tarde! Vocês estão abertos?', isFromCustomer: true },
            { body: 'Boa tarde Maria! Sim, estamos abertos! Em que posso ajudar?', isFromCustomer: false, isFromAI: true },
            { body: 'Quanto tempo demora a entrega?', isFromCustomer: true },
            { body: 'O tempo de entrega é de aproximadamente 40-50 minutos. Qual é o seu endereço?', isFromCustomer: false, isFromAI: true },
          ]
        },
        {
          phoneNumber: '5511977665544',
          customerName: 'Pedro Costa',
          messages: [
            { body: 'Olá, vocês fazem entrega?', isFromCustomer: true },
            { body: 'Olá Pedro! Sim, fazemos entregas! Para qual bairro?', isFromCustomer: false, isFromAI: true },
            { body: 'Vila Mariana', isFromCustomer: true },
            { body: 'Sim, entregamos em Vila Mariana! O que você gostaria de pedir?', isFromCustomer: false, isFromAI: true },
            { body: 'Uma pizza de 4 queijos grande', isFromCustomer: true },
          ]
        }
      ];

      for (const chat of testChats) {
        const messagesRef = ref(database, `tenants/${username}/whatsapp/conversations/${chat.phoneNumber}`);

        await set(messagesRef, {
          customerName: chat.customerName,
          phoneNumber: chat.phoneNumber,
          isAIHandling: true,
          transferredToHuman: false,
          createdAt: Date.now(),
        });

        for (let i = 0; i < chat.messages.length; i++) {
          const msg = chat.messages[i];
          const msgRef = push(ref(database, `tenants/${username}/whatsapp/conversations/${chat.phoneNumber}/messages`));

          await set(msgRef, {
            from: msg.isFromCustomer ? chat.phoneNumber : username,
            to: msg.isFromCustomer ? username : chat.phoneNumber,
            body: msg.body,
            timestamp: Date.now() - (chat.messages.length - i) * 60000,
            isFromCustomer: msg.isFromCustomer,
            isFromAI: msg.isFromAI || false,
            status: msg.isFromCustomer ? 'delivered' : 'sent',
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      toast.success(`${testChats.length} conversas de teste criadas! 🎉`);
      console.log('✅ Mensagens de teste criadas com sucesso!');

    } catch (error: any) {
      console.error('❌ Erro ao criar mensagens:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const createSingleTestMessage = async () => {
    setIsCreating(true);
    toast.info('Criando mensagem única...');

    try {
      const phoneNumber = '5511939364247';
      const customerName = 'Cliente Teste';

      const conversationRef = ref(database, `tenants/${username}/whatsapp/conversations/${phoneNumber}`);

      await set(conversationRef, {
        customerName,
        phoneNumber,
        isAIHandling: true,
        transferredToHuman: false,
        createdAt: Date.now(),
      });

      const msgRef = push(ref(database, `tenants/${username}/whatsapp/conversations/${phoneNumber}/messages`));

      await set(msgRef, {
        from: phoneNumber,
        to: username,
        body: 'Olá! Esta é uma mensagem de teste do WhatsApp!',
        timestamp: Date.now(),
        isFromCustomer: true,
        isFromAI: false,
        status: 'delivered',
      });

      toast.success('Mensagem de teste criada! 🎉');
      console.log('✅ Mensagem única criada com sucesso!');

    } catch (error: any) {
      console.error('❌ Erro ao criar mensagem:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Mensagens de Teste WhatsApp
          </h2>
          <p className="text-gray-600">
            Crie conversas de teste para testar o sistema de atendimento
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Criar Conversas Completas
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Cria 3 conversas com histórico de mensagens entre cliente e IA:
            </p>
            <ul className="text-sm text-gray-600 mb-4 space-y-1">
              <li>• João Silva - Pedindo pizza e refrigerante</li>
              <li>• Maria Santos - Perguntando sobre tempo de entrega</li>
              <li>• Pedro Costa - Perguntando sobre delivery</li>
            </ul>
            <button
              onClick={createTestMessages}
              disabled={isCreating}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-semibold shadow-lg"
            >
              {isCreating ? (
                <>
                  <Zap className="h-5 w-5 animate-spin" />
                  Criando conversas...
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Criar 3 Conversas Completas
                </>
              )}
            </button>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Criar Mensagem Única
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Cria uma única mensagem de teste simples
            </p>
            <button
              onClick={createSingleTestMessage}
              disabled={isCreating}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-semibold shadow-lg"
            >
              {isCreating ? (
                <>
                  <Zap className="h-5 w-5 animate-spin" />
                  Criando mensagem...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Criar 1 Mensagem Simples
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
            Estrutura no Firebase:
          </h4>
          <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-x-auto">
{`tenants/${username}/whatsapp/conversations/
  └── 5511999887766/
      ├── customerName: "João Silva"
      ├── phoneNumber: "5511999887766"
      ├── isAIHandling: true
      └── messages/
          ├── -NfG7kX2abc/
          │   ├── from: "5511999887766"
          │   ├── body: "Olá! Gostaria..."
          │   ├── timestamp: 1736813456789
          │   └── isFromCustomer: true
          └── ...`}
          </pre>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          Depois de criar, vá para <strong>"Atendimento WhatsApp"</strong> para ver as mensagens!
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTestMessages;
