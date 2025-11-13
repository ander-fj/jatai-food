import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, Clock, MapPin, Search, Filter, Utensils } from 'lucide-react';
import { getDatabase, ref, get } from 'firebase/database';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/formatters';

interface OrderHistory {
  id: string;
  trackingCode: string;
  customerName: string;
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

const ComandaHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [comandaFilter, setComandaFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const comandaFromUrl = searchParams.get('comanda');
    if (comandaFromUrl) {
      const decodedComanda = decodeURIComponent(comandaFromUrl);
      setComandaFilter(decodedComanda);
      // searchOrdersByComanda(decodedComanda);
    }
  }, [searchParams]);

  const searchOrdersByComanda = async (comandaName: string) => {
    setHasSearched(true);
    if (!comandaName.trim()) {
      setError('Por favor, insira o nome da mesa/cliente.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const db = getDatabase();
      const tenantsRef = ref(db, 'tenants');
      const tenantsSnapshot = await get(tenantsRef);
      
      if (!tenantsSnapshot.exists()) {
        setError('Nenhum sistema encontrado');
        setLoading(false);
        return;
      }

      const tenantsData = tenantsSnapshot.val();
      const foundOrders: OrderHistory[] = [];
      const searchTermNormalized = comandaName.trim().toLowerCase();

      for (const [tenantId, tenantData] of Object.entries<any>(tenantsData)) {
        if (tenantData.orders) {
          for (const [orderId, orderData] of Object.entries<any>(tenantData.orders)) {
            const orderCustomerName = orderData.customerName?.toLowerCase() || '';
            
            if (orderCustomerName.includes(searchTermNormalized)) {
              foundOrders.push({
                ...orderData,
                id: orderId,
                tenant: tenantId
              });
            }
          }
        }
      }

      foundOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setOrders(foundOrders);
      
      if (foundOrders.length === 0) {
        setError(`Nenhum pedido encontrado para "${comandaName}"`);
      }
      
    } catch (error) {
      setError('Erro ao buscar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    !searchTerm || order.trackingCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grandTotal = filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0);

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
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/salao')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5" /> Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.textColor }}>Consulta de Comandas do Salão</h1>
            <p className="text-gray-600">Busque pedidos por mesa ou nome do cliente.</p>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm mb-6" style={{ borderRadius: theme.borderRadius }}>
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="h-6 w-6" style={{ color: theme.primaryColor }} />
            <h2 className="text-lg font-semibold" style={{ color: theme.textColor }}>Buscar Comanda - Exemplo Mesa 15 - Pedro</h2>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Buscar Comanda - Mesa número da mesa - O seu nome"
              value={comandaFilter}
              onChange={(e) => setComandaFilter(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 focus:ring-2 focus:border-transparent"
              style={{ borderRadius: theme.borderRadius, '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
            />
            <button
              onClick={() => searchOrdersByComanda(comandaFilter)}
              disabled={loading || !comandaFilter.trim()}
              className="px-6 py-3 text-white font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm" style={{ borderRadius: theme.borderRadius }}>{error}</div>}
        </div>

        {hasSearched && filteredOrders.length > 0 && (
          <>
            <div className="mb-6 bg-gray-100 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Resultados da Busca</h3>
                <p className="text-sm text-gray-600">{filteredOrders.length} pedido(s) encontrado(s).</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Geral da Comanda</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white p-6 shadow-sm border-l-4" style={{ borderRadius: theme.borderRadius, borderLeftColor: theme.primaryColor }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold" style={{ color: theme.textColor }}>Pedido #{order.id}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: theme.accentColor }}>{formatCurrency(order.total || 0)}</div>
                      <div className="flex items-center gap-1 text-sm text-gray-500"><Clock className="h-4 w-4" />{order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : order.orderTime}</div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Itens:</p>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name} {item.size && `(${item.size})`}</span>
                          <span>{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && hasSearched && filteredOrders.length === 0 && (
          <div className="bg-white p-8 text-center shadow-sm" style={{ borderRadius: theme.borderRadius }}>
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Nenhum pedido encontrado</h3>
            <p className="text-gray-500">Não encontramos pedidos para a busca realizada.</p>
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="bg-white p-8 text-center shadow-sm" style={{ borderRadius: theme.borderRadius }}>
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Consulte uma comanda</h3>
            <p className="text-gray-500">Para consultar os pedidos, preencha o campo acima com o nome da mesa e do cliente.</p>
            <p className="text-sm text-gray-400 mt-2">Exemplo: <strong>Mesa 15 - Pedro</strong></p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ComandaHistoryPage;