import { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';

interface DeliveryStaffMember {
  id: string;
  name: string;
  avatar?: string;
  status?: string;
  orderCount?: number;
}

interface DeliveryStaffSearchResult {
  deliveryStaff: DeliveryStaffMember[];
  loading: boolean;
  error: string | null;
}

export const useDeliveryStaffSearch = (tenantId: string | null): DeliveryStaffSearchResult => {
  const [result, setResult] = useState<DeliveryStaffSearchResult>({
    deliveryStaff: [],
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!tenantId) {
      setResult({ deliveryStaff: [], loading: false, error: null });
      return;
    }

    const searchDeliveryStaff = async () => {
      setResult(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        console.log(`🔍 Buscando equipe do tenant: ${tenantId}`);
        const db = getDatabase();
        
        // Buscar equipe do tenant específico
        const equipeRef = ref(db, `tenants/${tenantId}/equipe`);
        const equipeSnapshot = await get(equipeRef);
        
        if (!equipeSnapshot.exists()) {
          console.log(`❌ Nenhuma equipe encontrada para o tenant ${tenantId}`);
          setResult({
            deliveryStaff: [],
            loading: false,
            error: null
          });
          return;
        }

        const equipeData = equipeSnapshot.val();
        const deliveryStaff: DeliveryStaffMember[] = Object.entries(equipeData).map(([id, staff]: [string, any]) => ({
          id,
          name: staff.name || 'Nome não informado',
          avatar: staff.avatar || '',
          status: staff.status || 'offline',
          orderCount: 0
        }));

        console.log(`✅ Equipe encontrada para tenant ${tenantId}:`, deliveryStaff.length, 'membros');
        
        setResult({
          deliveryStaff,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('❌ Erro ao buscar equipe:', error);
        setResult({
          deliveryStaff: [],
          loading: false,
          error: 'Erro ao buscar equipe de entregadores'
        });
      }
    };

    searchDeliveryStaff();
  }, [tenantId]);

  return result;
};