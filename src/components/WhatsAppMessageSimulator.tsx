import React, { useEffect, useState } from 'react';
import { ref, set } from 'firebase/database';
import { database } from '../config/firebase';

const WhatsAppMessageSimulator: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const checkAndSimulate = async () => {
      if (isSimulating) return;

      const whatsappStatus = ref(database, `tenants/${username}/whatsapp/status`);

      const simulateNewMessages = () => {
        const messages = [
          'Olá, gostaria de fazer um pedido de pizza grande',
          'Quanto tempo demora a entrega?',
          'Vocês aceitam cartão?',
          'Tem promoção hoje?',
          'Qual o telefone para contato?',
          'Gostaria de saber o cardápio completo',
          'Fazem entrega no bairro Centro?',
          'Estou esperando meu pedido há 30 minutos',
          'A pizza chegou fria, o que fazer?',
          'Muito obrigado, foi ótimo!'
        ];

        const names = [
          'Carlos Mendes',
          'Ana Paula',
          'Roberto Lima',
          'Juliana Costa',
          'Fernando Souza',
          'Patrícia Alves',
          'Marcos Oliveira',
          'Beatriz Santos',
          'Ricardo Pereira',
          'Camila Rodrigues'
        ];

        const randomInterval = Math.random() * 30000 + 20000;

        setTimeout(async () => {
          const randomPhone = `55649${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          const randomName = names[Math.floor(Math.random() * names.length)];

          const msgId = `msg_${Date.now()}`;
          const messageRef = ref(database, `whatsapp_messages/${username}/${randomPhone}/${msgId}`);

          await set(messageRef, {
            id: msgId,
            from: randomPhone,
            to: username,
            body: randomMessage,
            timestamp: Date.now(),
            isFromCustomer: true,
            status: 'delivered',
            customerName: randomName
          });

          const customerNameRef = ref(database, `whatsapp_messages/${username}/${randomPhone}/customerName`);
          await set(customerNameRef, randomName);

          if (Math.random() > 0.5) {
            simulateNewMessages();
          }
        }, randomInterval);
      };

      simulateNewMessages();
      setIsSimulating(true);
    };

    const timer = setTimeout(checkAndSimulate, 5000);
    return () => clearTimeout(timer);
  }, [username, isSimulating]);

  return null;
};

export default WhatsAppMessageSimulator;
