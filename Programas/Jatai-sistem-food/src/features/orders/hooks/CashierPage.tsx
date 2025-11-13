import React, { useState, useMemo } from 'react';
import { Order } from '../features/orders/types';
import { formatCurrency } from '../utils/formatters';
import { DollarSign, Utensils, Truck, CheckCircle, Search } from 'lucide-react';

interface CashierPageProps {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: string) => void;
}

const CashierPage: React.FC<CashierPageProps> = ({ orders, updateOrderStatus }) => {
  const [activeTab, setActiveTab] = useState<'salao' | 'outros'>('salao');
  const [searchTerm, setSearchTerm] = useState('');

  const unpaidOrders = useMemo(() => {
    return orders.filter(order => order.status !== 'Pago' && order.status !== 'Cancelado');
  }, [orders]);

  const salaoOrders = useMemo(() => {
    return unpaidOrders.filter(order => 
      order.address === 'Consumo no local' &&
      (order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.includes(searchTerm))
    );
  }, [unpaidOrders, searchTerm]);

  const outrosOrders = useMemo(() => {
    return unpaidOrders.filter(order => 
      order.address !== 'Consumo no local' &&
      (order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.includes(searchTerm) || (order.phone || '').includes(searchTerm))
    );
  }, [unpaidOrders, searchTerm]);

  const handleMarkAsPaid = (orderId: string) => {
    if (window.confirm('Deseja marcar este pedido como pago? Esta ação não pode ser desfeita.')) {
      updateOrderStatus(orderId, 'Pago');
    }
  };

  const renderOrderList = (orderList: Order[]) => {
    if (orderList.length === 0) {
      return (
        <div className="text-center py-16 text-gray-500">
          <DollarSign className="mx-auto h-16 w-16 text-gray-300" />
          <p className="mt-4">Nenhum pedido pendente de pagamento nesta categoria.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {orderList.map(order => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-800">{order.customerName}</h4>
                <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                <p className="text-sm text-gray-500">Status: <span className="font-medium">{order.status}</span></p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">{formatCurrency(order.total)}</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt || Date.now()).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleMarkAsPaid(order.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={18} />
                Marcar como Pago
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Caixa - Cobrança de Pedidos</h2>

      <div className="mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('salao')}
            className={`flex items-center gap-2 py-3 px-6 font-medium transition-colors ${activeTab === 'salao' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Utensils size={18} />
            Salão
          </button>
          <button
            onClick={() => setActiveTab('outros')}
            className={`flex items-center gap-2 py-3 px-6 font-medium transition-colors ${activeTab === 'outros' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Truck size={18} />
            Outros (Delivery/Retirada)
          </button>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, ID do pedido ou telefone..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        {activeTab === 'salao' && renderOrderList(salaoOrders)}
        {activeTab === 'outros' && renderOrderList(outrosOrders)}
      </div>
    </div>
  );
};

export default CashierPage;