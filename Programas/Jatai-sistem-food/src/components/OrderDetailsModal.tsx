import React from 'react';
import { X, Clock, MapPin, Phone, Pizza, Coffee, User, QrCode } from 'lucide-react';
import { Order } from '../features/orders/types';
import { formatCurrency } from '../utils/formatters';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const pizzas = (order.items || []).filter(item => item.name.toLowerCase().includes('pizza'));
  const beverages = (order.items || []).filter(item => !item.name.toLowerCase().includes('pizza'));

  const calculateOrderTotal = () => {
    return (order.items || []).reduce((total, item) => total + (item.price || 0), 0);
  };

  const actualTotal = calculateOrderTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Detalhes do Pedido #{order.id}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-medium mb-2">Informações do Cliente</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{order.phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <span>{order.address}</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div>
            <h3 className="text-lg font-medium mb-2">Informações do Pedido</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-gray-500" />
                <span>Código: {order.trackingCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>
                  Pedido feito às {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : order.orderTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border-0`}>
                  Status: {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-medium mb-2">Itens do Pedido</h3>
            <div className="space-y-4">
              {pizzas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <Pizza className="h-5 w-5" />
                    <span>Pizzas</span>
                  </div>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    {pizzas.map((item, index) => (
                      <div key={`pizza-${index}`} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-gray-500 text-sm">
                            {item.quantity}x {item.size && `• ${item.size}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div>R$ {formatCurrency(item.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {beverages.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <Coffee className="h-5 w-5" />
                    <span>Bebidas</span>
                  </div>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    {beverages.map((item, index) => (
                      <div key={`beverage-${index}`} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-gray-500 text-sm">
                            {item.quantity}x {item.size && `• ${item.size}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div>R$ {formatCurrency(item.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span>R$ {formatCurrency(actualTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
