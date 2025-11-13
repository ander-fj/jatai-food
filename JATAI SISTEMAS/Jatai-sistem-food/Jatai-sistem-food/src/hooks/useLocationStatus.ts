import { useState, useEffect, useCallback } from 'react';
import { 
  saveLocationData, 
  updateUserStatus, 
  listenToLocationChanges,
  listenToAllLocations,
  LocationData 
} from '../services/locationService';

interface UseLocationStatusProps {
  userId?: string;
  userName?: string;
  autoUpdateLocation?: boolean;
  updateInterval?: number; // em milissegundos
}

interface UseLocationStatusReturn {
  currentLocation: LocationData | null;
  allLocations: LocationData[];
  status: 'online' | 'offline' | 'busy' | 'available' | 'delivering';
  coordinates: { lat: number; lng: number };
  loading: boolean;
  error: string | null;
  updateStatus: (newStatus: 'online' | 'offline' | 'busy' | 'available' | 'delivering') => Promise<void>;
  updateCoordinates: (lat: number, lng: number) => Promise<void>;
  createLocation: () => Promise<void>;
  refreshLocation: () => void;
}

export const useLocationStatus = ({
  userId,
  userName = 'Usuário',
  autoUpdateLocation = true,
  updateInterval = 60000 // Aumentar para 60 segundos (1 minuto)
}: UseLocationStatusProps = {}): UseLocationStatusReturn => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [allLocations, setAllLocations] = useState<LocationData[]>([]);
  const [status, setStatus] = useState<'online' | 'offline' | 'busy' | 'available' | 'delivering'>('offline');
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para formatar coordenadas com 6 casas decimais
  const formatCoordinates = useCallback((lat: number, lng: number) => {
    return {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    };
  }, []);

  // Obter localização atual do dispositivo
  const getCurrentPosition = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = formatCoordinates(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve(coords);
        },
        (error) => {
          // Coordenadas de exemplo baseadas na imagem (Anderson Jatai)
          const fallbackCoords = formatCoordinates(-23.972800, -46.370600);
          console.warn('Erro ao obter localização, usando coordenadas de exemplo:', error);
          resolve(fallbackCoords);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, [formatCoordinates]);

  // Atualizar status
  const updateStatus = useCallback(async (newStatus: 'online' | 'offline' | 'busy' | 'available' | 'delivering') => {
    if (!userId) {
      setError('ID do usuário não fornecido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateUserStatus(userId, newStatus, coordinates);
      setStatus(newStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar status';
      setError(errorMessage);
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, coordinates]);

  // Atualizar coordenadas
  const updateCoordinates = useCallback(async (lat: number, lng: number) => {
    if (!userId) {
      setError('ID do usuário não fornecido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedCoords = formatCoordinates(lat, lng);
      await updateUserStatus(userId, status, formattedCoords);
      setCoordinates(formattedCoords);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar coordenadas';
      setError(errorMessage);
      console.error('Error updating coordinates:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, status, formatCoordinates]);

  // Criar nova localização
  const createLocation = useCallback(async () => {
    if (!userId) {
      setError('ID do usuário não fornecido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const locationData = await saveLocationData({
        userId,
        name: userName,
        status,
        coordinates
      });
      setCurrentLocation(locationData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar localização';
      setError(errorMessage);
      console.error('Error creating location:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userName, status, coordinates]);

  // Atualizar localização automaticamente
  const refreshLocation = useCallback(async () => {
    if (!autoUpdateLocation) return;

    try {
      const newCoords = await getCurrentPosition();
      
      // Verificar se a localização mudou significativamente
      const latDiff = Math.abs(coordinates.lat - newCoords.lat);
      const lngDiff = Math.abs(coordinates.lng - newCoords.lng);
      
      // Só atualizar se mudou mais de 10 metros (aproximadamente 0.0001 graus)
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        console.log('📍 Localização não mudou significativamente, pulando atualização');
        return;
      }
      
      setCoordinates(newCoords);
      
      if (userId && status !== 'offline') {
        await updateUserStatus(userId, status, newCoords);
        console.log('📍 Localização atualizada:', newCoords);
      }
    } catch (err) {
      console.warn('Erro ao atualizar localização automaticamente:', err);
    }
  }, [autoUpdateLocation, getCurrentPosition, userId, status]);

  // Efeito para obter localização inicial
  useEffect(() => {
    getCurrentPosition()
      .then(setCoordinates)
      .catch(err => {
        console.error('Erro ao obter localização inicial:', err);
        setError('Erro ao obter localização inicial');
      });
  }, [getCurrentPosition]);

  // Efeito para listener de localização específica do usuário
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = listenToLocationChanges(userId, (locationData) => {
      setCurrentLocation(locationData);
      if (locationData) {
        setStatus(locationData.status);
        setCoordinates(locationData.coordinates);
      }
    });

    return unsubscribe;
  }, [userId]);

  // Efeito para listener de todas as localizações
  useEffect(() => {
    const unsubscribe = listenToAllLocations(setAllLocations);
    return unsubscribe;
  }, []);

  // Efeito para atualização automática de localização
  useEffect(() => {
    // Desabilitado: não executar atualizações automáticas em segundo plano
    // if (!autoUpdateLocation || !userId) return;
    // const interval = setInterval(refreshLocation, updateInterval);
    // return () => clearInterval(interval);
  }, []);

  return {
    currentLocation,
    allLocations,
    status,
    coordinates,
    loading,
    error,
    updateStatus,
    updateCoordinates,
    createLocation,
    refreshLocation
  };
};

export default useLocationStatus;