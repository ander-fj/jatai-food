import React from 'react';
import { useOrders } from '../features/orders/hooks/useOrders'; // Importa o hook
import SalaoPage from './SalaoPage';
import { Order, NewOrder } from '../features/orders/types';

const WaiterPage: React.FC = () => {
  const { addOrder, serviceFee } = useOrders(); // Usa o hook para obter a taxa de serviço

  const handleNewOrder = async (newOrder: NewOrder): Promise<Order> => {
    const createdOrder = await addOrder(newOrder);
    return createdOrder;
  };

  return <SalaoPage onConfirmOrder={handleNewOrder} serviceFee={serviceFee} />; // Passa a taxa para o SalaoPage
};

export default WaiterPage;