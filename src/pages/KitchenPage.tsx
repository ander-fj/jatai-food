import React, { useState, useEffect } from 'react';
import { Order } from '../features/orders/types';
import { useTheme } from '../contexts/ThemeContext';
import { ChefHat, Clock, CheckCircle } from 'lucide-react';

interface KitchenPageProps {
  newOrders: Order[];
  updateOrderStatus: (orderId: string, newStatus: string) => void;
}

const KitchenPage: React.FC<KitchenPageProps> = ({ newOrders, updateOrderStatus }) => {
  const { theme } = useTheme();
  const [finishedOrders, setFinishedOrders] = useState<Order[]>([]);

  const handleFinishOrder = (orderId: string) => {
    const orderToMove = newOrders.find(o => o.id === orderId);
    if (orderToMove) {
      setFinishedOrders(prev => [orderToMove, ...prev]);
      updateOrderStatus(orderId, 'Pronto para Entrega');
    }
  };

  const finishedOrderIdsInSession = new Set(finishedOrders.map(o => o.id));
  const ordersToShow = newOrders.filter(order => !finishedOrderIdsInSession.has(order.id));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <ChefHat className="h-10 w-10 text-gray-700" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Painel da Cozinha</h1>
          <p className="text-gray-600">Pedidos aguardando preparação. ({ordersToShow.length})</p>
        </div>
      </div>

      {ordersToShow.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-sm">
          <ChefHat className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Nenhum pedido novo no momento.</h2>
          <p className="text-gray-500 mt-2">Aguardando novos pedidos para começar a preparação!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ordersToShow.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-lg border-l-4 border-yellow-400 flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-800">Pedido #{order.id.substring(0, 6)}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} />
                    <span>{order.orderTime}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-3"></div>
                <ul className="space-y-2 text-gray-700">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between items-center text-sm">
                      <span><strong className="font-semibold">{item.quantity}x</strong> {item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => handleFinishOrder(order.id)} className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-b-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                Finalizar Preparo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Área de Pedidos Finalizados */}
      {finishedOrders.length > 0 && (
        <div className="fixed bottom-6 right-6 z-20 max-w-sm w-full">
          <div className="bg-white p-4 rounded-lg shadow-2xl border-t-4 border-green-500">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Finalizados Recentemente</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {finishedOrders.map(order => (
                <div key={order.id} className="bg-green-50 text-green-800 p-3 rounded-md flex justify-between items-center text-sm">
                  <span className="font-semibold">Pedido #{order.id.substring(0, 6)}</span>
                  <CheckCircle size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenPage;