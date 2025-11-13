export const orderStatuses = [
  { id: 1, name: 'Pedido Recebido', completed: true, time: '01:01:54' },
  { id: 2, name: 'Preparando', completed: true, time: '01:14:28' },
  { id: 3, name: 'Pronto para Entrega', completed: true, time: '01:26:12' },
  { id: 4, name: 'Em Rota de Entrega', completed: true, time: '01:31:39' },
  { id: 5, name: 'Entregue', completed: false, time: '01:45:00' }
];

export const orderDetails = {
  orderNumber: '1',
  trackingCode: 'ZCQAOM99',
  orderDate: '29/05/2025, 01:34',
  address: 'Av. Paulista, 1000, Apt 123',
  deliveryPerson: {
    name: 'Carlos Silva',
    image: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  items: [
    { name: 'Pizza Margherita', quantity: 1, size: 'Grande', price: 45.90 },
    { name: 'Refrigerante', quantity: 1, size: '2L', price: 12.00 }
  ],
  total: 57.90
};

export const exampleTrackingCodes = [
  'ZCQAOM99',
  'KU88P9L',
  'MTTVK4Z4',
  'P5F265XX'
];