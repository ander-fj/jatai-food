import React from 'react';
import OrderCard from './OrderCard';
import { Order } from '../types';

interface OrderListProps {
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

const OrderList: React.FC<OrderListProps> = ({
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
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isSelected={selectedOrder === order.id}
          onSelect={onSelectOrder}
          onDeselect={selectedOrder === order.id ? onDeselectOrder : undefined}
          onEdit={onEditOrder}
          onAssignDeliveryPerson={onAssignDeliveryPerson}
          onDelete={onDeleteOrder}
          onUpdateStatus={onUpdateStatus}
          deliveryStaff={deliveryStaff}
        />
      ))}
    </div>
  );
};

export default OrderList;