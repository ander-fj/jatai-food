import { useState, useEffect } from 'react';
import { get } from 'firebase/database';
import { getTenantRef } from '../config/firebase';

interface RestaurantConfig {
  name: string;
  address: string;
  phone: string;
}

export const useRestaurantConfig = () => {
  const [config, setConfig] = useState<RestaurantConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRestaurantConfig = async () => {
      try {
        setLoading(true);
        // Este ref busca a configuração do WhatsApp no nó 'whatsappConfig' do tenant atual.
        const configRef = getTenantRef('whatsappConfig');
        const snapshot = await get(configRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setConfig({
            name: data.restaurantName || '',
            address: data.address || data.restaurantName || '',
            phone: data.phone || data.restaurantName || '',
          });
        } else {
          // Se não houver configuração específica, podemos definir um padrão ou deixar nulo
          setConfig({
            name: '',
            address: '',
            phone: '',
          });
          console.warn('Nenhuma configuração de restaurante encontrada no Firebase em "whatsappConfig".');
        }
      } catch (e) {
        setError(e as Error);
        console.error('Erro ao buscar configuração do restaurante:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantConfig();
  }, []); // O array de dependências vazio garante que isso rode apenas uma vez.

  return {
    restaurantName: config?.name,
    restaurantAddress: config?.address,
    restaurantPhone: config?.phone,
    loading,
    error,
  };
};
