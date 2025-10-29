import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, Clock, MapPin, Phone, Search, Filter } from 'lucide-react';
import { getDatabase, ref, get } from 'firebase/database';
import { useOrders } from '../features/orders/hooks/useOrders';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/formatters';

interface OrderHistory {
  id: string;
  trackingCode: string;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  orderTime: string;
  createdAt?: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    size: string;
    price: number;
  }>;
  tenant?: string;
}

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const { addOrder } = useOrders();
  
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [repeatingOrder, setRepeatingOrder] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Novo estado para controlar se uma busca foi feita

  // Efeito para buscar automaticamente se o telefone/nome vier da URL
  useEffect(() => {
    const phoneFromUrl = searchParams.get('phone');
    if (phoneFromUrl) {
      const decodedPhone = decodeURIComponent(phoneFromUrl);
      setPhoneFilter(decodedPhone);
      searchOrdersByPhone(decodedPhone);
    }
  }, [searchParams]);

  // Função para repetir pedido
  const handleRepeatOrder = async (order: OrderHistory) => {
    setRepeatingOrder(order.id);
    
    try {
      console.log('🔄 Repetindo pedido:', order);
      console.log('📋 Itens do pedido original:', order.items);
      
      const newOrderData = {
        customerName: order.customerName,
        phone: order.phone || '',
        address: order.address,
        pizzas: order.items.filter(i => i.name.toLowerCase().includes('pizza')).map(p => ({
            size: p.size.toLowerCase().substring(0,1),
            firstHalf: p.name, // Simplificação, pode precisar de ajuste se for meia-meia
            secondHalf: '',
            quantity: p.quantity,
            isHalfPizza: false
        })),
        beverages: order.items.filter(i => !i.name.toLowerCase().includes('pizza')).map(b => ({
            id: b.name, // Simplificação
            size: b.size,
            quantity: b.quantity
        }))
      };

      const createdOrder = await addOrder(newOrderData as any);

      // Mostrar confirmação detalhada
      const itemsList = order.items.map(item => 
        `• ${item.quantity}x ${item.name} ${item.size ? `(${item.size})` : ''} - R$ ${formatCurrency(item.price)}`
      ).join('\n');
      
      const sendWhatsApp = confirm(`✅ Pedido repetido com sucesso!\n\n` +
            `📦 Novo Pedido: #${createdOrder.id}\n` +
            `🏷️ Código: ${createdOrder.trackingCode}\n` +
            `👤 Cliente: ${order.customerName}\n` +
            `📞 Telefone: ${order.phone}\n` +
            `📍 Endereço: ${order.address}\n\n` +
            `📋 Itens:\n${itemsList}\n\n` +
            `💰 Total: R$ ${formatCurrency(newOrderData.total)}\n\n` +
            `O pedido foi criado com TODOS os dados originais preservados!`);

      if (sendWhatsApp && order.phone) {
        const message = `🍕 *Pedido Repetido com Sucesso!*\n\n` +
                       `*Pedido:* #${createdOrder.id}\n` +
                       `*Código:* ${createdOrder.trackingCode}\n` +
                       `*Cliente:* ${order.customerName}\n` +
                       `*Endereço:* ${order.address}\n\n` +
                       `*Itens:*\n${itemsList}\n\n` +
                       `*Total:* R$ ${formatCurrency(createdOrder.total)}\n\n` +
                       `Obrigado pela preferência! 🙏`;
        const phoneNumber = order.phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
      
    } catch (error) {
      console.error('❌ Erro ao repetir pedido:', error);
      alert(`❌ Erro ao repetir pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Tente novamente.`);
    } finally {
      setRepeatingOrder(null);
    }
  };

  // Buscar pedidos por telefone
  const searchOrdersByPhone = async (phone: string) => {
    setHasSearched(true); // Marca que uma busca foi iniciada
    if (!phone.trim()) {
      setError('Por favor, insira um número de telefone');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Buscando pedidos para telefone: ${phone}`);
      const db = getDatabase();
      
      // Buscar em todos os tenants
      const tenantsRef = ref(db, 'tenants');
      const tenantsSnapshot = await get(tenantsRef);
      
      if (!tenantsSnapshot.exists()) {
        setError('Nenhum sistema encontrado');
        setLoading(false);
        return;
      }

      const tenantsData = tenantsSnapshot.val();
      const foundOrders: OrderHistory[] = [];

      // Buscar em cada tenant
      for (const [tenantId, tenantData] of Object.entries<any>(tenantsData)) {
        if (tenantData.orders) {
          for (const [orderId, orderData] of Object.entries<any>(tenantData.orders)) {
            // Chave de busca: pode ser telefone ou nome do cliente/mesa
            const searchTermNormalized = phone.trim().toLowerCase();

            // Chaves do pedido
            const orderPhone = (orderData.phone || '').replace(/\D/g, '');
            const orderCustomerName = orderData.customerName?.toLowerCase() || '';
            
            // A busca agora verifica o telefone OU o nome do cliente (para pedidos do salão)
            // A busca por nome do cliente/mesa deve ser exata.
            // A busca por telefone compara apenas os números.
            if (orderCustomerName === searchTermNormalized || (orderPhone && orderPhone === searchTermNormalized.replace(/\D/g, ''))) {
              foundOrders.push({
                ...orderData,
                id: orderId,
                tenant: tenantId
              });
            }
          }
        }
      }

      // Ordenar por data (mais recentes primeiro)
      foundOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setOrders(foundOrders);
      
      if (foundOrders.length === 0) {
        setError(`Nenhum pedido encontrado para o telefone ${phone}`);
      } else {
        console.log(`✅ Encontrados ${foundOrders.length} pedidos`);
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      setError('Erro ao buscar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo': return 'bg-blue-100 text-blue-800';
      case 'Preparando': return 'bg-yellow-100 text-yellow-800';
      case 'Pronto para Entrega': return 'bg-indigo-100 text-indigo-800';
      case 'A caminho': return 'bg-purple-100 text-purple-800';
      case 'Entregue': return 'bg-green-100 text-green-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </button>
          <div>
            <h1 
              className="text-2xl font-bold"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              Consultar Meus Pedidos
            </h1>
            <p 
              className="text-gray-600"
              style={{ fontFamily: theme.fontFamily }}
            >
              Digite seu telefone para ver o histórico de pedidos
            </p>
          </div>
        </div>

        {/* Busca por telefone */}
        <div 
          className="bg-white p-6 shadow-sm mb-6"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Phone className="h-6 w-6" style={{ color: theme.primaryColor }} />
            <h2 
              className="text-lg font-semibold"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              Buscar por Telefone
            </h2>
          </div>
          
          <div className="flex gap-3">
            <input
              type="tel"
              placeholder="Digite seu telefone (ex: 11999999999)"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 focus:ring-2 focus:border-transparent"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily,
                '--tw-ring-color': theme.primaryColor
              } as React.CSSProperties}
            />
            <button
              onClick={() => searchOrdersByPhone(phoneFilter)}
              disabled={loading || !phoneFilter.trim()}
              className="px-6 py-3 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.primaryColor,
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            >
              {loading ? 'Buscando...' : 'Buscar Pedidos'}
            </button>
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm" style={{ borderRadius: theme.borderRadius }}>
              {error}
            </div>
          )}
        </div>

        {/* Filtros e busca (só aparecem após a primeira busca) */}
        {orders.length > 0 && (
          <div 
            className="bg-white p-4 shadow-sm mb-6"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por código, nome ou endereço..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily,
                      '--tw-ring-color': theme.primaryColor
                    } as React.CSSProperties}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                >
                  <option value="all">Todos os Status</option>
                  <option value="Novo">Novo</option>
                  <option value="Preparando">Preparando</option>
                  <option value="Pronto para Entrega">Pronto para Entrega</option>
                  <option value="A caminho">A caminho</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Lista de pedidos */}
        {hasSearched && filteredOrders.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 
                className="text-lg font-semibold"
                style={{ 
                  color: theme.textColor,
                  fontFamily: theme.fontFamily
                }}
              >
                Seus Pedidos ({filteredOrders.length})
              </h3>
            </div>
            
            {filteredOrders.map((order) => (
              <div 
                key={order.id}
                className="bg-white p-6 shadow-sm border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily,
                  borderLeftColor: theme.primaryColor
                }}
                onClick={() => navigate(`/delivery-status/${order.trackingCode}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 
                        className="text-lg font-semibold"
                        style={{ 
                          color: theme.textColor,
                          fontFamily: theme.fontFamily
                        }}
                      >
                        Pedido #{order.id}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Código:</strong> {order.trackingCode}
                    </p>
                    {order.tenant && (
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Pizzaria:</strong> {order.tenant}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-xl font-bold mb-1"
                      style={{ color: theme.accentColor }}
                    >
                      R$ {formatCurrency(order.items?.reduce((sum, item) => sum + (item.price || 0), 0) || order.total || 0)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {order.createdAt ? 
                        new Date(order.createdAt).toLocaleDateString('pt-BR') :
                        order.orderTime
                      }
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-600">{order.address}</p>
                      <p className="text-sm text-gray-600">{order.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Itens do pedido:</p>
                  <div className="space-y-1">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name} {item.size && `(${item.size})`}</span>
                        <span>R$ {formatCurrency(item.price)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-sm text-gray-500">
                        ... e mais {order.items.length - 3} itens
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/delivery-status/${order.trackingCode}`);
                      }}
                      className="text-sm font-medium hover:underline"
                      style={{ color: theme.primaryColor }}
                    >
                      Ver detalhes completos →
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRepeatOrder(order);
                      }}
                      disabled={repeatingOrder === order.id}
                      className="flex items-center gap-2 px-4 py-2 text-white font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: theme.accentColor,
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                        fontFamily: theme.fontFamily
                      }}
                    >
                      {repeatingOrder === order.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Criando Pedido...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Repetir Pedido
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched && orders.length > 0 ? (
          <div 
            className="bg-white p-8 text-center shadow-sm"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum pedido encontrado com os filtros aplicados
            </h3>
            <p className="text-gray-500">
              Tente ajustar os filtros de busca ou status
            </p>
          </div>
        ) : !loading && !hasSearched && ( // Mensagem inicial antes de qualquer busca
          <div 
            className="bg-white p-8 text-center shadow-sm"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Digite seu telefone para consultar pedidos
            </h3>
            <p className="text-gray-500">
              Insira o número de telefone usado nos pedidos para ver seu histórico
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default OrderHistoryPage;