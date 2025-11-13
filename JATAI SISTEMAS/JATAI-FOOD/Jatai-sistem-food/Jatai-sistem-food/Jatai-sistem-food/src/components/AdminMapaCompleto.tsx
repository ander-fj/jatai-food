import React, { useState } from 'react';
import AdminDeliveryMap from './AdminDeliveryMap';
import AdminOrdersMap from './AdminOrdersMap';

const AdminMapaCompleto: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'entregadores' | 'pedidos'>('entregadores');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedTab('entregadores')}
          className={`px-4 py-2 rounded-lg font-medium ${selectedTab === 'entregadores' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Mapa de Entregadores
        </button>
        <button
          onClick={() => setSelectedTab('pedidos')}
          className={`px-4 py-2 rounded-lg font-medium ${selectedTab === 'pedidos' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Mapa de Pedidos
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className={selectedTab === 'entregadores' ? '' : 'hidden'}>
          <AdminDeliveryMap />
        </div>
        <div className={selectedTab === 'pedidos' ? '' : 'hidden'}>
          <AdminOrdersMap />
        </div>
      </div>
    </div>
  );
};

export default AdminMapaCompleto;

