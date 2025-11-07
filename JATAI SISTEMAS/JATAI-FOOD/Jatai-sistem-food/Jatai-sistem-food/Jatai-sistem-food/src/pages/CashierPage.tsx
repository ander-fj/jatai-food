import React, { useState, useMemo } from 'react';
import { Order, PaymentMethod } from '../features/orders/types';
import { formatCurrency } from '../utils/formatters';
import { DollarSign, Utensils, Truck, CheckCircle, Search, TrendingUp, Package } from 'lucide-react';
import PaymentModal from '../features/orders/hooks/PaymentModal'; // Importar o novo modal

interface CashierPageProps {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: string, paymentMethod?: PaymentMethod) => void;
}

const CashierPage: React.FC<CashierPageProps> = ({ orders, updateOrderStatus }) => {
  const [activeTab, setActiveTab] = useState<'salao' | 'outros'>('salao');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para controlar o modal de pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<string | null>(null);


  const unpaidOrders = useMemo(() => {
    return orders.filter(order => order.status !== 'Pago' && order.status !== 'Cancelado');
  }, [orders]);

  const salaoOrders = useMemo(() => {
    return unpaidOrders.filter(order => 
      order.address === 'Consumo no local' &&
      ((order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (order.id || '').includes(searchTerm))
    );
  }, [unpaidOrders, searchTerm]);

  const outrosOrders = useMemo(() => {
    return unpaidOrders.filter(order => 
      order.address !== 'Consumo no local' &&
      ((order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (order.id || '').includes(searchTerm) || (order.phone || '').includes(searchTerm))
    );
  }, [unpaidOrders, searchTerm]);

  const totalSalao = useMemo(() => {
    return salaoOrders.reduce((acc, order) => acc + (order.total || 0), 0);
  }, [salaoOrders]);

  const totalOutros = useMemo(() => {
    return outrosOrders.reduce((acc, order) => acc + (order.total || 0), 0);
  }, [outrosOrders]);

  const openPaymentModal = (orderId: string) => {
    setSelectedOrderForPayment(orderId);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (method: PaymentMethod) => {
    if (selectedOrderForPayment) {
      updateOrderStatus(selectedOrderForPayment, 'Pago', method);
      setIsPaymentModalOpen(false);
      setSelectedOrderForPayment(null);
    } else {
      alert('Erro: Nenhum pedido selecionado para pagamento.');
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
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-800">{order.customerName}</h4>
                <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                <p className="text-sm text-gray-500">Status: <span className="font-medium">{order.status}</span></p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">{formatCurrency(order.total || 0)}</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt || Date.now()).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            
            {/* Detalhes dos valores */}
            <div className="border-t border-dashed pt-3 space-y-1 text-sm">
              {/* <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency((order.total || 0) - (order.serviceFeeApplied || 0) - (order.deliveryFeeApplied || 0))}</span>
              </div> */}
              {/* <div className="flex justify-between">
                <span className="text-gray-600">{order.serviceFeeApplied ? 'Taxa de Serviço:' : 'Taxa de Entrega:'}</span>
                <span className="font-medium">{formatCurrency(order.serviceFeeApplied || order.deliveryFeeApplied || 0)}</span>
              </div> */}
            </div>

            <div className="mt-4 flex justify-end items-center">
              <button
                onClick={() => openPaymentModal(order.id)}
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

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full mr-4">
              <Utensils className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total a Receber (Salão)</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalSalao)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total a Receber (Outros)</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalOutros)}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-sm">
          <p className="text-sm opacity-80">Total Geral a Receber</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSalao + totalOutros)}</p>
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

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};

export default CashierPage;