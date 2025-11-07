
import { useEffect, useRef, useState, useCallback } from 'react';
import { getDatabase, ref, onValue, get } from "firebase/database";
import { useTheme } from '../contexts/ThemeContext';
import { useGoogleMaps, useGoogleMapsGeocoding } from '../hooks/useGoogleMaps';
import { Loader, AlertCircle, MapPin, Navigation, Route as RouteIcon } from 'lucide-react';
import { Order, OrderStatus } from '../features/orders/types';
import { Button } from './ui/button';
import { toast } from "sonner";
const getIconByStatus = (status: string): string => {
  switch (status) {
    case 'Novo':
      return 'https://www.google.com/intl/en_us/mapfiles/ms/micons/yellow-dot.png';
    case 'Preparando':
      return 'https://www.google.com/intl/en_us/mapfiles/ms/micons/orange-dot.png';
    case 'Pronto para Entrega':
      return 'https://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png';
    case 'A caminho':
      return 'https://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png';
    case 'Entregue':
    case 'Cancelado':
      return 'https://www.google.com/intl/en_us/mapfiles/ms/micons/grey.png';
    default:
      return 'https://www.google.com/intl/en_us/mapfiles/ms/micons/red-dot.png';
  }
};

interface AdminOrdersMapProps {
  selectedOrderId: string | null;
  isTrackingPage?: boolean;
  tenantId?: string;
  orders: Order[];
  onAreaSelected: (orderIds: string[]) => void;
  isDrawingArea: boolean;
  setIsDrawingArea: (isDrawing: boolean) => void;
}

export default function AdminOrdersMap({
  selectedOrderId,
  isTrackingPage = false,
  tenantId,
  orders,
  onAreaSelected,
  isDrawingArea,
  setIsDrawingArea,
}: AdminOrdersMapProps) {  const mapRef = useRef<HTMLDivElement>(null);
  const { isLoaded, isLoading, error } = useGoogleMaps();
  const { geocodeAddress } = useGoogleMapsGeocoding();
  const { iconProps } = useTheme();

  // Estados do mapa
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const persistentMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Estados de dados
  const [realtimeOrders, setRealtimeOrders] = useState<any>({});
  const [realtimeEquipe, setRealtimeEquipe] = useState<any>({});
  const [realtimeLocations, setRealtimeLocations] = useState<any>({});

  // Estados de rastreamento
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
  const [deliveryPersonLocation, setDeliveryPersonLocation] = useState<{ lat: number, lng: number } | null>(null);
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

  // Estados para seleção de área
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);

  // Estado para o filtro de pedidos
  const [orderFilter, setOrderFilter] = useState<'all' | 'assigned' | 'unassigned' | 'delivered'>('all');


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

  // Funções de seleção de área
  const handleDrawPolygon = useCallback(() => {
    if (!map || !window.google) return;

    // Remove polígonos antigos
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
    }

    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        fillColor: "#FFA500",
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: "#FFA500",
        editable: true,
        draggable: true,
      },
    });

    manager.setMap(map);
    setDrawingManager(manager);

    google.maps.event.addListener(manager, "polygoncomplete", (newPolygon: google.maps.Polygon) => {
      setPolygon(newPolygon);
      manager.setDrawingMode(null); // Sai do modo de desenho
    });
  }, [map, polygon]);

  // Efeito para iniciar o desenho a partir do pai
  useEffect(() => {
    if (isDrawingArea) {
      handleDrawPolygon();
      setIsDrawingArea(false); // Reseta o gatilho
    }
  }, [isDrawingArea, handleDrawPolygon, setIsDrawingArea]);


  const handleClearArea = () => {
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
    }
    if (drawingManager) {
      drawingManager.setMap(null);
      setDrawingManager(null);
    }
  };

  const handleAddToRoute = () => {
    if (!polygon) {
      toast.warning("Desenhe uma área no mapa para selecionar os pedidos.");
      return;
    }

    if (!window.google?.maps?.geometry?.poly) {
        toast.error("A biblioteca de geometria do Google Maps não está carregada.");
        return;
    }

    const ordersInArea = orders.filter(order => {
      // Ignorar pedidos que já foram entregues ou cancelados
      if (order.status === 'Entregue' || order.status === 'Cancelado') {
        return false;
      }

      const position = realtimeOrders[order.id]?.currentPosition;
      if (position && position.lat && position.lng) {
        const point = new google.maps.LatLng(position.lat, position.lng);
        return google.maps.geometry.poly.containsLocation(point, polygon);
      }
      return false;
    });

    if (ordersInArea.length === 0) {
      toast.info("Nenhum pedido encontrado na área selecionada.");
      return;
    }

    const orderIds = ordersInArea.map(o => o.id);
    onAreaSelected(orderIds);
    handleClearArea();
  };


  // Função para centralizar no entregador
  const centerOnDeliveryPerson = useCallback((coords: { lat: number, lng: number }) => {
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
  
  // Função para criar marcador do entregador (agora padronizado)
  const createDeliveryMarker = useCallback((coords: { lat: number, lng: number }, entregadorData: any) => {
    if (!map || !window.google) return null;

    console.log('🎭 AdminOrdersMap: Criando marcador padronizado do entregador');

    const deliveryIcon = entregadorData?.avatar
      ? {
          url: entregadorData.avatar,
          scaledSize: new google.maps.Size(40, 40), // Tamanho para a foto
          anchor: new google.maps.Point(20, 20) // Âncora central para a foto
        }
      : {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Fallback: pino azul
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        };

    // Criar marcador com animação
    const marker = new google.maps.Marker({
      position: coords,
      map: map,
      title: `${entregadorData?.name || 'Entregador'} - A caminho! 🚚`,
      icon: deliveryIcon, // Usar ícone padronizado
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

    return marker; // Retorna o marcador criado
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

      console.log(`⏰ Agendando mensagem ${messageCount} (${isJoke ? 'PIADA' : 'MENSAGEM'}) em ${delay / 1000}s`);

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
    deliveryPersonCoords: { lat: number, lng: number },
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

    // Limpar marcadores de pedidos e entregadores para redesenhar
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    if (isTrackingPage && selectedOrderId) {
      // ... (tracking mode logic remains the same)
    } else {
      // Modo admin (roteirização) - mostrar todos os pedidos e entregadores
      console.log('🎯 AdminOrdersMap: Modo admin - mostrando todos os pedidos e entregadores');
      // Usar a prop 'orders' que já vem do useOrders e está atualizada
      const allOrdersToProcess = orders;

      const filteredOrders = allOrdersToProcess.filter((order: Order) => {
        const isAssigned = !!order.assignedTo || !!order.deliveryPerson;
        const isDelivered = order.status === 'Entregue';
        const isSalonOrder = order.address === 'Consumo no local';

        // Pedidos do salão não devem aparecer no mapa
        if (isSalonOrder) {
          return false;
        }

        if (orderFilter === 'all') return !isDelivered;
        if (orderFilter === 'assigned') return isAssigned && !isDelivered;
        if (orderFilter === 'unassigned') return !isAssigned && !isDelivered;
        if (orderFilter === 'delivered') return isDelivered;
        return false;
      });

      const processOrderMarkers = async (orderData: Order) => {
        // Usar a posição do pedido da prop 'orders' ou do 'realtimeOrders' como fallback
        const position = orderData.currentPosition || realtimeOrders[orderData.id]?.currentPosition;
        // Log detalhado para depuração
        console.log(`📦 Processando pedido ${orderData.id} para o mapa:`, { 
          status: orderData.status,
          orderDataCurrentPosition: orderData.currentPosition,
          realtimeOrdersFallback: realtimeOrders[orderData.id]?.currentPosition,
          resolvedPosition: position,
          lat: position?.lat,
          lng: position?.lng
        });

        let finalPosition = position;
        // Se for um pedido entregue e não tiver posição, tenta geocodificar o endereço
        if (!finalPosition && orderData.status === 'Entregue' && orderData.address) {
          console.log(`🗺️ Pedido entregue sem coordenadas. Geocodificando endereço para: ${orderData.address}`);
          const geocodedPosition = await geocodeAddress(orderData.address);
          finalPosition = geocodedPosition;
        }

        if (finalPosition && typeof finalPosition.lat === 'number' && typeof finalPosition.lng === 'number' && !isNaN(finalPosition.lat) && !isNaN(finalPosition.lng)) {
          const isAssigned = !!orderData.assignedTo || !!orderData.deliveryPerson;
          const isDelivered = orderData.status === 'Entregue';

          const iconUrl = isDelivered
            ? 'https://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png' // Verde para entregues
            : isAssigned
              ? 'https://www.google.com/intl/en_us/mapfiles/ms/micons/yellow-dot.png' // Amarelo para atribuídos
              : 'https://www.google.com/intl/en_us/mapfiles/ms/micons/red-dot.png'; // Vermelho para não atribuídos

          const orderMarker = new google.maps.Marker({
            position: finalPosition,
            map: map,
            title: `Pedido de ${orderData.customerName || 'Cliente'}`,
            icon: { url: iconUrl }
          });

          const orderInfoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 10px; min-width: 200px;">
                <h4 style="margin: 0 0 5px 0; font-weight: bold;">${orderData.customerName}</h4>
                <p style="margin: 0;">${orderData.address || 'Endereço não informado'}</p>
                <p style="margin: 5px 0 0 0;">Status: <strong>${orderData.status}</strong></p>
                <p style="margin: 5px 0 0 0;">Código: <strong>${orderData.trackingCode}</strong></p>
                ${orderData.deliveryPerson ? `<p style="margin: 5px 0 0 0;">Entregador: <strong>${orderData.deliveryPerson}</strong></p>` : ''}
              </div>
            `
          });

          orderMarker.addListener('click', () => {
            orderInfoWindow.open(map, orderMarker);
          });

          markersRef.current.set(`order-${orderData.id}`, orderMarker);
        } else {
          console.log(`🚫 Pedido ${orderData.id} ignorado por falta de coordenadas válidas.`);
        }
      };

      // Usar Promise.all para garantir que todas as geocodificações terminem
      Promise.all(filteredOrders.map(processOrderMarkers));

      // Adicionar marcadores para entregadores
      Object.entries(realtimeEquipe).forEach(([entregadorId, entregadorData]: [string, any]) => {
        const locationData = realtimeLocations[entregadorId];
        if (locationData) {
          let coords = null;

          if (locationData.current && locationData.current.latitude && locationData.current.longitude) {
            coords = {
              lat: parseFloat(locationData.current.latitude),
              lng: parseFloat(locationData.current.longitude)
            };
          } else if (locationData.lat && locationData.lat) {
            coords = {
              lat: parseFloat(locationData.lat),
              lng: parseFloat(locationData.lng)
            };
          }

          if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
            const driverIcon = entregadorData?.avatar
            ? {
                url: entregadorData.avatar,
                scaledSize: new google.maps.Size(40, 40), // Tamanho para a foto
                anchor: new google.maps.Point(20, 20) // Âncora central para a foto
              }
            : {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Fallback: pino azul
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 32)
            };

            const driverMarker = new google.maps.Marker({
              position: coords,
              map: map,
              title: `${entregadorData.name} - Entregador`,
              icon: driverIcon,
              animation: null,
              optimized: true,
              clickable: true,
              draggable: false
            });

            const driverInfoWindow = new google.maps.InfoWindow({
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

            driverMarker.addListener('click', () => {
              driverInfoWindow.open(map, driverMarker);
            });

            markersRef.current.set(`driver-${entregadorId}`, driverMarker);
          }
        }
      });

      // Centralizar mapa para mostrar todos os marcadores (pedidos e entregadores)
      const allMarkers = Array.from(markersRef.current.values());
      if (allMarkers.length > 0 && map) {
        if (allMarkers.length === 1) {
          const position = allMarkers[0].getPosition();
          if (position) map.setCenter(position);
          map.setZoom(15);
        } else {
          const bounds = new google.maps.LatLngBounds();
          allMarkers.forEach(marker => {
            const position = marker.getPosition();
            if (position) bounds.extend(position);
          });
          map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        }
        console.log(`🎯 AdminOrdersMap: Centralizado em ${allMarkers.length} marcadores (pedidos e entregadores)`);
      }
    }

    setMarkers(Array.from(markersRef.current.values()));
    console.log(`✅ AdminOrdersMap: ${markersRef.current.size} marcadores criados/atualizados`);

  }, [map, isLoaded, selectedOrderId, isTrackingPage, orders, realtimeEquipe, realtimeLocations, loading, centerOnDeliveryPerson, createDeliveryRoute, isCentered, routeCreated, calculateQueuePosition, createDeliveryMarker, orderFilter, geocodeAddress]);
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

      // Limpar marcadores persistentes
      persistentMarkersRef.current.forEach(marker => marker.setMap(null));
      persistentMarkersRef.current.clear();

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
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" {...iconProps}/>
          <p className="text-gray-600">Carregando Google Maps...</p>
        </div>
      </div>
    );
  }

  if (error || mapError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" {...iconProps}/>
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
          <MapPin className="w-8 h-8 mx-auto mb-4 text-gray-400" {...iconProps}/>
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
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" ></div>
                <span className="text-sm font-medium text-green-700">Rastreamento em Tempo Real</span>
              </div>
              {isCentered && deliveryPersonLocation && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Navigation className="h-4 w-4" {...iconProps}/>
                  <span>Centralizado no entregador</span>
                </div>
              )}
              {routeCreated && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                    <RouteIcon className="h-4 w-4" {...iconProps}/>
                  <span>Rota ativa</span>
                </div>
              )}
            </div>
            {routeInfo && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">📍 {routeInfo.distance}</span>
                <span className="mx-2">•</span>
                <span className="font-medium">⏱️ {routeInfo.duration}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Container do mapa */}
      <div className="relative">
        {/* Controles do Mapa */}
        {!isTrackingPage && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-4 items-center bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as any)}
              className="bg-white p-2 rounded-md shadow-md border text-sm"
            >
              <option value="all">Todos os Pedidos</option>
              <option value="assigned">Atribuídos</option>
              <option value="unassigned">Não Atribuídos</option>
              <option value="delivered">Entregues</option>
            </select>
            {polygon && (
              <>
              <Button onClick={handleAddToRoute} variant="secondary">Adicionar à rota</Button>
              <Button onClick={handleClearArea} variant="destructive">Apagar área</Button>
              </>
            )}
          </div>
        )}

        <div
          ref={mapRef}
          className="w-full rounded-lg border border-gray-200 shadow-sm"
          style={{ height: '600px' }}
        />

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" {...iconProps}/>
              <p className="text-sm text-gray-600">Carregando dados...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
