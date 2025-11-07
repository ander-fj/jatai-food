import React from 'react';
import { MapPin, Clock, Package } from 'lucide-react';

const TrackingInfo: React.FC = () => {
  return (
    <div className="mt-6">
      {/* Informações principais */}
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="flex justify-center mb-4">
          <MapPin className="h-16 w-16 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold mb-3">Acompanhe o seu pedido</h2>
        <p className="text-gray-700 mb-4 text-sm">
          Insira o código de rastreamento fornecido no momento da compra para acompanhar o status do seu pedido em tempo real.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600 text-sm font-medium mb-2">Como funciona:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Atualizações em tempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>Localização precisa</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <span>Entrega rastreada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingInfo;