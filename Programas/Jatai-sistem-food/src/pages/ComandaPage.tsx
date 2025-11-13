import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, onValue } from 'firebase/database';
import { Order } from '../features/orders/types';
import { formatCurrency } from '../utils/formatters';
import { ClipboardList, DollarSign, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ComandaPage: React.FC = () => {
  const { comandaId } = useParams<{ comandaId: string }>();
  const { tenantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mesaNome = comandaId?.replace(/-/g, ' ').replace('mesa ', '') || '';

  useEffect(() => {
    if (!tenantId) {
      setError('Não foi possível identificar o estabelecimento.');
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const ordersRef = ref(db, `tenants/${tenantId}/orders`);

    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allOrders: Order[] = Object.values(data);
        const mesaOrders = allOrders.filter(order =>
          order.customerName.toLowerCase().includes(mesaNome.toLowerCase()) &&
          order.status !== 'Cancelado'
        );
        setOrders(mesaOrders);
      } else {
        setOrders([]);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Erro ao buscar os dados da comanda.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [comandaId, tenantId, mesaNome]);

  const totalComanda = orders.reduce((total, order) => total + (order.total || 0), 0);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <ClipboardList className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-800 mt-4 capitalize">Comanda: {mesaNome}</h1>
          <p className="text-gray-500">Acompanhe seus gastos em tempo real</p>
        </div>

        {loading && <div className="flex justify-center items-center py-10"><Loader className="animate-spin" /> Carregando...</div>}
        {error && <div className="text-center py-10 text-red-500"><AlertCircle className="mx-auto mb-2" /> {error}</div>}

        {!loading && !error && (
          <div className="space-y-4">
            {orders.flatMap(order => order.items || []).map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <p className="text-gray-700">{item.quantity}x {item.name}</p>
                <p className="font-medium">{formatCurrency(item.price || 0)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center text-2xl font-bold pt-4 border-t-2 mt-4">
              <span className="text-gray-600 flex items-center gap-2"><DollarSign /> Total:</span>
              <span className="text-red-600">{formatCurrency(totalComanda)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComandaPage;