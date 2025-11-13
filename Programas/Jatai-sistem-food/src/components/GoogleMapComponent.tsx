import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader, AlertCircle, ExternalLink } from 'lucide-react';
import { useEntregadoresRealtime } from "../hooks/useEntregadoresRealtime";
import { getDatabase, ref, onValue } from "firebase/database";
import { useNavigate } from 'react-router-dom';
import { getTenantRef } from '../config/firebase';
import { useGoogleMaps, useGoogleMapsMarkers, useGoogleMapsGeocoding } from '../hooks/useGoogleMaps';

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title?: string;
  type: 'delivery' | 'store' | 'order';
  info?: string;
}

interface GoogleMapComponentProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  onMarkerClick?: (markerId: string) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  center = { lat: -23.5505, lng: -46.6333 },
  zoom = 13,
  className = "w-full h-96",
  onMarkerClick
}) => {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isBillingError, setIsBillingError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const entregadores = useEntregadoresRealtime();
  const [orderMarkers, setOrderMarkers] = useState<MapMarker[]>([]);
  const navigate = useNavigate();

  // Usar hooks do Google Maps
  const { isLoaded, isLoading, error, initializeMap } = useGoogleMaps();
  const { createMarker } = useGoogleMapsMarkers();
  const { geocodeAddress } = useGoogleMapsGeocoding();

  // Carregar pedidos do Firebase
  useEffect(() => {
    // Desabilitado: não carregar pedidos automaticamente em segundo plano
    console.log('🔇 Carregamento automático de pedidos desabilitado');
  }, [geocodeAddress]);

  // Inicializar mapa quando a API estiver carregada
  useEffect(() => {
    if (isLoaded && mapContainer && !map && !isInitialized) {
      try {
        console.log('🗺️ Inicializando GoogleMapComponent...');
        setIsInitialized(true);
        
        const mapInstance = initializeMap(mapContainer, {
          center,
          zoom,
          styles: [],
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google!.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google!.maps.ControlPosition.TOP_CENTER,
          },
          zoomControl: true,
          zoomControlOptions: {
            position: window.google!.maps.ControlPosition.RIGHT_CENTER,
          },
          scaleControl: true,
          streetViewControl: true,
          streetViewControlOptions: {
            position: window.google!.maps.ControlPosition.RIGHT_TOP,
          },
          fullscreenControl: true,
        });

        if (mapInstance) {
          setMap(mapInstance);
          console.log('✅ GoogleMapComponent inicializado com sucesso');
        }
      } catch (err: any) {
        console.error('Google Maps initialization error:', err);
        setIsInitialized(false);
        if (err.message?.includes('billing') || err.message?.includes('API key')) {
          setIsBillingError(true);
        }
      }
    }
  }, [isLoaded, initializeMap, center, zoom, map, mapContainer, isInitialized]);

  // Atualizar marcadores quando dados mudarem
  useEffect(() => {
    if (!map || !isLoaded || !isInitialized) return;

    const allMarkers: MapMarker[] = [
      ...orderMarkers,
      ...entregadores.map(ent => ({
        id: ent.name,
        position: ent.position,
        title: ent.name,
        type: 'delivery',
        info: `Entregador: ${ent.name}`
      }))
    ];

    allMarkers.forEach(markerData => {
      const markerId = markerData.title || markerData.id;
      const existingMarker = markersRef.current.get(markerId);
      
      if (existingMarker) {
        // Garantir que o marcador está sempre visível
        existingMarker.setVisible(true);
        
        // Atualizar posição apenas se necessário
        const currentPos = existingMarker.getPosition();
        if (currentPos) {
          const latDiff = Math.abs(currentPos.lat() - markerData.position.lat);
          const lngDiff = Math.abs(currentPos.lng() - markerData.position.lng);
          
          // Só mover se a diferença for significativa (mais de 50 metros)
          if (latDiff > 0.0005 || lngDiff > 0.0005) {
            existingMarker.setPosition(markerData.position);
          }
        }
        
        return;
      }
      
      const marker = createMarker(map, {
        position: markerData.position,
        title: markerData.title,
        icon: getMarkerIcon(markerData.type),
        animation: null,
        optimized: false,
        clickable: true,
        draggable: false,
        visible: true // Sempre visível
      });

      if (marker && markerData.info) {
        // Armazenar o marcador no Map
        markersRef.current.set(markerId, marker);
        
        const infoWindow = new window.google!.maps.InfoWindow({
          content: `<div><h3>${markerData.title}</h3><p>${markerData.info}</p></div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (onMarkerClick) onMarkerClick(markerData.id);
        });
      }
    });

    // Ajustar bounds se houver múltiplos marcadores
    if (allMarkers.length > 1) {
      const bounds = new window.google!.maps.LatLngBounds();
      allMarkers.forEach(marker => bounds.extend(marker.position));
      map.fitBounds(bounds);
    }
  }, [map, orderMarkers, entregadores, onMarkerClick, isLoaded, createMarker]);

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      // Limpar marcadores
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
      
      // Reset do estado de inicialização
      setIsInitialized(false);
    };
  }, []);

  const getMarkerIcon = (type: string) => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    switch (type) {
      case 'store': return { url: baseUrl + 'orange-dot.png', scaledSize: new window.google!.maps.Size(32, 32) };
      case 'delivery': return { url: baseUrl + 'purple-dot.png', scaledSize: new window.google!.maps.Size(32, 32) };
      case 'order': return { url: baseUrl + 'green-dot.png', scaledSize: new window.google!.maps.Size(32, 32) };
      default: return { url: baseUrl + 'red-dot.png', scaledSize: new window.google!.maps.Size(32, 32) };
    }
  };

  const handleNovoPedido = () => {
    localStorage.removeItem("newOrderData");
    navigate("/novo-pedido");
  };

  // Mostrar loading enquanto carrega a API
  if (isLoading) {
    return (
      <div className={`${className} relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Carregando Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver
  if (error || isBillingError) {
    return (
      <div className={`${className} relative rounded-lg overflow-hidden border-2 border-red-200 bg-red-50 flex items-center justify-center`}>
        <div className="text-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              {isBillingError ? 'Configuração do Google Maps Necessária' : 'Erro ao Carregar Mapa'}
            </h3>
            <p className="text-red-600 text-sm mb-4">
              {error || 'Verifique a configuração da API do Google Maps'}
            </p>
            {isBillingError && (
              <a
                href="https://console.cloud.google.com/google/maps-apis/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Configurar Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-lg overflow-hidden border-2 border-gray-200`}>
      {!isInitialized && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
          <div className="text-center">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Inicializando mapa...</p>
          </div>
        </div>
      )}
      <button
        onClick={handleNovoPedido}
        className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded z-20 shadow"
      >
        Novo Pedido
      </button>
      <div ref={setMapContainer} className="w-full h-full" />
    </div>
  );
};

export default GoogleMapComponent;