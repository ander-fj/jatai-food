import { getDatabase, ref, set } from 'firebase/database';
import { getTenantRef } from '../config/firebase';

// Função para criar pedido de teste
export const createTestOrder = async () => {
  try {
    // Usar tenant dinâmico ou fallback para "Beneditta Pizza"
    const tenantId = getCurrentTenantId();
    
    console.log(`🔄 Criando pedidos de teste para tenant: ${tenantId}`);
    
    // Criar múltiplos pedidos de teste
    const testOrders = [
      {
        id: 'SYQVFNVX',
        trackingCode: 'SYQVFNVX',
        customerName: 'Vanessa',
        phone: '11999364247',
        address: 'Rua Visconde de Tamandaré, 450 - Centro, São Vicente - SP, 11310-440',
        status: 'Novo',
        orderTime: '10:09',
        createdAt: new Date().toISOString(),
        items: [
          {
            name: 'Pizza Margherita',
            quantity: 1,
            size: 'Média',
            price: 45.90
          },
          {
            name: 'Coca-Cola',
            quantity: 1,
            size: '2L',
            price: 12.90
          }
        ],
        total: 132.70,
        currentPosition: {
          lat: -23.9618,
          lng: -46.3952
        },
        assignedTo: 'anderson_jatai_123',
        firebaseId: 'anderson_jatai_123',
        deliveryPerson: 'Anderson'
      },
      {
        id: 'MURU7C75',
        trackingCode: 'MURU7C75',
        customerName: 'Carlos Silva',
        phone: '11987654321',
        address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
        status: 'A caminho',
        orderTime: '14:30',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
        items: [
          {
            name: 'Pizza Pepperoni',
            quantity: 1,
            size: 'Grande',
            price: 52.90
          },
          {
            name: 'Pizza 4 Queijos',
            quantity: 1,
            size: 'Média',
            price: 49.90
          },
          {
            name: 'Guaraná',
            quantity: 2,
            size: '2L',
            price: 23.80
          }
        ],
        total: 126.60,
        currentPosition: {
          lat: -23.5505,
          lng: -46.6333
        },
        assignedTo: 'carlos_entregador_456',
        firebaseId: 'carlos_entregador_456',
        deliveryPerson: 'Carlos'
      }
    ];

    // Criar entregadores para os pedidos
    const entregadores = [
      {
        id: 'anderson_jatai_123',
        name: 'Anderson Jatai',
        status: 'delivering',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150',
        lat: -23.9618,
        lng: -46.3952,
        current: {
          latitude: -23.9618,
          longitude: -46.3952,
          status: 'delivering',
          name: 'Anderson Jatai',
          timestamp: new Date().toISOString()
        },
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'carlos_entregador_456',
        name: 'Carlos Entregador',
        status: 'delivering',
        avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
        lat: -23.5505,
        lng: -46.6333,
        current: {
          latitude: -23.5505,
          longitude: -46.6333,
          status: 'delivering',
          name: 'Carlos Entregador',
          timestamp: new Date().toISOString()
        },
        lastUpdate: new Date().toISOString()
      }
    ];

    // Salvar pedidos no tenant admin
    for (const orderData of testOrders) {
      const orderRef = getTenantRef(`orders/${orderData.trackingCode}`, tenantId);
      await set(orderRef, orderData);
      console.log(`✅ Pedido de teste ${orderData.trackingCode} criado para tenant ${tenantId}`);
    }

    // Salvar entregadores na equipe do tenant e nas locations globais
    for (const entregadorData of entregadores) {
      // Salvar na equipe do tenant
      const equipeRef = getTenantRef(`equipe/${entregadorData.id}`, tenantId);
      await set(equipeRef, entregadorData);
      
      // Salvar nas locations globais para rastreamento
      const db = getDatabase();
      const locationRef = ref(db, `locations/${entregadorData.id}`);
      await set(locationRef, entregadorData);
      
      console.log(`✅ Entregador ${entregadorData.name} criado para tenant ${tenantId}`);
    }
    
    console.log(`✅ Todos os pedidos de teste criados com sucesso para tenant ${tenantId}`);
    return testOrders;
  } catch (error) {
    console.error('❌ Erro ao criar pedido de teste:', error);
    throw error;
  }
};