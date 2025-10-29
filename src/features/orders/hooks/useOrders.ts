import { useMemo } from 'react';
import { useState, useEffect } from 'react';
import { Order, NewOrder, DeliveryPerson } from '../types';
import { useMenu } from './useMenu';
import { getDatabase, ref, onValue, set, push, update, get } from "firebase/database";
import { getTenantRef, getCurrentTenantId, initializeTenant } from '../../../config/firebase'; // Import getCurrentTenantId from config/firebase
import { storage } from '../../../config/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useGoogleMapsGeocoding } from '../../../hooks/useGoogleMaps';

export const useOrders = () => {
  const { pizzaFlavors, beverages } = useMenu();
  const { geocodeAddress } = useGoogleMapsGeocoding();

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<DeliveryPerson[]>([]);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryStaffOrderCount, setDeliveryStaffOrderCount] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const handleFeesUpdate = () => {
      const cachedFees = localStorage.getItem('app-fees');
      if (cachedFees) {
        const { serviceFee, deliveryFee } = JSON.parse(cachedFees);
        setServiceFee(serviceFee);
        setDeliveryFee(deliveryFee);
        console.log('💰 Fees updated from localStorage event');
      }
    };

    window.addEventListener('fees-updated', handleFeesUpdate);

    try {
      // Try to load fees from localStorage first
      const cachedFees = localStorage.getItem('app-fees');
      if (cachedFees) {
        const { serviceFee, deliveryFee } = JSON.parse(cachedFees);
        setServiceFee(serviceFee);
        setDeliveryFee(deliveryFee);
        console.log('💰 Loaded fees from localStorage');
      }

      const currentTenantId = getCurrentTenantId();
      if (!currentTenantId) {
        console.error("Tenant ID is not available.");
        return;
      }

      console.log(`🏢 useOrders: Loading data for tenant: ${currentTenantId}`);

      const ordersRef = getTenantRef('orders');
      const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const ordersArray = Object.entries(data).map(([id, order]: [string, any]) => ({
            ...order,
            id
          }));
          setOrders(ordersArray);
        } else {
          setOrders([]);
        }
      }, (error) => {
        console.error(`🔥 Firebase error loading orders for tenant ${currentTenantId}:`, error);
      });

      const equipeRef = getTenantRef('equipe');
      const unsubscribeEquipe = onValue(equipeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const staffArray = Object.entries(data).map(([id, staff]: [string, any]) => ({
            ...staff,
            id
          }));
          setDeliveryStaff(staffArray);
        } else {
          setDeliveryStaff([]);
        }
      }, (error) => {
        console.error(`🔥 Firebase error loading equipe for tenant ${currentTenantId}:`, error);
      });

      return () => {
        unsubscribeOrders();
        unsubscribeEquipe();
        window.removeEventListener('fees-updated', handleFeesUpdate);
      };
    } catch (error) {
      console.error("An unexpected error occurred in useOrders useEffect:", error);
    }
  }, []);

  const updateDeliveryStaffOrderCount = (deliveryPerson: string | undefined, change: number) => {
    if (!deliveryPerson) return;
    setDeliveryStaffOrderCount(prev => ({
      ...prev,
      [deliveryPerson]: Math.max(0, (prev[deliveryPerson] || 0) + change)
    }));
  };

  const addDeliveryStaff = async (newStaff: Omit<DeliveryPerson, 'id' | 'orderCount'>, avatarFile?: File | null) => {
    const id = crypto.randomUUID();
    
    let avatarUrl = newStaff.avatar || '';
    
    // Upload avatar to Firebase Storage if a file is provided
    if (avatarFile) {
      try {
        const avatarRef = storageRef(storage, `avatars/${id}_${avatarFile.name}`);
        const snapshot = await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error('Error uploading avatar:', error);
        // Continue with empty avatar if upload fails
        avatarUrl = '';
      }
    }
    
    const staffData = {
      name: newStaff.name,
      phone: newStaff.phone || '',
      avatar: avatarUrl,
      orderCount: 0,
      lat: newStaff.lat,
      lng: newStaff.lng,
      status: newStaff.status
    };
    
    const equipeRef = getTenantRef(`equipe/${id}`);
    await set(equipeRef, staffData);
  };

  const editDeliveryStaff = async (id: string, updatedStaff: Omit<DeliveryPerson, 'id' | 'orderCount'>, avatarFile?: File | null) => {
    
    let avatarUrl = '';
    
    // If no new avatar file is provided, fetch the current avatar URL from Firebase
    if (!avatarFile) {
      try {
        const currentStaffRef = getTenantRef(`equipe/${id}`);
        const currentStaffSnapshot = await get(currentStaffRef);
        const currentStaffData = currentStaffSnapshot.val();
        const existingAvatar = currentStaffData?.avatar || '';
        
        // Check if the existing avatar is a base64 string (starts with 'data:')
        // If so, ignore it to prevent Firebase size limit errors
        if (existingAvatar.startsWith('data:')) {
          console.warn('Existing avatar is a base64 string, ignoring to prevent size limit error');
          avatarUrl = '';
        } else {
          avatarUrl = existingAvatar;
        }
      } catch (error) {
        console.error('Error fetching current avatar:', error);
        avatarUrl = '';
      }
    }
    
    // Upload new avatar to Firebase Storage if a file is provided
    if (avatarFile) {
      try {
        const avatarRef = storageRef(storage, `avatars/${id}_${avatarFile.name}`);
        const snapshot = await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error('Error uploading avatar:', error);
        // Keep existing avatar if upload fails
      }
    }
    
    const staffData = {
      name: updatedStaff.name,
      phone: updatedStaff.phone || '',
      avatar: avatarUrl,
      orderCount: 0,
      lat: updatedStaff.lat,
      lng: updatedStaff.lng,
      status: updatedStaff.status
    };
    
    const equipeRef = getTenantRef(`equipe/${id}`);
    await update(equipeRef, staffData);
  };

  const deleteDeliveryStaff = (id: string) => {
    const equipeRef = getTenantRef(`equipe/${id}`);
    set(equipeRef, null);
  };

  const addOrder = async (newOrderData: NewOrder) => {
    console.log('🔄 Iniciando criação de pedido:', newOrderData);
    if (!newOrderData || !newOrderData.pizzas || !newOrderData.beverages) {
      const errorMsg = '❌ Dados do pedido inválidos. Faltando `pizzas` ou `beverages`.';
      console.error(errorMsg, newOrderData);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Obter tenant ID dinâmico baseado no usuário logado
    const tenantId = getCurrentTenantId();
    
    console.log(`📍 Salvando pedido para tenant: ${tenantId}`);
    
    const items = [
      ...newOrderData.pizzas.map(pizza => {
        if (!pizza.firstHalf) return null; // Ignorar pizzas incompletas
        const firstFlavor = pizzaFlavors.find(f => f.id === pizza.firstHalf);
        const secondFlavor = pizza.secondHalf ? pizzaFlavors.find(f => f.id === pizza.secondHalf) : null;
        const sizeName = { 'p': 'Pequena', 'm': 'Média', 'g': 'Grande', 'gg': 'Família' }[pizza.size];
        
        let name = '';
        if (pizza.isHalfPizza && secondFlavor) {
          name = `Meia Pizza ${firstFlavor?.name} / ${secondFlavor.name}`;
        } else if (pizza.isHalfPizza && !secondFlavor) {
          name = `Meia Pizza ${firstFlavor?.name}`;
        } else {
          name = `Pizza Inteira ${firstFlavor?.name}`;
        }
        
        const price = secondFlavor
          ? ((firstFlavor?.price || 0) + (secondFlavor.price || 0)) / 2
          : (firstFlavor?.price || 0);
        
        // Se for meia pizza, cobrar metade do preço
        const finalPrice = pizza.isHalfPizza ? price * 0.5 : price;
        
        return {
          name,
          quantity: pizza.quantity,
          size: sizeName || pizza.size || '',
          isHalfPizza: pizza.isHalfPizza, // Ensure this is passed
          price: finalPrice * pizza.quantity
        };
      }),
      ...newOrderData.beverages.map(beverage => {
        if (!beverage.id) return null; // Ignorar bebidas incompletas
        const beverageItem = beverages.find(b => b.id === beverage.id);
        const beverageSize = beverageItem?.sizes.find(s => s.size === beverage.size || s.size === 'Único');
        return {
          name: beverageItem?.name || '',
          quantity: beverage.quantity,
          size: beverage.size || 'Único',
          price: (beverageSize?.price || 0) * beverage.quantity,
          image: beverageItem?.image || '', // Adicionar imagem da bebida
          type: 'beverage'
        };
      })
    ].filter(Boolean); // Remover itens nulos (incompletos)

    let total = items.reduce((sum, item) => sum + item.price, 0);
    let serviceFeeApplied = 0;
    let deliveryFeeApplied = 0;

    // Garante que pedidos de mesa sejam identificados como "Consumo no local"
    if (newOrderData.tableNumber) {
      console.log('📦 Pedido de mesa detectado, definindo endereço para "Consumo no local".');
      newOrderData.address = 'Consumo no local';
    }

    // Aplicar taxas com os valores do estado (que vêm do Firebase/localStorage)
    if (newOrderData.tableNumber) {
      // Pedido de salão: aplicar taxa de serviço
      serviceFeeApplied = total * (serviceFee / 100); // Usar a taxa de serviço do estado
      total += serviceFeeApplied;
    } else {
      // Outros pedidos (delivery/retirada): aplicar taxa de entrega
      deliveryFeeApplied = total * (deliveryFee / 100); // Usar a taxa de entrega do estado
      total += deliveryFeeApplied;
    }

    console.log(`Tentando geocodificar endereço: ${newOrderData.address}`);
    const geo = await geocodeAddress(newOrderData.address);
    console.log('📍 Coordenadas obtidas:', geo);
    
    const trackingCode = generateTrackingCode();
    console.log('🏷️ Código de rastreamento gerado:', trackingCode);
    
    const order: Order = {
      id: '',
      customerName: newOrderData.customerName,
      phone: newOrderData.phone,
      address: newOrderData.address,
      items,
      status: 'Novo',
      orderTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timeElapsed: 'Agora',
      total, // Total com taxas aplicadas
      serviceFeeApplied,
      deliveryFeeApplied,
      trackingCode,
      currentPosition: geo || { lat: -23.5505, lng: -46.6333 }, // fallback para São Paulo se a geocodificação falhar
      createdAt: new Date().toISOString() // Data e hora atual no formato ISO
    };

    console.log('💾 Salvando pedido no Firebase:', order);
    
    // Salvar APENAS em tenants/{tenantId}/orders - NUNCA em customer-orders
    // Assuming initializeTenant is handled elsewhere or not strictly necessary here for basic order saving
    
    // Salvar EXCLUSIVAMENTE em tenants/{tenantId}/orders
    const ordersRef = getTenantRef('orders');
    const newRef = push(ordersRef);
    
    const orderWithId = { ...order, id: newRef.key };
    await set(newRef, orderWithId);
    
    console.log(`✅ Pedido salvo EXCLUSIVAMENTE em tenants/${tenantId}/orders/${newRef.key} - NUNCA em customer-orders`);
    
    const finalOrder = { ...order, id: newRef.key! };
    
    console.log('🎉 Pedido criado com sucesso:', finalOrder);
    return finalOrder;
  };

  // Função para gerar código de rastreamento único
  const generateTrackingCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Verificar se o código já existe
    const existingCodes = orders.map(o => o.trackingCode);
    if (existingCodes.includes(result)) {
      return generateTrackingCode(); // Gerar novamente se já existir
    }
    
    return result;
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    // Atualizar APENAS em tenants/{tenantId}/orders - NUNCA em customer-orders
    const tenantId = getCurrentTenantId();
    
    const existingOrder = orders.find(o => o.id === orderId);
    const updatedOrder = { ...existingOrder, ...updates };
    const orderRef = getTenantRef(`orders/${orderId}`);
    set(orderRef, updatedOrder);
    console.log(`✅ Pedido atualizado em tenants/${tenantId}/orders/${orderId}`);
    setOrders(prev => prev.map(order => order.id === orderId ? updatedOrder : order));
  };

  const deleteOrder = (orderId: string) => {
    // Deletar APENAS de tenants/{tenantId}/orders - NUNCA de customer-orders
    const tenantId = getCurrentTenantId();
    
    const orderRef = getTenantRef(`orders/${orderId}`);
    set(orderRef, null);
    console.log(`✅ Pedido deletado de tenants/${tenantId}/orders/${orderId}`);
    setOrders(prev => prev.filter(order => order.id !== orderId));
  };

  // Função para criar rota automaticamente
  const createRouteForOrder = async (orderId: string, deliveryPersonId: string) => {
    try {
      console.log(`🗺️ Criando rota automática para pedido ${orderId} com entregador ${deliveryPersonId}`);
      
      // Encontrar o pedido
      const order = allOrders.find(o => o.id === orderId);
      if (!order) {
        console.error('❌ Pedido não encontrado');
        return;
      }

      // Encontrar o entregador
      const deliveryPerson = deliveryStaff.find(d => d.id === deliveryPersonId);
      if (!deliveryPerson) {
        console.error('❌ Entregador não encontrado');
        return;
      }

      // Usar o endereço do pedido como destino
      const enderecoDestino = order.address;

      // Salvar informações da rota no Firebase
      const routeData = {
        orderId,
        deliveryPersonId,
        deliveryPersonFirebaseId: deliveryPerson.id,
        orderAddress: order.address,
        orderCoordinates: order.currentPosition || { lat: -23.5505, lng: -46.6333 },
        createdAt: Date.now(),
        status: 'active'
      };

      // Salvar rota no Firebase
      const routesRef = getTenantRef(`routes/${orderId}`);
      await set(routesRef, routeData);

      // Atualizar status do pedido (verificar se é customer ou admin order)
      // Todos os pedidos ficam na pasta orders do tenant
      const orderRef = getTenantRef(`orders/${orderId}`);
      await update(orderRef, {
        status: 'A caminho',
        assignedTo: deliveryPerson.id,
        firebaseId: deliveryPerson.id,
        assignedAt: Date.now(),
        routeCreated: true
      });

      // Disparar evento customizado para notificar o mapa
      const routeCreatedEvent = new CustomEvent('routeCreated', {
        detail: {
          orderId,
          deliveryPersonId: deliveryPerson.id,
          routeData
        }
      });
      window.dispatchEvent(routeCreatedEvent);

      console.log(`✅ Rota criada automaticamente para pedido ${orderId}`);
      
    } catch (error) {
      console.error('❌ Erro ao criar rota automática:', error);
    }
  };

  const assignDeliveryPerson = async (orderId: string, deliveryPersonId: string) => {
    console.log(`🔄 Atribuindo entregador ${deliveryPersonId} ao pedido ${orderId}`);
    
    // Atribuir APENAS em tenants/{tenantId}/orders - NUNCA em customer-orders
    const tenantId = getCurrentTenantId();
    
    // Encontrar o entregador na equipe para pegar o Firebase ID
    const entregador = deliveryStaff.find(e => e.id === deliveryPersonId);
    if (!entregador) {
      console.error('❌ Entregador não encontrado na equipe');
      return;
    }

    const firebaseId = entregador.id; // O ID já é o Firebase ID
    console.log(`🔑 Firebase ID do entregador: ${firebaseId}`);
    
    try {
      // Salvar na estrutura correta do tenant
      const orderRef = getTenantRef(`orders/${orderId}`);
      await update(orderRef, {
        deliveryPerson: entregador.name,
        assignedTo: firebaseId,
        firebaseId: firebaseId,
        status: 'A caminho',
        assignedAt: Date.now()
      });

      console.log(`✅ Entregador atribuído em tenants/${tenantId}/orders/${orderId}`);
      
      // Criar rota automaticamente
      await createRouteForOrder(orderId, firebaseId);
      
    } catch (error) {
      console.error('❌ Erro ao atribuir entregador:', error);
    }
  };

  const confirmarEntregador = async (pedidoId: string, entregadorId: string) => {
    console.log(`🔄 Confirmando entregador ${entregadorId} para pedido ${pedidoId}`);
    
    // Confirmar APENAS em tenants/{tenantId}/orders - NUNCA em customer-orders
    const tenantId = getCurrentTenantId();
    
    // Encontrar o entregador para pegar o Firebase ID
    const entregador = deliveryStaff.find(e => e.id === entregadorId);
    if (!entregador) {
      console.error('❌ Entregador não encontrado');
      return;
    }

    const firebaseId = entregador.id; // O ID já é o Firebase ID
    console.log(`🔑 Firebase ID do entregador: ${firebaseId}`);
    
    try {
      // Atualizar no Firebase com Firebase ID
      const orderRef = getTenantRef(`orders/${pedidoId}`);
      await update(orderRef, {
        assignedTo: entregadorId,
        firebaseId: firebaseId, // Adicionar Firebase ID ao pedido
        status: 'Em Entrega',
        assignedAt: Date.now()
      });

      console.log(`✅ Entregador confirmado em tenants/${tenantId}/orders/${pedidoId}`);

    } catch (error) {
      console.error('❌ Erro ao confirmar entregador:', error);
    }
  };

  const updateOrderStatus = (orderId: string, status: string, paymentMethod?: PaymentMethod) => {
    const updates: Partial<Order> = { status };
    if (status === 'Pago' && paymentMethod) {
      updates.paidAt = new Date().toISOString();
      updates.paymentMethod = paymentMethod;
    }
    updateOrder(orderId, updates);
  };

  // Memoized combined orders list
  const allOrders = useMemo(() => orders, [orders]);

  const getOrdersByStatus = () => {
    return {
      novos: allOrders.filter(order => order.status === 'Novo'),
      proximos: allOrders.filter(order => {
        const status = order.status;
        const isProximos = status === 'Próximos' || 
                          status === 'proximos' || 
                          status === 'PROXIMOS' ||
                          status === 'Proximos';
        return isProximos;
      }),
      preparando: allOrders.filter(order => order.status === 'Preparando'),
      pronto: allOrders.filter(order => order.status === 'Pronto para Entrega'),
      'em-entrega': allOrders.filter(order => order.status === 'A caminho'),
      entregues: allOrders.filter(order => order.status === 'Entregue'),
      cancelados: allOrders.filter(order => order.status === 'Cancelado'),
      pagos: allOrders.filter(order => order.status === 'Pago')
    };
  };

  return {
    orders: orders, // APENAS pedidos de tenants/Beneditta Pizza/orders
    addOrder,
    updateOrder,
    deleteOrder,
    assignDeliveryPerson,
    updateOrderStatus,
    getOrdersByStatus,
    deliveryStaff,
    addDeliveryStaff,
    editDeliveryStaff,
    deleteDeliveryStaff,
    deliveryStaffOrderCount,
    createRouteForOrder,
    confirmarEntregador,
    serviceFee,
    deliveryFee,
  };
};