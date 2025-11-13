import React from 'react';
import { useOrders } from '../features/orders/hooks/useOrders';
import KitchenPage from './KitchenPage';

const KitchenDisplayPage: React.FC = () => {
  const { getOrdersByStatus, updateOrderStatus } = useOrders();

  const ordersByStatus = getOrdersByStatus();
  const newOrders = ordersByStatus.novos || [];

  return <KitchenPage newOrders={newOrders} updateOrderStatus={updateOrderStatus} />;
};

export default KitchenDisplayPage;