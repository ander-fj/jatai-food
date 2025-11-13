import React from 'react';
import { RefreshCw, MapPin, User } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface OrderItem {
  name: string;
  quantity: number;
  size: string;
  price: number;
}

interface OrderDetailsProps {
  orderNumber: string;
  trackingCode: string;
  orderDate: string;
  address: string;
  customerName?: string;
  deliveryPerson?: {
    name: string;
    image: string;
  };
  items: OrderItem[];
  total: number;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({
  orderNumber,
  trackingCode,
  orderDate,
  address,
  customerName,
  deliveryPerson,
  items,
  total
}) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Informações do Pedido</h3>
        <button className="flex items-center text-xs text-blue-600">
          <RefreshCw className="h-3 w-3 mr-1" />
          Atualizar
        </button>
      </div>
      
      <div className="space-y-4">
        {customerName && (
          <div>
            <p className="text-sm text-gray-500">Cliente</p>
            <p className="font-medium">{customerName}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm text-gray-500">Código de Rastreamento</p>
          <p className="font-medium">{trackingCode}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Horário do Pedido</p>
          <p className="font-medium">{orderDate}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Endereço de entrega</p>
          <div className="flex items-start">
            <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
            <p className="font-medium">{address}</p>
          </div>
        </div>
        
        {deliveryPerson && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Entregador</p>
            <div className="flex items-center">
              <img 
                src={deliveryPerson.image} 
                alt={deliveryPerson.name}
                className="h-8 w-8 rounded-full mr-2 object-cover"
              />
              <div>
                <p className="font-medium">{deliveryPerson.name}</p>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                  <p className="text-xs text-green-600">Online</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <p className="text-sm text-gray-500 mb-2">Itens do Pedido</p>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <p>{item.quantity}x {item.name} - {item.size}</p>
                <p className="font-medium">R$ {formatCurrency(item.price)}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-2">
          <div className="flex justify-between font-bold">
            <p>Total</p>
            <p>R$ {formatCurrency(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;