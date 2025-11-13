import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Package, Wifi, WifiOff, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import Header from '../components/Header';
import Footer from '../components/Footer';
import TrackingForm from '../components/TrackingForm';
import StatusTimeline from '../components/StatusTimeline';
import OrderDetails from '../components/OrderDetails';
import AdminOrdersMap from '../components/AdminOrdersMap';
import { useTrackingSearch } from '../hooks/useTrackingSearch';
import { useDeliveryStaffSearch } from '../hooks/useDeliveryStaffSearch';

const DeliveryStatusPage: React.FC = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const { order, tenant, loading: trackingLoading, error: trackingError } = useTrackingSearch(trackingCode);
  const { deliveryStaff, loading: staffLoading, error: staffError } = useDeliveryStaffSearch(tenant);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [deliveryPersonStatus, setDeliveryPersonStatus] = useState<string>('offline');
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Find assigned delivery person
  const assignedDeliveryPerson = order?.deliveryPerson ? 
    deliveryStaff.find(staff => staff.name.split(' ')[0] === order.deliveryPerson) : 
    order?.assignedTo ? 
    deliveryStaff.find(staff => staff.id === order.assignedTo) :
    order?.firebaseId ?
    deliveryStaff.find(staff => staff.id === order.firebaseId) :
    null;

  console.log('🔍 DeliveryStatusPage - Buscando entregador:', {
    orderDeliveryPerson: order?.deliveryPerson,
    orderAssignedTo: order?.assignedTo,
    orderFirebaseId: order?.firebaseId,
    deliveryStaffCount: deliveryStaff.length,
    assignedDeliveryPerson: assignedDeliveryPerson ? {
      id: assignedDeliveryPerson.id,
      name: assignedDeliveryPerson.name
    } : null
  });

  // Monitor Firebase connection
  useEffect(() => {
    const db = getDatabase();
    const connectedRef = ref(db, '.info/connected');
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      setConnectionStatus(connected ? 'online' : 'offline');
      if (connected) {
        setLastSyncTime(new Date());
        console.log('🟢 DeliveryStatusPage: Conectado ao Firebase');
      } else {
        console.log('🔴 DeliveryStatusPage: Desconectado do Firebase');
      }
    });

    return () => unsubscribe();
  }, []);

  // Get real-time delivery person status from Firebase locations
  useEffect(() => {
    if (!assignedDeliveryPerson) return;
    
    const db = getDatabase();
    const locationRef = ref(db, `locations/${assignedDeliveryPerson.id}`);
    
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const locationData = snapshot.val();
      if (locationData) {
        // Determine real status from Firebase locations
        let realStatus = 'offline';
        
        // Priority 1: status in locations.current
        if (locationData.current && locationData.current.status) {
          const currentStatus = locationData.current.status.toLowerCase();
          if (currentStatus === 'online' || currentStatus === 'ativo' || currentStatus === 'available') {
            realStatus = 'online';
          } else if (currentStatus === 'delivering' || currentStatus === 'busy') {
            realStatus = 'delivering';
          } else {
            realStatus = 'offline';
          }
        }
        // Priority 2: direct status in locations
        else if (locationData.status) {
          const locationStatus = locationData.status.toLowerCase();
          if (locationStatus === 'online' || locationStatus === 'ativo' || locationStatus === 'available') {
            realStatus = 'online';
          } else if (locationStatus === 'delivering' || locationStatus === 'busy') {
            realStatus = 'delivering';
          } else {
            realStatus = 'offline';
          }
        }
        
        // Check timestamp to determine if really online
        const timestamp = locationData.current?.timestamp || locationData.lastUpdate;
        if (timestamp) {
          const lastUpdate = new Date(timestamp);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          
          // If not updated in last 5 minutes, consider offline
          if (diffMinutes > 5 && realStatus === 'online') {
            realStatus = 'offline';
          }
        }
        
        setDeliveryPersonStatus(realStatus);
      } else {
        setDeliveryPersonStatus('offline');
      }
    });
    
    return () => unsubscribe();
  }, [assignedDeliveryPerson]);

  // Simular carregamento inicial da página
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300);

    return () => clearTimeout(loadingTimer);
  }, []);

  // Cleanup quando sair da página
  useEffect(() => {
    return () => {
      console.log('🧹 DeliveryStatusPage: Cleanup realizado');
    };
  }, []);

  console.log('🔍 Buscando pedido com código:', trackingCode);
  console.log('📦 Tenant encontrado:', tenant);
  console.log('📦 Pedido encontrado:', order?.id);

  // Mostrar loading se a página ainda está carregando
  if (isPageLoading || trackingLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {trackingLoading ? 'Buscando pedido no sistema...' : 'Carregando informações do pedido...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order || trackingError) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
          <TrackingForm />
          
          <div className="mt-6 bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-red-500 mb-4">
              <Package className="h-16 w-16 mx-auto mb-4" />
            </div>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Pedido não encontrado</h2>
            <p className="text-gray-600 mb-4">
              {trackingError || `O código de rastreamento ${trackingCode} não foi encontrado em nosso sistema.`}
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Verifique se o código foi digitado corretamente ou entre em contato conosco.
            </p>
            {tenant && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-700 text-sm">
                  <strong>Sistema:</strong> {tenant}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <Link 
                to="/" 
                className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  console.log('✅ Pedido encontrado:', order);
  console.log('🏢 Tenant:', tenant);

  const statuses = [
    { id: 1, name: 'Pedido Recebido', completed: true, time: order.orderTime },
    { id: 2, name: 'Preparando', completed: order.status !== 'Novo', time: order.orderTime },
    { id: 3, name: 'Pronto para Entrega', completed: ['Pronto para Entrega', 'A caminho', 'Entregue'].includes(order.status), time: order.orderTime },
    { id: 4, name: 'A caminho', completed: ['A caminho', 'Entregue'].includes(order.status), time: order.orderTime },
    { id: 5, name: 'Entregue', completed: order.status === 'Entregue', time: order.orderTime }
  ];

  const deliveryPersonInfo = assignedDeliveryPerson ? {
    name: assignedDeliveryPerson.name,
    image: assignedDeliveryPerson.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'
  } : undefined;

  const orderDetails = {
    orderNumber: order.id,
    trackingCode: order.trackingCode,
    orderDate: order.orderTime,
    address: order.address,
    customerName: order.customerName,
    deliveryPerson: deliveryPersonInfo,
    items: order.items,
    total: order.total
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        {/* Formulário de Rastreamento sempre visível */}
        <div className="mb-6">
          <TrackingForm />
        </div>
        
        {/* Status de Conexão */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-sm">
            {connectionStatus === 'online' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className={connectionStatus === 'online' ? 'text-green-600' : 'text-red-600'}>
              {connectionStatus === 'online' ? 'Conectado' : 'Reconectando...'}
            </span>
          </div>
        </div>
        
        {/* Mapa dos Pedidos */}
        {order.status !== 'Entregue' && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ position: 'relative' }}>
              <AdminOrdersMap selectedOrderId={order.id} isTrackingPage={true} tenantId={tenant} />
            </div>
          </div>
        )}

        {/* Status e Informações do Pedido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatusTimeline 
            statuses={statuses} 
            orderId={order.id}
            tenantId={tenant}
          />
          <OrderDetails {...orderDetails} />
        </div>

        {/* Status atual do pedido */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Status Atual</h4>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'online' ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'
            }`}></div>
            <span className="text-blue-700 font-medium">{order.status}</span>
            {connectionStatus === 'online' && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                Tempo real
              </span>
            )}
          </div>
          <p className="text-blue-600 text-sm mt-1">
            Última atualização: {lastSyncTime.toLocaleString('pt-BR')}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DeliveryStatusPage;