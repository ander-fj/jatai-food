import { database } from '../config/firebase';
import { ref, set, onValue, push, serverTimestamp } from 'firebase/database';
import { getTenantRef } from '../config/firebase';

export interface LocationData {
  id?: string;
  userId: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'available' | 'delivering';
  avatar?: string;
  coordinates: {
    lat: number; // 6 casas decimais
    lng: number; // 6 casas decimais
  };
  gridPosition: {
    row: number;
    col: number;
  };
  timestamp: Date;
  lastUpdate: string;
}

// Função para formatar coordenadas com 6 casas decimais
const formatCoordinates = (lat: number, lng: number): { lat: number; lng: number } => {
  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
};

// Convert real coordinates to grid position (6x4 grid) com 6 casas decimais
const coordsToGrid = (lat: number, lng: number): { row: number; col: number } => {
  // São Paulo approximate bounds com maior precisão
  const minLat = -23.700000;
  const maxLat = -23.400000;
  const minLng = -46.800000;
  const maxLng = -46.400000;
  
  // Normalize coordinates to 0-1 range
  const normalizedLat = (lat - minLat) / (maxLat - minLat);
  const normalizedLng = (lng - minLng) / (maxLng - minLng);
  
  // Convert to grid positions (4 rows, 6 columns)
  const row = Math.floor(normalizedLat * 4);
  const col = Math.floor(normalizedLng * 6);
  
  return {
    row: Math.max(0, Math.min(3, row)),
    col: Math.max(0, Math.min(5, col))
  };
};

// Salvar dados de localização com status
export const saveLocationData = async (userData: {
  userId: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'available' | 'delivering';
  avatar?: string;
  coordinates: { lat: number; lng: number };
}): Promise<LocationData> => {
  try {
    const formattedCoords = formatCoordinates(userData.coordinates.lat, userData.coordinates.lng);
    const gridPosition = coordsToGrid(formattedCoords.lat, formattedCoords.lng);
    
    const locationData: Omit<LocationData, 'id'> = {
      ...userData,
      coordinates: formattedCoords,
      gridPosition,
      timestamp: new Date(),
      lastUpdate: new Date().toISOString()
    };
    
    // Salvar apenas no Realtime Database - o firebaseSync.ts cuida da sincronização com Firestore
    const realtimeData = {
      name: userData.name,
      status: userData.status,
      avatar: userData.avatar || "",
      lat: formattedCoords.lat,
      lng: formattedCoords.lng,
      current: {
        latitude: formattedCoords.lat,
        longitude: formattedCoords.lng,
        timestamp: new Date().toISOString(),
      },
      lastUpdate: serverTimestamp()
    };
    
    const locationRef = getTenantRef(`locations/${userData.userId}`);
    await set(locationRef, realtimeData);
    
    return {
      id: userData.userId,
      ...locationData
    };
  } catch (error) {
    console.error('Error saving location data:', error);
    throw error;
  }
};

// Atualizar status do usuário
export const updateUserStatus = async (
  userId: string, 
  status: 'online' | 'offline' | 'busy' | 'available' | 'delivering',
  coordinates?: { lat: number; lng: number }
): Promise<void> => {
  try {
    // Desabilitado: não executar verificações automáticas
    console.log('🔇 Atualização de status desabilitada para evitar execução em segundo plano');
    return;
    
    const updates: any = {
      status,
      lastUpdate: new Date().toISOString()
    };
    
    if (coordinates) {
      const formattedCoords = formatCoordinates(coordinates.lat, coordinates.lng);
      updates.coordinates = formattedCoords;
      updates.lat = formattedCoords.lat;
      updates.lng = formattedCoords.lng;
      updates.current = {
        latitude: formattedCoords.lat,
        longitude: formattedCoords.lng,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Atualizar apenas no Realtime Database - o firebaseSync.ts cuida da sincronização com Firestore
    await set(locationRef, updates);
    
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Listener para mudanças em tempo real
export const listenToLocationChanges = (
  userId: string, 
  callback: (data: LocationData | null) => void
): () => void => {
  try {
    const locationRef = getTenantRef(`locations/${userId}`);
  
  const unsubscribe = onValue(locationRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const locationData: LocationData = {
        userId,
        name: data.name,
        status: data.status,
        avatar: data.avatar,
        coordinates: {
          lat: parseFloat(data.lat?.toFixed(6) || '0'),
          lng: parseFloat(data.lng?.toFixed(6) || '0')
        },
        gridPosition: coordsToGrid(data.lat || 0, data.lng || 0),
        timestamp: new Date(data.current?.timestamp || Date.now()),
        lastUpdate: data.lastUpdate || new Date().toISOString()
      };
      callback(locationData);
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
  } catch (error) {
    console.error('❌ Erro ao escutar mudanças de localização:', error);
    return () => {}; // Retorna função vazia se houver erro
  }
};

// Listener para todas as localizações
export const listenToAllLocations = (
  callback: (locations: LocationData[]) => void
): () => void => {
  try {
    const locationsRef = getTenantRef('locations');
  
  const unsubscribe = onValue(locationsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const locations: LocationData[] = Object.entries(data).map(([userId, userData]: [string, any]) => ({
        userId,
        name: userData.name,
        status: userData.status,
        avatar: userData.avatar,
        coordinates: {
          lat: parseFloat(userData.lat?.toFixed(6) || '0'),
          lng: parseFloat(userData.lng?.toFixed(6) || '0')
        },
        gridPosition: coordsToGrid(userData.lat || 0, userData.lng || 0),
        timestamp: new Date(userData.current?.timestamp || Date.now()),
        lastUpdate: userData.lastUpdate || new Date().toISOString()
      }));
      callback(locations);
    } else {
      callback([]);
    }
  });
  
  return unsubscribe;
  } catch (error) {
    console.error('❌ Erro ao escutar todas as localizações:', error);
    callback([]);
    return () => {}; // Retorna função vazia se houver erro
  }
};

// Exemplo de coordenadas com 6 casas decimais (baseado na imagem)
export const exampleCoordinates = {
  andersonJatai: {
    lat: -23.972800,
    lng: -46.370600
  }
};