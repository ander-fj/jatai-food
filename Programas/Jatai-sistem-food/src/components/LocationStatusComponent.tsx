import React, { useState, useEffect } from 'react';
import { 
  saveLocationData, 
  updateUserStatus, 
  listenToAllLocations, 
  LocationData,
  exampleCoordinates 
} from '../services/locationService';

interface LocationStatusComponentProps {
  currentUserId?: string;
}

const LocationStatusComponent: React.FC<LocationStatusComponentProps> = ({ currentUserId }) => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'online' | 'offline' | 'busy' | 'available' | 'delivering'>('offline');
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listener para todas as localizações
    const unsubscribe = listenToAllLocations((updatedLocations) => {
      setLocations(updatedLocations);
    });

    // Obter localização atual do usuário
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          setCoordinates({ lat, lng });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Usar coordenadas de exemplo se não conseguir obter localização
          setCoordinates(exampleCoordinates.andersonJatai);
        }
      );
    }

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (newStatus: 'online' | 'offline' | 'busy' | 'available' | 'delivering') => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      await updateUserStatus(currentUserId, newStatus, coordinates);
      setCurrentStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      await saveLocationData({
        userId: currentUserId,
        name: 'Anderson Jatai', // Baseado na imagem
        status: currentStatus,
        avatar: '',
        coordinates: coordinates
      });
    } catch (error) {
      console.error('Error creating location:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'busy': return 'bg-red-500';
      case 'available': return 'bg-blue-500';
      case 'delivering': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'busy': return 'Ocupado';
      case 'available': return 'Disponível';
      case 'delivering': return 'Entregando';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Status de Localização</h2>
      
      {/* Coordenadas atuais com 6 casas decimais */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Coordenadas Atuais</h3>
        <p className="text-sm text-gray-600">
          Latitude: <span className="font-mono">{coordinates.lat.toFixed(6)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Longitude: <span className="font-mono">{coordinates.lng.toFixed(6)}</span>
        </p>
      </div>

      {/* Controles de Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Alterar Status</h3>
        <div className="flex flex-wrap gap-2">
          {['online', 'offline', 'busy', 'available', 'delivering'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status as any)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                currentStatus === status 
                  ? getStatusColor(status) 
                  : 'bg-gray-300 hover:bg-gray-400'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
            >
              {getStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Botão para criar localização */}
      <div className="mb-6">
        <button
          onClick={handleCreateLocation}
          disabled={loading || !currentUserId}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Localização'}
        </button>
      </div>

      {/* Lista de usuários online */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Usuários Ativos</h3>
        <div className="space-y-3">
          {locations.map((location) => (
            <div key={location.userId} className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(location.status)}`}></div>
              <div className="flex-1">
                <p className="font-medium">{location.name}</p>
                <p className="text-sm text-gray-600">
                  {getStatusText(location.status)} • 
                  Lat: {location.coordinates.lat.toFixed(6)}, 
                  Lng: {location.coordinates.lng.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">
                  Última atualização: {new Date(location.lastUpdate).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-gray-500 text-center py-4">Nenhum usuário ativo</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationStatusComponent;