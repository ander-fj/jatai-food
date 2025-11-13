import { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';

interface TrackingSearchResult {
  order: Order | null;
  tenant: string | null;
  loading: boolean;
  error: string | null;
}

export const useTrackingSearch = (trackingCode: string | undefined): TrackingSearchResult => {
  const [result, setResult] = useState<TrackingSearchResult>({
    order: null,
    tenant: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!trackingCode) {
      setResult({ order: null, tenant: null, loading: false, error: null });
      return;
    }

    const searchOrder = async () => {
      setResult(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        console.log(`🔍 Buscando pedido com código: ${trackingCode}`);
        const db = getDatabase();
        
        
        // Primeiro, buscar todos os tenants
        const tenantsRef = ref(db, 'tenants');
        const tenantsSnapshot = await get(tenantsRef);
        
        if (!tenantsSnapshot.exists()) {
          console.log('❌ Nenhum tenant encontrado');
          setResult({
            order: null,
            tenant: null,
            loading: false,
            error: 'Nenhum dados encontrados no sistema'
          });
          return;
        }

        const tenantsData = tenantsSnapshot.val();
        console.log(`📋 Tenants encontrados: ${Object.keys(tenantsData).length}`);

        // Buscar APENAS em tenants/{tenant}/orders - NUNCA em customer-orders
        for (const tenantId of Object.keys(tenantsData)) {
          console.log(`🔍 Buscando no tenant: ${tenantId}`);
          
          const ordersRef = ref(db, `tenants/${tenantId}/orders`);
          const ordersSnapshot = await get(ordersRef);
          
          if (ordersSnapshot.exists()) {
            const ordersData = ordersSnapshot.val();
            
            // Buscar o pedido pelo trackingCode
            for (const [orderId, orderData] of Object.entries<any>(ordersData)) {
              if (orderData.trackingCode === trackingCode) {
                console.log(`✅ Pedido encontrado no tenant ${tenantId}`);
                setResult({ order: { id: orderId, ...orderData }, tenant: tenantId, loading: false, error: null });
                return;
              }
            }
          }
        }

        // Buscar em cada tenant
        // Se chegou até aqui, não encontrou o pedido
        console.log(`❌ Pedido com código ${trackingCode} não encontrado em nenhum tenant`);
        setResult({
          order: null,
          tenant: null,
          loading: false,
          error: `Pedido com código ${trackingCode} não encontrado`
        });

      } catch (error) {
        console.error('❌ Erro ao buscar pedido:', error);
        setResult({
          order: null,
          tenant: null,
          loading: false,
          error: 'Erro ao buscar pedido. Tente novamente.'
        });
      }
    };

    searchOrder();
  }, [trackingCode]);

  return result;
};