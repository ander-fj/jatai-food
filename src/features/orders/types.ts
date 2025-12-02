import { ReactNode } from 'react';

export interface OrderItem {
  name: string;
  quantity: number;
  size: string;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  currentPosition?: { row: number; col: number };
  items: OrderItem[];
  status: string;
  orderTime: string;
  timeElapsed: string;
  total: number;
  trackingCode: string;
  deliveryPerson?: string;
  createdAt?: string; // Campo do Firebase para data de criação
  serviceFeeApplied?: number;
  deliveryFeeApplied?: number;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  orderCount: number;
  trackingCode?: string;
}

export interface NewOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  type: string;
  image?: string;
  firstHalf?: string;
  secondHalf?: string;
  isHalfPizza?: boolean;
}

export interface NewOrder {
  customerName: string;
  phone: string;
  address: string;
  items: NewOrderItem[]; // Unified items array
  tableNumber?: string;
  coupon?: {
    code: string;
    discount: number;
  };
  subtotal: number;
  total: number;
}