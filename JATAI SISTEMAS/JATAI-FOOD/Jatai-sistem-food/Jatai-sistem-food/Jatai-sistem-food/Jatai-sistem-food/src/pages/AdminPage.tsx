import React, { useState, useEffect, useRef } from 'react';
import { Pizza, Plus, ArrowLeft, LogOut, Trash2, Search, X, Package, Settings, Menu as MenuIcon, Tag, BarChart2, Smile, ChevronDown, ChevronUp, PenSquare, ChevronLeft, Route, ExternalLink, ChefHat, Utensils, DollarSign, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { useNavigate, useParams, Navigate, Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import AdminDeliveryMap from '../components/AdminDeliveryMap';
import AdminOrdersMap from '../components/AdminOrdersMap';
import AdminEntregadorSelector from '../components/AdminEntregadorSelector';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import SystemConfigurationModal from '../components/SystemConfigurationModal';
import WhatsAppPromotionSection from '../components/WhatsAppPromotionSection';
import AdminJokesManagement from '../components/AdminJokesManagement';
import OrderStatusSection from '../features/orders/components/OrderStatusSection';
import NewOrderModal from '../features/orders/components/NewOrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import MenuManagementSection from '../components/MenuManagementSection';
import { useOrders } from '../features/orders/hooks/useOrders';
import { useEntregadoresRealtime } from '../hooks/useEntregadoresRealtime';
import { Order, NewOrder } from '../features/orders/types';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatters';
import { DndContext, closestCenter } from '@dnd-kit/core';
import AssignDriverModal from '../components/AssignDriverModal';
import { toast } from 'sonner';
import RoutingPage from './RoutingPage';
import KitchenPage from './KitchenPage';
import CashierPage from './CashierPage';

interface ColumnVisibilityToggleProps {
    columns: typeof ORDER_STATUS_TABS;
    visibleColumns: Record<string, boolean>;
    onToggle: (columnId: string) => void;
    iconProps: any;
}

const ColumnVisibilityToggle: React.FC<ColumnVisibilityToggleProps> = ({ columns, visibleColumns, onToggle, iconProps }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:opacity-90 px-4 py-2 text-gray-600 font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 border border-gray-300 rounded-md"
            >
                <span>Colunas Visíveis</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} {...iconProps}/>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                        {columns.map(col => (
                            <label key={col.id} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    checked={!!visibleColumns[col.id]}
                                    onChange={() => onToggle(col.id)}
                                    className="mr-2"
                                />
                                {col.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ORDER_STATUS_TABS = [
  { id: 'novos', label: 'Novos' },
  { id: 'preparando', label: 'Preparando' },
  { id: 'pronto', label: 'Pronto p/ Entrega' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'em-entrega', label: 'A caminho' },
  { id: 'entregues', label: 'Entregues' },
  { id: 'cancelados', label: 'Cancelados' },
] as const;

const SIDEBAR_TABS = [
    { id: 'roteirizacao', label: 'Roteirização', icon: Route },
    { id: 'caixa', label: 'Caixa', icon: DollarSign },
    { id: 'cardapio', label: 'Cardápio', icon: MenuIcon },
    { id: 'promocoes', label: 'Promoções', icon: Tag },
    { id: 'analytics', label: 'Relatórios', icon: BarChart2 },
    { id: 'piadas', label: 'Piadas', icon: Smile },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
] as const;

type OrderStatusTab = (typeof ORDER_STATUS_TABS)[number]['id'];
type SidebarTab = (typeof SIDEBAR_TABS)[number]['id'] | 'pedidos';

interface EntregadorSelecionado {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { logout, isLoggedIn, username: authUsername, isAuthenticated } = useAuth();
  const { theme, iconProps } = useTheme();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as SidebarTab | null;
  const urlMesa = searchParams.get('mesa');
  const urlCliente = searchParams.get('cliente');

  const [activeTab, setActiveTab] = useState<SidebarTab>(urlTab || 'pedidos');
  const [initialSalaoTableNumber, setInitialSalaoTableNumber] = useState<string | undefined>(undefined);
  const [initialSalaoCustomerName, setInitialSalaoCustomerName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (urlMesa) setInitialSalaoTableNumber(urlMesa);
    if (urlCliente) setInitialSalaoCustomerName(urlCliente);
  }, [urlMesa, urlCliente]);
  
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [entregadorSelecionado, setEntregadorSelecionado] = useState<EntregadorSelecionado | null>(null);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [detailedOrder, setDetailedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isDrawingArea, setIsDrawingArea] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    ORDER_STATUS_TABS.reduce((acc, tab) => ({ ...acc, [tab.id]: true }), {})
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssignDriverModalOpen, setIsAssignDriverModalOpen] = useState(false);
  const [selectedOrderIdsForAssignment, setSelectedOrderIdsForAssignment] = useState<string[]>([]);

  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const {
    orders,
    addOrder,
    assignDeliveryPerson,
    updateOrderStatus,
    getOrdersByStatus,
    deliveryStaff, // This is from the 'equipe' node in Firebase
    deleteOrder,
    deleteDeliveryStaff,
    deliveryStaffOrderCount, // This contains the order counts
  } = useOrders();

  const entregadoresRealtime = useEntregadoresRealtime(); // Real-time location and status

  const combinedDeliveryStaff = React.useMemo(() => {
    const staffMap = new Map();

    // Add staff from useOrders (equipe)
    deliveryStaff.forEach(staff => {
      staffMap.set(staff.id, {
        ...staff,
        orderCount: deliveryStaffOrderCount[staff.id] || 0,
        avatar: staff.avatar || '', // Ensure avatar is present
      });
    });

    // Augment with real-time data, or add if not in equipe
    entregadoresRealtime.forEach(realtimeStaff => {
      const existingStaff = staffMap.get(realtimeStaff.id);
      if (existingStaff) {
        staffMap.set(realtimeStaff.id, {
          ...existingStaff,
          lat: realtimeStaff.lat,
          lng: realtimeStaff.lng,
          status: realtimeStaff.status,
          avatar: realtimeStaff.avatar || existingStaff.avatar, // Prioritize realtime avatar if available
        });
      } else {
        // If a delivery person is online but not in the 'equipe' list, add them
        staffMap.set(realtimeStaff.id, {
          id: realtimeStaff.id,
          name: realtimeStaff.name,
          orderCount: deliveryStaffOrderCount[realtimeStaff.id] || 0,
          avatar: realtimeStaff.avatar || '',
          lat: realtimeStaff.lat,
          lng: realtimeStaff.lng,
          status: realtimeStaff.status,
          phone: '', // Default or fetch if needed
        });
      }
    });

    return Array.from(staffMap.values());
  }, [deliveryStaff, entregadoresRealtime, deliveryStaffOrderCount]);

  const handleAreaSelected = (orderIds: string[]) => {
    setSelectedOrderIdsForAssignment(orderIds);
    setIsAssignDriverModalOpen(true);
  };

  const handleAssignDriver = (driverId: string) => {
    handleAssignOrdersToDriver(driverId, selectedOrderIdsForAssignment);
    setIsAssignDriverModalOpen(false);
    toast.success(`${selectedOrderIdsForAssignment.length} pedidos foram atribuídos com sucesso!`);
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const previousNewOrdersCount = useRef<number>(0);
  const isInitialized = useRef<boolean>(false);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU3k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.6;
      audio.play().catch(() => console.log('Som não disponível'));
    } catch (error) {
      console.log('Erro no som:', error);
    }
  };

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    try {
      const ordersByStatus = getOrdersByStatus();
      const newOrders = ordersByStatus.new || [];
      const currentCount = newOrders.length;

      if (!isInitialized.current) {
        previousNewOrdersCount.current = currentCount;
        isInitialized.current = true;
        return;
      }

      if (currentCount > previousNewOrdersCount.current) {
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🍕 Novo Pedido Recebido!', {
            body: `${currentCount - previousNewOrdersCount.current} novo(s) pedido(s) chegaram`,
            icon: '/favicon.ico',
            tag: 'new-order'
          });
        }
      }

      previousNewOrdersCount.current = currentCount;
    } catch (error) {
      console.error('Erro no monitoramento de pedidos:', error);
    }
  }, [orders, getOrdersByStatus]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      if (!username || !isAuthenticated() || authUsername !== username) {
        setAuthError('Acesso não autorizado');
        navigate('/', { replace: true });
        return false;
      }
      setAuthError(null);
      return true;
    };

    if (!checkAuth()) {
        const timer = setTimeout(() => {
            if(!checkAuth()){
                navigate('/', { replace: true });
            }
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [isLoggedIn, authUsername, username, isAuthenticated, navigate]);

  useEffect(() => {
    setIsPageLoading(!isAuthenticated() || authUsername !== username);
  }, [isLoggedIn, authUsername, username, isAuthenticated]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const orderId = active.id;
      const newStatus = over.id;

      const statusMap = {
        'novos': 'Novo',
        'preparando': 'Preparando',
        'pronto': 'Pronto para Entrega',
        'proximos': 'Próximos',
        'em-entrega': 'A caminho',
        'entregues': 'Entregue',
        'cancelados': 'Cancelado',
      };

      const mappedStatus = statusMap[newStatus];

      if (mappedStatus) {
        updateOrderStatus(orderId, mappedStatus);
      }
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  const handleNewOrder = async (newOrder: NewOrder): Promise<Order> => {
    const createdOrder = await addOrder(newOrder);
    setShowNewOrderModal(false);
    setActiveTab('pedidos');
    return createdOrder;
  };

  const ordersByStatus = getOrdersByStatus();

  const handleLogout = (): void => {
    logout();
    navigate('/');
  };

  const filterOrdersBySearch = (orders: Order[]): Order[] => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase().trim();
    return orders.filter(order => 
      (order.customerName || '').toLowerCase().includes(term) ||
      (order.trackingCode || '').toLowerCase().includes(term) ||
      (order.phone || '').includes(term) ||
      (order.address || '').toLowerCase().includes(term)
    );
  };

  const handleAssignOrdersToDriver = (driverId: string, orderIds: string[]) => {
    orderIds.forEach(orderId => {
      assignDeliveryPerson(orderId, driverId);
    });
  };

  const mappableOrders = orders;

  return (
    <div className="flex h-screen bg-gray-100" style={{ fontFamily: theme.fontFamily }}>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div className={`fixed lg:relative bg-gray-800 text-white flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out z-30 h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`px-4 lg:px-8 py-4 bg-gray-800 flex flex-col items-center gap-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <img src="/jatai.png" alt="Jatai" className={`rounded-full object-cover transition-all duration-300 ${isSidebarCollapsed ? 'h-10 w-10' : 'h-21 w-21'}`} />
            {!isSidebarCollapsed && (
              <span className="text-lg font-semibold text-white mt-2">{username}</span>
            )}
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          <a href="#" onClick={() => setActiveTab('pedidos')} className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'pedidos' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
            <Package className="mr-3" {...iconProps}/>
            {!isSidebarCollapsed && <span>Pedidos</span>}
          </a>
          <Link to="/cozinha" target="_blank" className="flex items-center px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
            <ChefHat className={`${isSidebarCollapsed ? '' : 'mr-3'}`} {...iconProps}/>{!isSidebarCollapsed && <span>Cozinha</span>}
          </Link>
          <Link to="/salao" target="_blank" className="flex items-center px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
            <Utensils className={`${isSidebarCollapsed ? '' : 'mr-3'}`} {...iconProps}/>{!isSidebarCollapsed && <span>Salão</span>}
          </Link>
          {SIDEBAR_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <a href="#" key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center px-4 py-2 rounded-md ${activeTab === tab.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                    <Icon className={`${isSidebarCollapsed ? '' : 'mr-3'}`} {...iconProps}/>
                    {!isSidebarCollapsed && <span>{tab.label}</span>}
                </a>
              )
          })}
          <a href="/pedido" target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
            <ExternalLink className="mr-3" />
            {!isSidebarCollapsed && <span>Página de Pedidos</span>}
          </a>
        </nav>
        <div className="px-2 py-2 border-t border-gray-700">
            <button 
              onClick={handleLogout} 
              className="flex w-full items-center gap-2 hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
            > <LogOut className={`h-5 w-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} {...iconProps}/>
              {!isSidebarCollapsed && <span>Sair</span>}
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-4">
                  <button className="lg:hidden text-gray-600" onClick={() => setIsSidebarOpen(true)}> <MenuIcon className="h-6 w-6" {...iconProps}/>
                  </button>
                  <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex text-gray-600 hover:text-gray-800" title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
                    {isSidebarCollapsed ? <PanelRightClose {...iconProps} /> : <PanelLeftClose {...iconProps} />}
                  </button>
                </div>
                <div className="relative max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <Search className="h-5 w-5 text-gray-400" {...iconProps}/>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome, código, telefone ou endereço..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm"
                    /> {searchTerm && (
                        <button 
                        onClick={() => setSearchTerm('')} 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        > <X className="h-5 w-5" {...iconProps}/>
                        </button>
                    )}
                  </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                {activeTab === 'pedidos' && (
                  <>
                    <ColumnVisibilityToggle
                      columns={ORDER_STATUS_TABS}
                      visibleColumns={visibleColumns}
                      onToggle={toggleColumnVisibility}
                      iconProps={iconProps}
                    />
                    <button
                      onClick={() => setShowNewOrderModal(true)}
                      className="flex items-center gap-2 hover:opacity-90 px-4 py-2 text-white font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-lg"
                      style={{ backgroundColor: theme.accentColor, borderRadius: theme.borderRadius }}
                    >
                      <Plus className="h-5 w-5" {...iconProps}/>
                      Novo Pedido
                    </button>
                  </>
                )}
                {activeTab === 'roteirizacao' && (
                  <button
                    onClick={() => setIsDrawingArea(true)}
                    className="flex items-center gap-2 hover:opacity-90 px-4 py-2 text-gray-600 font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 border border-gray-300 rounded-md"
                  > <PenSquare className="h-5 w-5" {...iconProps}/>
                    Desenhar Área
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className={activeTab === 'pedidos' ? '' : 'hidden'}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <div className="flex gap-6 pb-4">
                  {ORDER_STATUS_TABS.filter(tab => visibleColumns[tab.id]).map(tab => (
                    <div key={tab.id} className={`${collapsedColumns[tab.id] ? 'w-20' : 'w-96'} flex-shrink-0 transition-all duration-300`}>
                        <OrderStatusSection
                            id={tab.id}
                            title={tab.label}
                            orders={filterOrdersBySearch(ordersByStatus[tab.id] || [])}
                            selectedOrder={selectedOrder}
                            onSelectOrder={setSelectedOrder}
                            onEditOrder={() => setIsEditing(true)} 
                            onAssignDeliveryPerson={assignDeliveryPerson}
                            onDeleteOrder={deleteOrder} 
                            onUpdateStatus={updateOrderStatus} 
                            deliveryStaff={deliveryStaff} 
                        />
                    </div>
                  ))}
                </div>
              </div>
            </DndContext>
          </div>
          <div className={activeTab === 'roteirizacao' ? '' : 'hidden'}>
            <RoutingPage
              orders={orders}
              deliveryStaff={deliveryStaff}
              selectedOrder={selectedOrder}
              onAreaSelected={handleAreaSelected}
              isDrawingArea={isDrawingArea}
              setIsDrawingArea={setIsDrawingArea}
              entregadorSelecionado={entregadorSelecionado}
              setEntregadorSelecionado={setEntregadorSelecionado}
              deleteDeliveryStaff={deleteDeliveryStaff}
              mappableOrders={mappableOrders}
            />
          </div>
          <div className={activeTab === 'caixa' ? '' : 'hidden'}>
            <CashierPage orders={orders} updateOrderStatus={updateOrderStatus} />
          </div>
          <div className={activeTab === 'cardapio' ? '' : 'hidden'}><div className="p-6 bg-white rounded-lg shadow-sm"><h2 className="text-2xl font-bold mb-4">Cardápio</h2><MenuManagementSection /></div></div>
          <div className={activeTab === 'promocoes' ? '' : 'hidden'}><div className="p-6 bg-white rounded-lg shadow-sm"><h2 className="text-2xl font-bold mb-4">Promoções via WhatsApp</h2><WhatsAppPromotionSection /></div></div>
          <div className={activeTab === 'analytics' ? '' : 'hidden'}><div className="p-6 bg-white rounded-lg shadow-sm"><AnalyticsDashboard orders={orders} deliveryStaff={combinedDeliveryStaff} /></div></div>
          <div className={activeTab === 'piadas' ? '' : 'hidden'}><div className="p-6 bg-white rounded-lg shadow-sm"><h2 className="text-2xl font-bold mb-4">Gerenciamento de Piadas</h2><AdminJokesManagement /></div></div>
          <div className={activeTab === 'configuracoes' ? '' : 'hidden'}>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-center">
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Configurações do Sistema</h3>
                <p className="text-gray-600 mb-6">Personalize a aparência e comportamento do sistema</p>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="text-white px-6 py-3 font-medium transition-colors flex items-center gap-2 mx-auto hover:opacity-90"
                  style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
                >
                  <Settings className="h-5 w-5" />
                  Abrir Configurações
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 p-3 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Jataí Sistem Food. Todos os direitos reservados.
        </footer>
      </div>

      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onConfirm={handleNewOrder}
        deliveryStaff={deliveryStaff}
      />

      <SystemConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      <AssignDriverModal
        isOpen={isAssignDriverModalOpen}
        onClose={() => setIsAssignDriverModalOpen(false)}
        onAssign={handleAssignDriver}
        deliveryStaff={deliveryStaff}
      />
    </div>
  );
};

export default AdminPage;