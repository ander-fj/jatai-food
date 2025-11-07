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

export interface Pizza {
  size: string;
  firstHalf: string;
  secondHalf: string;
  quantity: number;
  isHalfPizza: boolean; // true = meia pizza, false = pizza inteira
}

export interface Beverage {
  id: string;
  size: string;
  quantity: number;
}

export interface NewOrder {
  customerName: string;
  phone: string;
  address: string;
  pizzas: Pizza[];
  beverages: Beverage[];
  tableNumber?: string;
}