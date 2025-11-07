import { useState, useEffect, useCallback } from 'react';

// Estado global para controlar o carregamento da API
let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
let googleMapsCallbacks: (() => void)[] = [];
let googleMapsScript: HTMLScriptElement | null = null;
let loadingPromise: Promise<void> | null = null;

// Função para verificar se o Google Maps já está disponível
const isGoogleMapsAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         window.google && 
         window.google.maps && 
         window.google.maps.Map &&
         typeof window.google.maps.Map === 'function';
};

// Função para limpar estado anterior se necessário
const resetGoogleMapsState = () => {
  if (isGoogleMapsLoaded && !isGoogleMapsAvailable()) {
    console.log('🔄 Resetando estado do Google Maps...');
    isGoogleMapsLoaded = false;
    isGoogleMapsLoading = false;
    googleMapsCallbacks = [];
    loadingPromise = null;
  }
};

// Função para remover scripts duplicados do Google Maps
const removeExistingGoogleMapsScripts = () => {
  const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
  existingScripts.forEach((script, index) => {
    if (index > 0) { // Manter apenas o primeiro script
      console.log('🧹 Removendo script duplicado do Google Maps');
      script.remove();
    }
  });
};

// Callback global que será chamado quando o Google Maps estiver pronto
declare global {
  interface Window {
    initGoogleMapsCallback: () => void;
  }
}

// Função para carregar a API do Google Maps
const loadGoogleMapsAPI = (apiKey: string): Promise<void> => {
  // Se já existe uma promise de carregamento, retorna ela
  if (loadingPromise) {
    return loadingPromise;
  }

  // Se já está carregado, resolve imediatamente
  if (isGoogleMapsLoaded && isGoogleMapsAvailable()) {
    return Promise.resolve();
  }

  // Reset do estado se necessário
  resetGoogleMapsState();

  // Criar nova promise de carregamento
  loadingPromise = new Promise((resolve, reject) => {
    // Se já está carregando, adiciona callback à lista
    if (isGoogleMapsLoading) {
      googleMapsCallbacks.push(() => resolve());
      return;
    }

    // Remover scripts duplicados antes de verificar
    removeExistingGoogleMapsScripts();

    // Verifica se já existe um script do Google Maps
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript && isGoogleMapsAvailable()) {
      console.log('✅ Google Maps já carregado');
      isGoogleMapsLoaded = true;
      resolve();
      return;
    }

    // Se existe script mas não está carregado, aguarda o carregamento
    if (existingScript && !isGoogleMapsAvailable()) {
      console.log('⏳ Aguardando carregamento do script existente...');
      isGoogleMapsLoading = true;
      googleMapsCallbacks.push(() => resolve());
      
      // Definir callback global se ainda não existe
      if (!window.initGoogleMapsCallback) {
        window.initGoogleMapsCallback = () => {
          console.log('✅ Google Maps API carregada via callback');
          isGoogleMapsLoaded = true;
          isGoogleMapsLoading = false;
          
          // Executa todos os callbacks pendentes
          googleMapsCallbacks.forEach(callback => callback());
          googleMapsCallbacks = [];
          loadingPromise = null;
        };
      }
      
      // Timeout de segurança
      setTimeout(() => {
        if (isGoogleMapsLoading) {
          isGoogleMapsLoading = false;
          loadingPromise = null;
          reject(new Error('Timeout ao aguardar carregamento do Google Maps'));
        }
      }, 15000);
      
      return;
    }

    // Marca como carregando
    isGoogleMapsLoading = true;

    // Define o callback global antes de carregar o script
    window.initGoogleMapsCallback = () => {
      console.log('✅ Google Maps API carregada via callback');
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      
      // Executa todos os callbacks pendentes
      googleMapsCallbacks.forEach(callback => callback());
      googleMapsCallbacks = [];
      loadingPromise = null;
      
      resolve();
    };

    // Cria e adiciona o script com callback
    googleMapsScript = document.createElement('script');
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry&loading=async&callback=initGoogleMapsCallback`;
    googleMapsScript.async = true;
    googleMapsScript.defer = true;

    // Adicionar atributo para identificar nosso script
    googleMapsScript.setAttribute('data-google-maps-hook', 'true');

    googleMapsScript.onerror = (error) => {
      console.error('❌ Erro ao carregar Google Maps API:', error);
      isGoogleMapsLoading = false;
      loadingPromise = null;
      reject(new Error('Falha ao carregar Google Maps API'));
    };

    document.head.appendChild(googleMapsScript);
  });

  return loadingPromise;
};

// Hook personalizado para usar Google Maps
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const useGoogleMaps = (apiKey: string = GOOGLE_MAPS_API_KEY) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => isGoogleMapsAvailable());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Função para inicializar o mapa
  const initializeMap = useCallback((
    container: HTMLElement,
    options: google.maps.MapOptions = {
      center: { lat: -23.5505, lng: -46.6333 },
      zoom: 13,
      mapTypeControl: true,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    }
  ): google.maps.Map | null => {
    if (!isLoaded || !window.google || !window.google.maps || !window.google.maps.Map) {
      console.warn('⚠️ Google Maps não está carregado ainda');
      return null;
    }

    // Verificação adicional para garantir que o construtor está disponível
    if (typeof window.google.maps.Map !== 'function') {
      console.warn('⚠️ Google Maps Map constructor não está disponível');
      return null;
    }

    try {
      const map = new window.google.maps.Map(container, options);
      console.log('🗺️ Mapa inicializado com sucesso');
      return map;
    } catch (error) {
      console.error('❌ Erro ao criar mapa:', error);
      setError('Erro ao criar mapa');
      return null;
    }
  }, [isLoaded]);

  // Carregar a API quando o hook é usado
  useEffect(() => {
    // Verificar se já está disponível
    if (isGoogleMapsAvailable()) {
      setIsLoaded(true);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Se já está carregado globalmente mas não localmente, atualizar estado
    if (isGoogleMapsLoaded && isGoogleMapsAvailable()) {
      setIsLoaded(true);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    loadGoogleMapsAPI(apiKey)
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
        setError(null);
      })
      .catch((error) => {
        console.error('❌ Erro no hook useGoogleMaps:', error);
        setError(error.message);
        setIsLoading(false);
        setIsLoaded(false);
      });
  }, [apiKey]);

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      // Não limpar o script global, apenas resetar estados locais se necessário
      if (error) {
        setError(null);
      }
    };
  }, [error]);

  return {
    isLoaded,
    isLoading,
    error,
    initializeMap,
    google: isLoaded ? window.google : null
  };
};

// Hook para criar marcadores
export const useGoogleMapsMarkers = () => {
  const createMarker = useCallback((
    map: google.maps.Map,
    options: google.maps.MarkerOptions
  ): google.maps.Marker | null => {
    if (!window.google || !map) {
      console.warn('⚠️ Google Maps ou mapa não disponível para criar marcador');
      return null;
    }

    try {
      const marker = new window.google.maps.Marker({
        map,
        animation: null, // Remove animações por padrão
        visible: true, // Sempre visível
        optimized: false, // Melhor controle sobre visibilidade
        ...options
      });
      return marker;
    } catch (error) {
      console.error('❌ Erro ao criar marcador:', error);
      return null;
    }
  }, []);

  const createInfoWindow = useCallback((
    content: string,
    options: Partial<google.maps.InfoWindowOptions> = {}
  ): google.maps.InfoWindow | null => {
    if (!window.google) {
      console.warn('⚠️ Google Maps não disponível para criar InfoWindow');
      return null;
    }

    try {
      return new window.google.maps.InfoWindow({
        content,
        ...options
      });
    } catch (error) {
      console.error('❌ Erro ao criar InfoWindow:', error);
      return null;
    }
  }, []);

  return {
    createMarker,
    createInfoWindow
  };
};

// Hook para criar rotas
export const useGoogleMapsDirections = () => {
  const createRoute = useCallback((
    map: google.maps.Map,
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral,
    options: Partial<google.maps.DirectionsRendererOptions> = {}
  ): Promise<{ distance: string; duration: string } | null> => {
    return new Promise((resolve) => {
      if (!window.google || !map) {
        console.warn('⚠️ Google Maps ou mapa não disponível para criar rota');
        resolve(null);
        return;
      }

      try {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          polylineOptions: {
            strokeColor: '#3B82F6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          },
          ...options
        });

        directionsRenderer.setMap(map);

        directionsService.route({
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        }, (result, status) => {
          if (status === 'OK' && result) {
            directionsRenderer.setDirections(result);
            const route = result.routes[0].legs[0];
            resolve({
              distance: route.distance?.text || 'N/A',
              duration: route.duration?.text || 'N/A'
            });
          } else {
            console.error('❌ Erro ao calcular rota:', status);
            resolve(null);
          }
        });
      } catch (error) {
        console.error('❌ Erro ao criar rota:', error);
        resolve(null);
      }
    });
  }, []);

  return {
    createRoute
  };
};

// Hook para geocodificação
export const useGoogleMapsGeocoding = () => {
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number, lng: number } | null> => {
    console.log(`🔍 Tentando geocodificar: ${address}`);

    // Primeiro, tentar usar o serviço do Google Maps se disponível
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });
        
        const location = result[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        console.log(`✅ Geocodificação via Google Maps: ${address} -> Lat: ${coords.lat}, Lng: ${coords.lng}`);
        return coords;
      } catch (error) {
        console.warn(`⚠️ Erro na geocodificação via Google Maps: ${error}`);
      }
    }

    // Fallback: usar coordenadas baseadas em padrões de endereço
    const fallbackCoords = getFallbackCoordinates(address);
    if (fallbackCoords) {
      console.log(`📍 Usando coordenadas de fallback para: ${address} -> Lat: ${fallbackCoords.lat}, Lng: ${fallbackCoords.lng}`);
      return fallbackCoords;
    }

    // Se tudo falhar, tentar a API REST como último recurso (com tratamento de erro melhorado)
    try {
      // Adicionar cidade/estado se não estiver presente para melhorar a precisão
      let fullAddress = address;
      if (!address.toLowerCase().includes('são paulo') && !address.toLowerCase().includes('sp')) {
        fullAddress = `${address}, São Paulo, SP, Brasil`;
      }
      
      const encoded = encodeURIComponent(fullAddress);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'OK' && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        console.log(`✅ Geocodificação via API REST: ${fullAddress} -> Lat: ${location.lat}, Lng: ${location.lng}`);
        return { lat: location.lat, lng: location.lng };
      } else if (result.status === 'OVER_QUERY_LIMIT') {
        console.warn(`⚠️ Limite de consultas excedido para: ${fullAddress}`);
      } else if (result.status === 'REQUEST_DENIED') {
        console.warn(`⚠️ Acesso negado à API de geocodificação. Verifique a chave da API.`);
      } else {
        console.warn(`⚠️ Geocodificação falhou: ${result.status} para endereço: ${fullAddress}`);
      }
    } catch (error) {
      console.warn(`⚠️ Erro na API REST de geocodificação: ${error}`);
    }
    
    // Último fallback: coordenadas padrão de São Paulo
    console.warn(`⚠️ Usando coordenadas padrão de São Paulo para: ${address}`);
    return { lat: -23.5505, lng: -46.6333 };
  }, []);

  // Função para obter coordenadas baseadas em padrões de endereço
  const getFallbackCoordinates = useCallback((address: string): { lat: number, lng: number } | null => {
    const addressLower = address.toLowerCase();
    
    // Padrões de bairros conhecidos em São Paulo
    const neighborhoods = {
      'centro': { lat: -23.5505, lng: -46.6333 },
      'vila madalena': { lat: -23.5446, lng: -46.6875 },
      'pinheiros': { lat: -23.5629, lng: -46.7006 },
      'moema': { lat: -23.6006, lng: -46.6634 },
      'itaim bibi': { lat: -23.5751, lng: -46.6742 },
      'jardins': { lat: -23.5677, lng: -46.6529 },
      'vila olimpia': { lat: -23.5955, lng: -46.6860 },
      'brooklin': { lat: -23.6134, lng: -46.6875 },
      'morumbi': { lat: -23.6181, lng: -46.7297 },
      'perdizes': { lat: -23.5364, lng: -46.6914 },
      'santana': { lat: -23.5077, lng: -46.6291 },
      'tatuape': { lat: -23.5397, lng: -46.5772 },
      'liberdade': { lat: -23.5587, lng: -46.6347 },
      'bela vista': { lat: -23.5587, lng: -46.6520 },
      'consolacao': { lat: -23.5587, lng: -46.6520 }
    };

    // Procurar por bairros conhecidos no endereço
    for (const [neighborhood, coords] of Object.entries(neighborhoods)) {
      if (addressLower.includes(neighborhood)) {
        return coords;
      }
    }

    // Padrões de CEP (primeiros 5 dígitos)
    const cepMatch = address.match(/(\d{5})-?\d{3}/);
    if (cepMatch) {
      const cepPrefix = cepMatch[1];
      const cepCoords = getCepCoordinates(cepPrefix);
      if (cepCoords) {
        return cepCoords;
      }
    }

    return null;
  }, []);

  // Função para obter coordenadas aproximadas baseadas no CEP
  const getCepCoordinates = useCallback((cepPrefix: string): { lat: number, lng: number } | null => {
    const cepRanges: { [key: string]: { lat: number, lng: number } } = {
      '01000': { lat: -23.5505, lng: -46.6333 }, // Centro
      '01300': { lat: -23.5587, lng: -46.6520 }, // Bela Vista
      '01400': { lat: -23.5587, lng: -46.6347 }, // Liberdade
      '04000': { lat: -23.6006, lng: -46.6634 }, // Moema
      '04500': { lat: -23.5751, lng: -46.6742 }, // Itaim Bibi
      '05400': { lat: -23.5446, lng: -46.6875 }, // Vila Madalena
      '05000': { lat: -23.5629, lng: -46.7006 }, // Pinheiros
      '02000': { lat: -23.5077, lng: -46.6291 }, // Santana
      '03000': { lat: -23.5397, lng: -46.5772 }, // Tatuapé
    };

    return cepRanges[cepPrefix] || null;
  }, []);

  return {
    geocodeAddress,
    getFallbackCoordinates
  };
};

export default useGoogleMaps;