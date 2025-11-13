import React from 'react';
import AdminDeliveryMap from '../components/AdminDeliveryMap';
import AdminOrdersMap from '../components/AdminOrdersMap';
import AdminEntregadorSelector from '../components/AdminEntregadorSelector';
import { Order, DeliveryPerson } from '../features/orders/types';
import { Trash2 } from 'lucide-react';

interface EntregadorSelecionado {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
}

interface RoutingPageProps {
  orders: Order[];
  deliveryStaff: DeliveryPerson[];
  selectedOrder: string | null;
  onAreaSelected: (orderIds: string[]) => void;
  isDrawingArea: boolean;
  setIsDrawingArea: (isDrawing: boolean) => void;
  entregadorSelecionado: EntregadorSelecionado | null;
  setEntregadorSelecionado: (entregador: EntregadorSelecionado | null) => void;
  deleteDeliveryStaff: (id: string) => void;
  mappableOrders: Order[];
}

const RoutingPage: React.FC<RoutingPageProps> = ({
  orders,
  deliveryStaff,
  selectedOrder,
  onAreaSelected,
  isDrawingArea,
  setIsDrawingArea,
  entregadorSelecionado,
  setEntregadorSelecionado,
  deleteDeliveryStaff,
  mappableOrders,
}) => {
  return (
    <div className="grid grid-cols-12 gap-6 mt-6">
      <div className="col-span-12 lg:col-span-9 space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Mapa dos Pedidos</h3>
          <AdminOrdersMap 
            selectedOrderId={selectedOrder} 
            orders={orders}
            onAreaSelected={onAreaSelected}
            isDrawingArea={isDrawingArea}
            setIsDrawingArea={setIsDrawingArea}
          />
        </div>
      </div>
      <div className="col-span-12 lg:col-span-3">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-md font-semibold mb-2 text-green-800 flex items-center gap-2">
            <span>🚚</span>
            <span>Equipe de Entregadores</span>
          </h3>
          {deliveryStaff.map((entregador) => (
            <div key={entregador.id} className="flex items-center justify-between bg-white shadow-xs rounded-lg p-3 mb-2 border border-gray-100">
              <div className="flex items-center gap-3">
                <img src={entregador.avatar || 'https://via.placeholder.com/40'} alt={entregador.name} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-medium">{entregador.name}</p>
                  <p className="text-xs text-blue-600 font-semibold">
                    📦 {orders.filter(o => (o.assignedTo === entregador.id || o.firebaseId === entregador.id) && o.status !== 'Entregue' && o.status !== 'Cancelado').length} rotas ativas
                  </p>
                  <p className="text-xs text-gray-500 font-mono">ID: {entregador.id}</p>
                </div>
              </div>
              <button onClick={() => deleteDeliveryStaff(entregador.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm mt-6">
          <h3 className="text-lg font-medium mb-4">Selecionar Entregador por ID</h3>
          <AdminEntregadorSelector 
            onSelecionar={(entregador: EntregadorSelecionado) => setEntregadorSelecionado(entregador)} 
            onAdicionado={() => setTimeout(() => window.location.reload(), 1000)} 
          />
          {entregadorSelecionado && (
            <div className="mt-4 p-4 border bg-green-100 rounded-lg">
              <h4 className="font-semibold text-green-700">Entregador Selecionado</h4>
              <p><strong>Nome:</strong> {entregadorSelecionado.name}</p>
              <p><strong>Status:</strong> {entregadorSelecionado.status}</p>
              <p><strong>Firebase ID:</strong> {entregadorSelecionado.id}</p>
              <p><strong>Coordenadas:</strong> {entregadorSelecionado.lat}, {entregadorSelecionado.lng}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutingPage;
