import React from 'react';
import { Order } from '../types';
import OrderList from './OrderList';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface OrderStatusSectionProps {
  id: string;
  title: string;
  orders: Order[];
  selectedOrder: string | null;
  onSelectOrder: (id: string) => void;
  onDeselectOrder?: () => void;
  onEditOrder: () => void;
  onAssignDeliveryPerson: (orderId: string, deliveryPerson: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  deliveryStaff: Array<{
    id: string;
    name: string;
    orderCount: number;
  }>;
}

const OrderStatusSection: React.FC<OrderStatusSectionProps> = ({
  id,
  title,
  orders,
  selectedOrder,
  onSelectOrder,
  onDeselectOrder,
  onEditOrder,
  onAssignDeliveryPerson,
  onDeleteOrder,
  onUpdateStatus,
  deliveryStaff
}) => {
  const { setNodeRef } = useDroppable({ id });

  const getHeaderColor = (title: string) => {
    switch (title) {
      case 'Novos':
        return 'border-blue-500';
      case 'Próximos':
        return 'border-orange-500';
      case 'Preparando':
        return 'border-yellow-500';
      case 'Pronto p/ Entrega':
        return 'border-indigo-500';
      case 'A caminho':
        return 'border-purple-500';
      case 'Entregues':
        return 'border-green-500';
      case 'Cancelados':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div ref={setNodeRef} className={`bg-gray-50 rounded-lg p-4 ${getHeaderColor(title)} border-t-4`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
        <span>{title}</span>
        <span className="bg-gray-200 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {orders.length}
        </span>
      </h3>
      <SortableContext id={id} items={orders.map(o => o.id)} strategy={rectSortingStrategy}>
        <OrderList
          orders={orders}
          selectedOrder={selectedOrder}
          onSelectOrder={onSelectOrder}
          onDeselectOrder={onDeselectOrder}
          onEditOrder={onEditOrder}
          onAssignDeliveryPerson={onAssignDeliveryPerson}
          onDeleteOrder={onDeleteOrder}
          onUpdateStatus={onUpdateStatus}
          deliveryStaff={deliveryStaff}
        />
      </SortableContext>
    </div>
  );
};

export default OrderStatusSection;