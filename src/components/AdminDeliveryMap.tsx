import { useEffect, useRef, useState, useCallback } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useGoogleMapsGeocoding } from '../hooks/useGoogleMaps';
import { Loader, AlertCircle, MapPin, Navigation, Route as RouteIcon } from 'lucide-react';

interface AdminOrdersMapProps {
  selectedOrderId?: string | null;
  isTrackingPage?: boolean;
  tenantId?: string;
}

// Mensagens divertidas para o entregador
const DELIVERY_MESSAGES = {
  'Novo': [
    "📋 {customerName}, seu pedido foi confirmado! Já estou me preparando! 🎯",
    "🍕 {customerName}, seu pedido está na nossa lista! Preparando tudo! 📝",
    "⏰ {customerName}, pedido confirmado! Aguarde que logo estarei indo! 🚀"
  ],
  'Preparando': [
    "👨‍🍳 {customerName}, sua pizza está sendo preparada com carinho! 🍕",
    "🔥 {customerName}, forno ligado! Sua pizza está assando! ⏰",
    "😋 {customerName}, preparando sua delícia! Logo estará pronta! 🎉",
    "🍅 {customerName}, ingredientes frescos sendo usados agora! 🧀"
  ],
  'Pronto para Entrega': [
    "📦 {customerName}, sua pizza está pronta! Já estou pegando ela! 🏃‍♂️",
    "✅ {customerName}, pedido finalizado! Saindo para entrega agora! 🚚",
    "🔥 {customerName}, pizza quentinha embalada! A caminho! 🛵",
    "🎯 {customerName}, tudo pronto! Partindo para sua casa! 📍"
  ],
  'A caminho': [
    "🚚 {customerName}, estou chegando! Segura aí! 😄",
    "🍕 {customerName}, pizza quentinha a caminho! 🔥",
    "🏃‍♂️ {customerName}, correndo para te atender! 💨",
    "📍 {customerName}, já estou na sua região! 🎯",
    "⏰ {customerName}, alguns minutinhos e chego aí! ⌛",
    "🛵 {customerName}, acelerando para você! 🚀",
    "🎉 {customerName}, quase lá! Prepare o apetite! 🍽️",
    "🗺️ {customerName}, seguindo o GPS direto para você! 📱",
    "💪 {customerName}, entregador motivado a caminho! ⚡",
    "🌟 {customerName}, sua pizza especial está chegando! ✨",
    "🚦 {customerName}, passando pelos semáforos... quase lá! 🟢",
    "📦 {customerName}, carga preciosa sendo transportada! 💎",
    "🎵 {customerName}, cantando no trânsito... chegando! 🎶",
    "☀️ {customerName}, que dia lindo para uma entrega! 🌈"
  ],
  'Entregue': [
    "✅ {customerName}, pedido entregue com sucesso! Obrigado! 🎉",
    "🍕 {customerName}, pizza entregue quentinha! Bom apetite! 😋",
    "📦 {customerName}, missão cumprida! Aproveite sua refeição! 🌟",
    "🎯 {customerName}, entrega realizada! Até a próxima! 👋"
  ]
};

// Piadas divertidas para o entregador
const DELIVERY_JOKES = {
  'Novo': [
    "😄 {customerName}, por que a pizza foi ao médico? Porque estava com muita massa! 🍕",
    "🤣 {customerName}, qual é o prato favorito do Batman? Bat-ata frita! Mas hoje é pizza! 🦇",
    "😂 {customerName}, por que o tomate não consegue dormir? Porque a alface está sempre fazendo salada! 🍅",
    "😄 {customerName}, o que a pizza falou para o refrigerante? 'Você é meu par perfeito!' 🥤"
  ],
  'Preparando': [
    "😄 {customerName}, por que a pizza nunca fica triste? Porque sempre tem cobertura! 🍕",
    "🤣 {customerName}, qual é a música favorita da pizza? 'Mamma mia!' 🎵",
    "😂 {customerName}, por que o queijo foi à escola? Para ficar mais culto! 🧀",
    "😄 {customerName}, o que o forno falou para a pizza? 'Você está esquentando meu coração!' 🔥"
  ],
  'Pronto para Entrega': [
    "😄 {customerName}, o que a pizza falou para o entregador? 'Me leva que eu sou redonda!' 📦",
    "🤣 {customerName}, por que a caixa de pizza é quadrada se a pizza é redonda? Mistérios da vida! 📦",
    "😂 {customerName}, qual é o super-poder da pizza? Fazer todo mundo feliz! 🦸‍♂️",
    "😄 {customerName}, por que a pizza é como um abraço? Porque aquece o coração! 🤗"
  ],
  'A caminho': [
    "😄 {customerName}, por que o entregador é como um super-herói? Porque salva a fome! 🦸‍♂️",
    "🤣 {customerName}, qual é o GPS favorito da pizza? O que sempre diz 'vire à direita na próxima fatia'! 🗺️",
    "😂 {customerName}, por que a pizza nunca se perde? Porque sempre tem endereço na caixa! 📍",
    "😄 {customerName}, qual é o combustível do entregador? Café e boa vontade! ☕",
    "🤣 {customerName}, por que o trânsito não para o entregador? Porque a fome é mais forte! 🚦",
    "😂 {customerName}, o que o entregador e o Flash têm em comum? Ambos são rápidos quando a fome aperta! ⚡",
    "😄 {customerName}, por que a pizza viaja de moto? Porque de avião ela esfria! 🛵",
    "🤣 {customerName}, qual é a diferença entre o entregador e um mágico? O mágico faz sumir, o entregador faz aparecer! 🎩",
    "😂 {customerName}, por que o entregador canta no trânsito? Para a pizza não ficar com saudade! 🎵",
    "😄 {customerName}, o que a rua falou para o entregador? 'Passa por aqui sempre!' 🛣️"
  ],
  'Entregue': [
    "😄 {customerName}, qual é a melhor parte da pizza? Todas! Bom apetite! 🍕",
    "🤣 {customerName}, por que a pizza entregue é como um final feliz? Porque todo mundo fica satisfeito! 😊",
    "😂 {customerName}, o que o estômago falou quando a pizza chegou? 'Finalmente minha alma gêmea!' 🤤",
    "😄 {customerName}, missão cumprida! Agora é só aproveitar e ser feliz! 🎉"
  ]
};

// Mensagens específicas baseadas na posição na fila
const QUEUE_MESSAGES = {
  next: [
    "🎯 {customerName}, seu pedido é o próximo! Já estou finalizando aqui! 🚀",
    "⭐ {customerName}, você é o próximo da lista! Preparando para ir aí! 🏃‍♂️",
    "🔥 {customerName}, próxima parada: sua casa! Quase terminando aqui! 📍",
    "🎉 {customerName}, seu pedido é o próximo! Já estou me organizando! ⏰",
    "🚚 {customerName}, próximo destino: você! Finalizando esta entrega! 💨"
  ],
  few: [
    "📋 {customerName}, só mais {count} entregas e chego aí! Organizando a rota! 🗺️",
    "⏳ {customerName}, faltam apenas {count} pedidos para o seu! Acelerando! 🚀",
    "🎯 {customerName}, você está em {position}º lugar! Logo, logo chego! 💪",
    "📦 {customerName}, mais {count} entregas e é sua vez! Otimizando o caminho! 🛣️",
    "🔄 {customerName}, {count} pedidos na frente, mas já estou na sua região! 📍"
  ],
  many: [
    "📋 {customerName}, tenho {count} entregas antes da sua, mas estou acelerando! 🏃‍♂️",
    "⏰ {customerName}, você está em {position}º lugar, mas não se preocupe! Estou organizando a melhor rota! 🗺️",
    "🚚 {customerName}, {count} pedidos na fila, mas sua pizza está quentinha aqui! 🔥",
    "💪 {customerName}, mesmo com {count} entregas pela frente, não vou te deixar esperando muito! ⚡",
    "🎯 {customerName}, posição {position} na lista! Estou fazendo o possível para acelerar! 🚀"
  ]
};

// Função para obter mensagem aleatória
const getRandomMessage = (status: string, customerName?: string) => {
  const statusMessages = DELIVERY_MESSAGES[status as keyof typeof DELIVERY_MESSAGES];
  if (!statusMessages || statusMessages.length === 0) {
    // Fallback para status "A caminho" se não encontrar mensagens para o status
    const fallbackMessages = DELIVERY_MESSAGES['A caminho'];
    const message = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    return customerName ? message.replace('{customerName}', customerName) : message.replace('{customerName}, ', '');
  }
  const message = statusMessages[Math.floor(Math.random() * statusMessages.length)];
  return customerName ? message.replace('{customerName}', customerName) : message.replace('{customerName}, ', '');
};

// Função para obter mensagem baseada na posição na fila
const getQueueMessage = (position: number, totalPending: number, customerName?: string) => {
  let messageArray;
  let message;
  
  if (position === 1) {
    messageArray = QUEUE_MESSAGES.next;
    message = messageArray[Math.floor(Math.random() * messageArray.length)];
  } else if (position <= 3) {
    messageArray = QUEUE_MESSAGES.few;
    message = messageArray[Math.floor(Math.random() * messageArray.length)];
    message = message.replace('{count}', (position - 1).toString()).replace('{position}', position.toString());
  } else {
    messageArray = QUEUE_MESSAGES.many;
    message = messageArray[Math.floor(Math.random() * messageArray.length)];
    message = message.replace('{count}', (position - 1).toString()).replace('{position}', position.toString());
  }
  
  // Substituir o nome do cliente
  message = customerName ? message.replace('{customerName}', customerName) : message.replace('{customerName}, ', '');
  
  return message;
};

export default function AdminOrdersMap({ selectedOrderId, isTrackingPage = false, tenantId }: AdminOrdersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { isLoaded, isLoading, error } = useGoogleMaps();
  const { geocodeAddress } = useGoogleMapsGeocoding();
  
  // Estados do mapa
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Estados de dados
  const [realtimeOrders, setRealtimeOrders] = useState<any>({});
  const [realtimeEquipe, setRealtimeEquipe] = useState<any>({});
  const [realtimeLocations, setRealtimeLocations] = useState<any>({});
  
  // Estados de rastreamento
  const [routeInfo, setRouteInfo] = useState<{distance: string, duration: string} | null>(null);
  const [deliveryPersonLocation, setDeliveryPersonLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isCentered, setIsCentered] = useState(false);
  const [routeCreated, setRouteCreated] = useState(false);

  // Estados para fila de entregas
  const [queueInfo, setQueueInfo] = useState<{
    position: number;
    totalPending: number;
    isNext: boolean;
    pendingOrders: any[];
  } | null>(null);

  // Estados para animação do entregador
  const [deliveryMarker, setDeliveryMarker] = useState<google.maps.Marker | null>(null);
  const [messageInfoWindow, setMessageInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isNextMessageJoke, setIsNextMessageJoke] = useState(false);

  // Função para obter tenant ID
  const getCurrentTenantId = useCallback(() => {
    if (tenantId) return tenantId;
    const loggedInUser = localStorage.getItem('username');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    return (loggedInUser && isLoggedIn) ? loggedInUser : null;
  }, [tenantId]);

  // Função para criar referência do Firebase
  const createFirebaseRef = useCallback((path: string) => {
    const db = getDatabase();
    const effectiveTenantId = getCurrentTenantId();
    
    if (effectiveTenantId) {
      console.log(`🔗 AdminOrdersMap: Usando tenant ${effectiveTenantId} para path: ${path}`);
      return ref(db, `tenants/${effectiveTenantId}/${path}`);
    } else {
      console.log(`🔗 AdminOrdersMap: Usando path global: ${path}`);
      return ref(db, path);
    }
  }, [getCurrentTenantId]);

  // Inicializar mapa
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    try {
      console.log('🗺️ AdminOrdersMap: Inicializando Google Maps...');
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: -23.5505, lng: -46.6333 },
        zoom: 13,
        minZoom: 3,
        maxZoom: 22,
        mapTypeControl: true,
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      });

      setMap(mapInstance);
      console.log('✅ AdminOrdersMap: Google Maps inicializado');
    } catch (err) {
      console.error('❌ AdminOrdersMap: Erro ao inicializar mapa:', err);
      setMapError('Erro ao inicializar o mapa');
    }
  }, [isLoaded, map]);

  // Carregar dados em tempo real
  useEffect(() => {
    if (!map || !isLoaded) return;

    console.log('🔄 AdminOrdersMap: Configurando listeners em tempo real...');
    const unsubscribers: (() => void)[] = [];

    try {
      // Listener para pedidos
      const ordersRef = createFirebaseRef('orders');
      const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        setRealtimeOrders(data || {});
        console.log('📦 AdminOrdersMap: Pedidos atualizados:', Object.keys(data || {}).length);
        console.log('📦 AdminOrdersMap: Dados dos pedidos:', data);
      }, (error) => {
        console.error('❌ AdminOrdersMap: Erro ao carregar pedidos:', error);
      });
      unsubscribers.push(unsubscribeOrders);

      // Listener para equipe
      const equipeRef = createFirebaseRef('equipe');
      const unsubscribeEquipe = onValue(equipeRef, (snapshot) => {
        const data = snapshot.val();
        setRealtimeEquipe(data || {});
        console.log('👥 AdminOrdersMap: Equipe atualizada:', Object.keys(data || {}).length);
        console.log('👥 AdminOrdersMap: Dados da equipe:', data);
      }, (error) => {
        console.error('❌ AdminOrdersMap: Erro ao carregar equipe:', error);
      });
      unsubscribers.push(unsubscribeEquipe);

      // Listener para localizações globais
      const db = getDatabase();
      const locationsRef = ref(db, 'locations');
      const unsubscribeLocations = onValue(locationsRef, (snapshot) => {
        const data = snapshot.val();
        setRealtimeLocations(data || {});
        console.log('📍 AdminOrdersMap: Localizações atualizadas:', Object.keys(data || {}).length);
        console.log('📍 AdminOrdersMap: Dados das localizações:', data);
        setLoading(false);
      }, (error) => {
        console.error('❌ AdminOrdersMap: Erro ao carregar localizações:', error);
        setLoading(false);
      });
      unsubscribers.push(unsubscribeLocations);

    } catch (error) {
      console.error('❌ AdminOrdersMap: Erro ao configurar listeners:', error);
      setLoading(false);
    }

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [map, isLoaded, createFirebaseRef]);

  // Função para centralizar no entregador
  const centerOnDeliveryPerson = useCallback((coords: {lat: number, lng: number}) => {
    if (!map) return;
    
    console.log('🎯 AdminOrdersMap: Centralizando no entregador:', coords);
    
    // Centralizar com animação suave
    map.panTo(coords);
    
    // Ajustar zoom para uma visualização melhor do entregador
    const currentZoom = map.getZoom() || 13;
    if (currentZoom < 15) {
      map.setZoom(17);
    }
    
    // Garantir que o marcador esteja bem visível após um pequeno delay
    setTimeout(() => {
      map.panTo(coords);
    }, 500);
    
    setDeliveryPersonLocation(coords);
    setIsCentered(true);
  }, [map]);

  // Função para criar marcador animado do entregador
  const createAnimatedDeliveryMarker = useCallback((coords: {lat: number, lng: number}, entregadorData: any) => {
    if (!map || !window.google) return null;

    console.log('🎭 AdminOrdersMap: Criando marcador animado do entregador');

    // Criar ícone personalizado animado
    const deliveryIcon = {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
            <animate id="bounce" attributeName="transform" 
                     values="translate(30,30) scale(1); translate(30,28) scale(1.1); translate(30,30) scale(1)"
                     dur="2s" repeatCount="indefinite"/>
          </defs>
          
          <!-- Círculo de fundo -->
          <circle cx="30" cy="30" r="25" fill="#10B981" stroke="#059669" stroke-width="3" filter="url(#shadow)">
            <animateTransform attributeName="transform" type="scale" 
                              values="1;1.05;1" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Entregador (emoji style) -->
          <text x="30" y="38" text-anchor="middle" font-size="24" fill="white">🚚</text>
          
          <!-- Indicador de movimento -->
          <circle cx="45" cy="20" r="3" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite"/>
          </circle>
          <circle cx="50" cy="25" r="2" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="48" cy="15" r="2" fill="#FCD34D">
            <animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.6s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `),
      scaledSize: new google.maps.Size(60, 60),
      anchor: new google.maps.Point(30, 30)
    };

    // Criar marcador com animação
    const marker = new google.maps.Marker({
      position: coords,
      map: map,
      title: `${entregadorData?.name || 'Entregador'} - A caminho! 🚚`,
      icon: deliveryIcon,
      animation: google.maps.Animation.DROP,
      zIndex: 1000
    });

    // Criar InfoWindow para mensagens
    const infoWindow = new google.maps.InfoWindow({
      content: '',
      pixelOffset: new google.maps.Size(0, -10)
    });

    setDeliveryMarker(marker);
    setMessageInfoWindow(infoWindow);

    return marker;
  }, [map]);

  // Função para mostrar mensagem divertida
  const showDeliveryMessage = useCallback((isJoke: boolean) => {
    if (!deliveryMarker || !messageInfoWindow || !map || !selectedOrderId) return;

    console.log(`💬 Mostrando ${isJoke ? 'PIADA' : 'MENSAGEM'} às ${new Date().toLocaleTimeString()}`);

    // Obter status atual do pedido
    const currentOrder = realtimeOrders[selectedOrderId];
    if (!currentOrder) {
      console.log('❌ Pedido não encontrado para mostrar mensagem');
      return;
    }
    
    const orderStatus = currentOrder?.status || 'A caminho';
    const customerName = currentOrder?.customerName;

    let message;
    
    if (isJoke) {
      // Mostrar piada
      const jokes = DELIVERY_JOKES[orderStatus as keyof typeof DELIVERY_JOKES] || DELIVERY_JOKES['A caminho'];
      message = jokes[Math.floor(Math.random() * jokes.length)];
      message = customerName ? message.replace('{customerName}', customerName) : message.replace('{customerName}, ', '');
      console.log('🎭 Exibindo piada:', message);
    } else {
      // Mostrar mensagem normal
      if (queueInfo && orderStatus === 'A caminho' && Math.random() > 0.5) {
        message = getQueueMessage(queueInfo.position, queueInfo.totalPending, customerName);
      } else {
        message = getRandomMessage(orderStatus, customerName);
      }
      console.log('📱 Exibindo mensagem:', message);
    }
    
    setCurrentMessage(message);
    
    // Criar conteúdo da mensagem com estilo de balão de conversa
    const messageContent = `
      <div style="
        padding: 12px 16px;
        background: linear-gradient(135deg, ${isNextMessageJoke ? '#F59E0B, #D97706' : '#10B981, #059669'});
        color: white;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        position: relative;
        min-width: 200px;
        animation: messageSlide 0.3s ease-out;
      ">
        <div style="margin-bottom: 4px; font-size: 16px;">
          ${isJoke ? '😄 ' : '📱 '}
          ${message}
        </div>
        <div style="font-size: 11px; opacity: 0.9; font-weight: 400;">
          ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <style>
        @keyframes messageSlide {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;

    messageInfoWindow.setContent(messageContent);
    messageInfoWindow.open(map, deliveryMarker);
    
    // Remover o botão de fechar do InfoWindow completamente
    setTimeout(() => {
      const closeButtons = document.querySelectorAll('.gm-ui-hover-effect');
      closeButtons.forEach(button => {
        (button as HTMLElement).style.display = 'none';
      });
      
      // Também remover outros elementos de controle do InfoWindow
      const iwControls = document.querySelectorAll('.gm-style-iw-chr');
      iwControls.forEach(control => {
        (control as HTMLElement).style.display = 'none';
      });
      
      // Remover botão X especificamente
      const closeX = document.querySelectorAll('.gm-style-iw-tc');
      closeX.forEach(x => {
        (x as HTMLElement).style.display = 'none';
      });
    }, 50);
    
    // Verificação adicional após mais tempo
    setTimeout(() => {
      const allCloseElements = document.querySelectorAll('.gm-ui-hover-effect, .gm-style-iw-chr, .gm-style-iw-tc');
      allCloseElements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
      });
    }, 200);
    
    // Verificação final
    setTimeout(() => {
      const finalCloseElements = document.querySelectorAll('button[title="Close"]');
      finalCloseElements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
      });
    }, 500);

    // Fechar mensagem após 20 segundos
    setTimeout(() => {
      if (messageInfoWindow) {
        messageInfoWindow.close();
      }
    }, 20000); // 20 segundos

    console.log('💬 AdminOrdersMap: Mensagem exibida (20s duração):', message);
  }, [deliveryMarker, messageInfoWindow, map, queueInfo, realtimeOrders, selectedOrderId]);

  // Função para calcular posição na fila de entregas
  const calculateQueuePosition = useCallback((currentOrderId: string, deliveryPersonId: string) => {
    if (!realtimeOrders || !deliveryPersonId) return null;

    console.log('📊 Calculando posição na fila para pedido:', currentOrderId);
    
    // Buscar todos os pedidos do mesmo entregador
    const deliveryPersonOrders = Object.entries(realtimeOrders)
      .map(([id, order]: [string, any]) => ({ id, ...order }))
      .filter((order: any) => 
        order.assignedTo === deliveryPersonId || 
        order.firebaseId === deliveryPersonId ||
        (order.deliveryPerson && realtimeEquipe[deliveryPersonId]?.name?.split(' ')[0] === order.deliveryPerson)
      );

    console.log('📋 Pedidos do entregador:', deliveryPersonOrders.length);

    // Filtrar apenas pedidos pendentes (não entregues nem cancelados)
    const pendingOrders = deliveryPersonOrders.filter((order: any) => 
      order.status !== 'Entregue' && order.status !== 'Cancelado'
    );

    console.log('⏳ Pedidos pendentes:', pendingOrders.length);

    // Ordenar por prioridade de status e horário de criação
    const statusPriority = {
      'A caminho': 1,
      'Pronto para Entrega': 2,
      'Preparando': 3,
      'Novo': 4
    };

    pendingOrders.sort((a: any, b: any) => {
      const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 5;
      const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 5;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Se mesma prioridade, ordenar por horário de criação
      const timeA = new Date(a.createdAt || a.orderTime).getTime();
      const timeB = new Date(b.createdAt || b.orderTime).getTime();
      return timeA - timeB;
    });

    // Encontrar posição do pedido atual
    const position = pendingOrders.findIndex((order: any) => order.id === currentOrderId) + 1;
    
    if (position === 0) {
      console.log('❌ Pedido não encontrado na fila');
      return null;
    }

    const queueData = {
      position,
      totalPending: pendingOrders.length,
      isNext: position === 1,
      pendingOrders: pendingOrders.map((order: any) => ({
        id: order.id,
        customerName: order.customerName,
        status: order.status,
        createdAt: order.createdAt || order.orderTime
      }))
    };

    console.log('📊 Informações da fila:', queueData);
    return queueData;
  }, [realtimeOrders, realtimeEquipe]);

  // Iniciar animações e mensagens periódicas
  useEffect(() => {
    if (!isTrackingPage || !deliveryMarker || !map || !selectedOrderId) return;

    console.log('🎬 AdminOrdersMap: Iniciando animações do entregador');
    setIsAnimating(true);
    
    console.log('🎬 INICIANDO SISTEMA DE MENSAGENS SIMPLES às', new Date().toLocaleTimeString());
    
    let messageCount = 0;
    
    const scheduleNextMessage = () => {
      messageCount++;
      const isJoke = messageCount % 2 === 0; // Par = piada, ímpar = mensagem
      const delay = messageCount === 1 ? 3000 : 60000; // Primeira em 3s, depois 60s
      
      console.log(`⏰ Agendando mensagem ${messageCount} (${isJoke ? 'PIADA' : 'MENSAGEM'}) em ${delay/1000}s`);
      
      messageTimeoutRef.current = setTimeout(() => {
        console.log(`💬 Executando mensagem ${messageCount} (${isJoke ? 'PIADA' : 'MENSAGEM'}) às ${new Date().toLocaleTimeString()}`);
        if (deliveryMarker && map && selectedOrderId) {
          showDeliveryMessage(isJoke);
        }
        
        // Agendar próxima mensagem
        if (deliveryMarker && map && selectedOrderId) {
          scheduleNextMessage();
        }
      }, delay);
    };
    
    // Iniciar sequência
    scheduleNextMessage();

    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
        console.log('🛑 Sistema de mensagens parado');
      }
      setIsAnimating(false);
      console.log('🛑 Sistema de mensagens limpo às', new Date().toLocaleTimeString());
    };
  }, [deliveryMarker, map, isTrackingPage, selectedOrderId, showDeliveryMessage]);

  // Função para criar rota
  const createDeliveryRoute = useCallback(async (
    deliveryPersonCoords: {lat: number, lng: number},
    destinationAddress: string
  ) => {
    if (!map || !window.google || !window.google.maps) {
      console.log('❌ AdminOrdersMap: Google Maps não disponível para criar rota');
      return;
    }

    try {
      console.log('🗺️ AdminOrdersMap: Criando rota de entrega...');
      console.log('📍 Origem (entregador):', deliveryPersonCoords);
      console.log('📍 Destino:', destinationAddress);
      
      // Limpar rota anterior
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
      }

      // Geocodificar endereço de destino
      const destinationCoords = await geocodeAddress(destinationAddress);
      if (!destinationCoords) {
        console.error('❌ AdminOrdersMap: Não foi possível geocodificar:', destinationAddress);
        return;
      }

      console.log('📍 Coordenadas do destino:', destinationCoords);

      // Criar serviço de direções
      const directionsService = new google.maps.DirectionsService();
      const newDirectionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#FF4444',
          strokeWeight: 6,
          strokeOpacity: 0.9
        }
      });

      newDirectionsRenderer.setMap(map);
      setDirectionsRenderer(newDirectionsRenderer);

      // Calcular rota
      const request = {
        origin: deliveryPersonCoords,
        destination: destinationCoords,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          console.log('✅ AdminOrdersMap: Rota calculada com sucesso');
          newDirectionsRenderer.setDirections(result);
          
          const route = result.routes[0].legs[0];
          const routeData = {
            distance: route.distance?.text || 'N/A',
            duration: route.duration?.text || 'N/A'
          };
          
          setRouteInfo(routeData);
          setRouteCreated(true);

          console.log('📊 AdminOrdersMap: Informações da rota:', routeData);

          // Ajustar bounds para mostrar toda a rota
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(deliveryPersonCoords);
          bounds.extend(destinationCoords);
          
          // Aplicar bounds com padding
          setTimeout(() => {
            map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
          }, 500);

        } else {
          console.error('❌ AdminOrdersMap: Erro ao calcular rota:', status);
          setRouteInfo(null);
          setRouteCreated(false);
        }
      });

    } catch (error) {
      console.error('❌ AdminOrdersMap: Erro ao criar rota:', error);
      setRouteCreated(false);
    }
  }, [map, directionsRenderer, geocodeAddress]);

  // Processar dados e atualizar mapa
  useEffect(() => {
    if (!map || !isLoaded || loading) return;

    console.log('🔄 AdminOrdersMap: Processando dados para atualizar mapa...');
    console.log('📊 Estado atual:', {
      selectedOrderId,
      isTrackingPage,
      ordersCount: Object.keys(realtimeOrders).length,
      equipeCount: Object.keys(realtimeEquipe).length,
      locationsCount: Object.keys(realtimeLocations).length
    });

    // Limpar marcadores anteriores
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    if (isTrackingPage && selectedOrderId) {
      console.log('🎯 AdminOrdersMap: Modo rastreamento para pedido:', selectedOrderId);
      
      const order = realtimeOrders[selectedOrderId];
      if (!order) {
        console.log('❌ AdminOrdersMap: Pedido não encontrado:', selectedOrderId);
        console.log('📋 AdminOrdersMap: Pedidos disponíveis:', Object.keys(realtimeOrders));
        return;
      }

      console.log('📦 AdminOrdersMap: Pedido encontrado:', {
        id: selectedOrderId,
        customerName: order.customerName,
        address: order.address,
        assignedTo: order.assignedTo,
        firebaseId: order.firebaseId,
        deliveryPerson: order.deliveryPerson
      });

      // Estratégias para encontrar o entregador
      let entregadorId = null;
      let entregadorData = null;
      let searchStrategy = '';

      // 1. Tentar por assignedTo
      if (order.assignedTo && realtimeEquipe[order.assignedTo]) {
        entregadorId = order.assignedTo;
        entregadorData = realtimeEquipe[order.assignedTo];
        searchStrategy = 'assignedTo';
        console.log('✅ AdminOrdersMap: Entregador encontrado via assignedTo:', entregadorId);
      }
      // 2. Tentar por firebaseId
      else if (order.firebaseId && realtimeEquipe[order.firebaseId]) {
        entregadorId = order.firebaseId;
        entregadorData = realtimeEquipe[order.firebaseId];
        searchStrategy = 'firebaseId';
        console.log('✅ AdminOrdersMap: Entregador encontrado via firebaseId:', entregadorId);
      }
      // 3. Tentar por nome do deliveryPerson
      else if (order.deliveryPerson) {
        for (const [id, data] of Object.entries<any>(realtimeEquipe)) {
          const dataName = data.name || '';
          const orderDeliveryPerson = order.deliveryPerson || '';
          if (dataName.toLowerCase().includes(orderDeliveryPerson.toLowerCase()) ||
              orderDeliveryPerson.toLowerCase().includes(dataName.toLowerCase().split(' ')[0])) {
            entregadorId = id;
            entregadorData = data;
            searchStrategy = 'deliveryPerson';
            console.log('✅ AdminOrdersMap: Entregador encontrado via nome:', entregadorId, data.name);
            break;
          }
        }
      }
      // 4. Buscar diretamente nas locations se não encontrou na equipe
      if (!entregadorId) {
        console.log('🔍 AdminOrdersMap: Buscando diretamente nas locations...');
        for (const [id, locationData] of Object.entries<any>(realtimeLocations)) {
          if (locationData.name || locationData.current?.name) {
            // Verificar se o nome bate com algum campo do pedido
            const locationName = (locationData.name || locationData.current?.name || '').toLowerCase();
            const orderDeliveryPerson = order.deliveryPerson || '';
            const orderAssignedTo = order.assignedTo || '';
            const orderFirebaseId = order.firebaseId || '';
            
            if ((orderDeliveryPerson && locationName.includes(orderDeliveryPerson.toLowerCase())) ||
                (orderDeliveryPerson && orderDeliveryPerson.toLowerCase().includes(locationName.split(' ')[0])) ||
                (order.assignedTo && id === order.assignedTo) ||
                (order.firebaseId && id === order.firebaseId)) {
              entregadorId = id;
              entregadorData = { 
                name: locationData.name || locationData.current?.name || 'Entregador'
              };
              searchStrategy = 'locations';
              console.log('✅ AdminOrdersMap: Entregador encontrado nas locations:', entregadorId, entregadorData.name);
              break;
            }
          }
        }
      }

      if (entregadorId && (entregadorData || realtimeLocations[entregadorId])) {
        console.log('👤 AdminOrdersMap: Processando entregador:', {
          id: entregadorId,
          name: entregadorData?.name || realtimeLocations[entregadorId]?.name,
          strategy: searchStrategy
        });
        
        // Calcular posição na fila de entregas
        const queueData = calculateQueuePosition(selectedOrderId, entregadorId);
        setQueueInfo(queueData);
        
        // Buscar localização do entregador
        const locationData = realtimeLocations[entregadorId];
        console.log('📍 AdminOrdersMap: Dados de localização:', locationData);
        
        if (locationData) {
          let coords = null;

          // Priorizar dados de 'current'
          if (locationData.current && locationData.current.latitude && locationData.current.longitude) {
            coords = {
              lat: parseFloat(locationData.current.latitude),
              lng: parseFloat(locationData.current.longitude)
            };
            console.log('📍 AdminOrdersMap: Usando coordenadas current:', coords);
          } 
          // Tentar current.lat e current.lng
          else if (locationData.current && locationData.current.lat && locationData.current.lng) {
            coords = {
              lat: parseFloat(locationData.current.lat),
              lng: parseFloat(locationData.current.lng)
            };
            console.log('📍 AdminOrdersMap: Usando coordenadas current.lat/lng:', coords);
          }
          // Fallback para dados diretos
          else if (locationData.lat && locationData.lng) {
            coords = {
              lat: parseFloat(locationData.lat),
              lng: parseFloat(locationData.lng)
            };
            console.log('📍 AdminOrdersMap: Usando coordenadas diretas:', coords);
          }

          if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
            console.log('✅ AdminOrdersMap: Coordenadas válidas do entregador:', coords);
            
            // Centralizar no entregador (apenas uma vez)
            if (!isCentered) {
              centerOnDeliveryPerson(coords);
            }

            // Criar marcador animado do entregador
            const animatedMarker = createAnimatedDeliveryMarker(coords, entregadorData);
            if (animatedMarker) {
              newMarkers.push(animatedMarker);
            }

            // InfoWindow detalhada do entregador (clique no marcador)
            const detailedInfoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 15px; min-width: 280px;">
                  <h3 style="margin: 0 0 12px 0; color: #059669; font-size: 18px; font-weight: bold;">
                    🚚 ${entregadorData?.name || locationData.name}
                  </h3>
                  <div style="margin-bottom: 10px;">
                    <strong>Status:</strong> 
                    <span style="color: #059669; font-weight: bold;">Entregando</span>
                  </div>
                  <div style="margin-bottom: 10px; font-size: 13px; color: #666;">
                    <strong>Localização:</strong><br>
                    Lat: ${coords.lat.toFixed(6)}<br>
                    Lng: ${coords.lng.toFixed(6)}
                  </div>
                  <div style="margin-bottom: 10px; font-size: 13px; color: #666;">
                    <strong>Pedido:</strong> #${selectedOrderId}<br>
                    <strong>Cliente:</strong> ${order.customerName}
                  </div>
                  ${queueData ? `
                    <div style="margin-bottom: 10px; padding: 8px; background: ${queueData.isNext ? '#dcfce7' : '#fef3c7'}; border-radius: 6px; border-left: 4px solid ${queueData.isNext ? '#16a34a' : '#d97706'};">
                      <div style="font-size: 13px; color: ${queueData.isNext ? '#15803d' : '#92400e'}; font-weight: 600;">
                        ${queueData.isNext ? 
                          '🎯 <strong>Próximo pedido!</strong>' : 
                          `📋 <strong>Posição ${queueData.position} de ${queueData.totalPending}</strong>`
                        }
                      </div>
                      <div style="font-size: 12px; color: ${queueData.isNext ? '#15803d' : '#92400e'}; margin-top: 4px;">
                        ${queueData.isNext ? 
                          'Seu pedido será o próximo a ser entregue!' : 
                          `Faltam ${queueData.position - 1} entregas para a sua`
                        }
                      </div>
                    </div>
                  ` : ''}
                  <div style="margin-bottom: 10px; font-size: 12px; color: #888;">
                    <strong>Encontrado via:</strong> ${searchStrategy}
                  </div>
                  <div style="margin-bottom: 10px; padding: 8px; background: #f0f9ff; border-radius: 6px;">
                    <div style="font-size: 12px; color: #0369a1; font-weight: 500;">
                      🎭 <strong>Modo Divertido Ativo!</strong><br>
                      Mensagens automáticas a cada 60s (20s duração)
                    </div>
                  </div>
                  ${routeInfo ? `
                    <div style="margin-top: 12px; padding: 10px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #0369a1;">
                      <div style="font-size: 13px; color: #0369a1;">
                        <strong>📍 Distância:</strong> ${routeInfo.distance}<br>
                        <strong>⏱️ Tempo estimado:</strong> ${routeInfo.duration}
                      </div>
                    </div>
                  ` : ''}
                  ${locationData?.current?.timestamp ? `
                    <div style="font-size: 11px; color: #999; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                      Última atualização: ${new Date(locationData.current.timestamp).toLocaleString('pt-BR')}
                    </div>
                  ` : ''}
                </div>
              `
            });

            if (animatedMarker) {
              animatedMarker.addListener('click', () => {
                detailedInfoWindow.open(map, animatedMarker);
              });
            }

            // Criar rota automaticamente (apenas uma vez)
            if (order.address && !routeCreated && order.status === 'A caminho') {
              console.log('🗺️ AdminOrdersMap: Iniciando criação de rota para:', order.address);
              createDeliveryRoute(coords, order.address);
            } else {
              console.log(`🚫 AdminOrdersMap: Rota não criada - Status: ${order.status}, RouteCreated: ${routeCreated}, Address: ${!!order.address}`);
            }

          } else {
            console.log('❌ AdminOrdersMap: Coordenadas inválidas para entregador:', coords);
          }
        } else {
          console.log('❌ AdminOrdersMap: Localização não encontrada para entregador:', entregadorId);
        }
      } else {
        console.log('❌ AdminOrdersMap: Entregador não encontrado para o pedido');
        console.log('🔍 AdminOrdersMap: Dados disponíveis:', {
          order: {
            assignedTo: order.assignedTo,
            firebaseId: order.firebaseId,
            deliveryPerson: order.deliveryPerson
          },
          equipeIds: Object.keys(realtimeEquipe),
          locationIds: Object.keys(realtimeLocations)
        });
      }

    } else {
      // Modo admin - mostrar todos os entregadores
      console.log('🎯 AdminOrdersMap: Modo admin - mostrando todos os entregadores');
      
      Object.entries(realtimeEquipe).forEach(([entregadorId, entregadorData]: [string, any]) => {
        const locationData = realtimeLocations[entregadorId];
        if (locationData) {
          let coords = null;

          if (locationData.current && locationData.current.latitude && locationData.current.longitude) {
            coords = {
              lat: parseFloat(locationData.current.latitude),
              lng: parseFloat(locationData.current.longitude)
            };
          } else if (locationData.lat && locationData.lng) {
            coords = {
              lat: parseFloat(locationData.lat),
              lng: parseFloat(locationData.lng)
            };
          }

          if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
            const marker = new google.maps.Marker({
              position: coords,
              map: map,
              title: `${entregadorData.name} - Entregador`,
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new google.maps.Size(32, 32)
              },
              animation: null,
              optimized: true,
              clickable: true,
              draggable: false
            });

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 12px; min-width: 220px;">
                  <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">${entregadorData.name}</h3>
                  <div style="margin-bottom: 8px; font-size: 13px;">
                    <strong>Localização:</strong><br>
                    Lat: ${coords.lat.toFixed(6)}<br>
                    Lng: ${coords.lng.toFixed(6)}
                  </div>
                  ${locationData?.current?.timestamp ? `
                    <div style="font-size: 11px; color: #666; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                      Última atualização: ${new Date(locationData.current.timestamp).toLocaleString('pt-BR')}
                    </div>
                  ` : ''}
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

            newMarkers.push(marker);
          }
        }
      });

      // Centralizar mapa nos marcadores dos entregadores (modo admin)
      if (newMarkers.length > 0 && map) {
        if (newMarkers.length === 1) {
          // Se há apenas um entregador, centralizar nele
          const marker = newMarkers[0];
          const position = marker.getPosition();
          if (position) {
            map.setCenter(position);
            map.setZoom(15);
            console.log('🎯 AdminOrdersMap: Centralizado em um entregador (modo admin)');
          }
        } else {
          // Se há múltiplos entregadores, ajustar bounds para mostrar todos
          const bounds = new google.maps.LatLngBounds();
          newMarkers.forEach(marker => {
            const position = marker.getPosition();
            if (position) {
              bounds.extend(position);
            }
          });
          
          // Aplicar bounds com padding
          map.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50
          });
          
          console.log(`🎯 AdminOrdersMap: Centralizado em ${newMarkers.length} entregadores (modo admin)`);
        }
      }
    }

    setMarkers(newMarkers);
    console.log(`✅ AdminOrdersMap: ${newMarkers.length} marcadores criados`);

  }, [map, isLoaded, selectedOrderId, isTrackingPage, realtimeOrders, realtimeEquipe, realtimeLocations, loading, centerOnDeliveryPerson, createDeliveryRoute, isCentered, routeCreated, calculateQueuePosition]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Limpar timeouts
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      if (messageIntervalRef.current) {
        clearTimeout(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      
      // Limpar marcadores
      markers.forEach(marker => marker.setMap(null));
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
      }
      
      // Limpar InfoWindow de mensagens
      if (messageInfoWindow) {
        messageInfoWindow.close();
      }
      
      // Limpar marcadores do Map
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
      setRouteCreated(false);
      setDeliveryPersonLocation(null);
      setRouteInfo(null);
      setDeliveryMarker(null);
      setMessageInfoWindow(null);
      setIsAnimating(false);
      setQueueInfo(null);
      
      console.log('🧹 AdminOrdersMap: Cleanup completo realizado');
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando Google Maps...</p>
        </div>
      </div>
    );
  }

  if (error || mapError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-medium">Erro ao carregar Google Maps</p>
          <p className="text-red-500 text-sm mt-2">{error || mapError}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Aguardando Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Indicador de tempo real e informações da rota */}
      {isTrackingPage && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          {queueInfo && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {queueInfo.isNext ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-600">🎯 Próximo na fila!</span>
                      </div>
                      <span className="text-sm text-green-600">Seu pedido será entregue agora!</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-orange-700">
                          📋 Posição {queueInfo.position} de {queueInfo.totalPending}
                        </span>
                      </div>
                      <span className="text-sm text-orange-600">
                        Faltam {queueInfo.position - 1} entregas para a sua
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {queueInfo.totalPending} pedidos na rota
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Rastreamento em Tempo Real</span>
              </div>
              {isCentered && deliveryPersonLocation && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Navigation className="h-4 w-4" />
                  <span>Centralizado no entregador</span>
                </div>
              )}
              {routeCreated && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <RouteIcon className="h-4 w-4" />
                  <span>Rota ativa</span>
                </div>
              )}
            </div>
            {routeInfo && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <RouteIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">{routeInfo.distance}</span>
                </div>
                <div className="text-gray-600">•</div>
                <div className="text-orange-600 font-medium">{routeInfo.duration}</div>
              </div>
            )}
            {currentMessage && (
              <div className="text-xs text-gray-600 italic max-w-xs truncate">
                💬 "{currentMessage}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Container do mapa */}
      <div 
        ref={mapRef} 
        className="w-full h-64 md:h-96 rounded-lg border border-gray-200"
        style={{ minHeight: '400px' }}
      />

    </div>
  );
}