import React from 'react';
import { useRealtimeLocations } from '../hooks/useLocationData';
import { useEntregadoresRealtime } from '../hooks/useEntregadoresRealtime';
import GoogleMapComponent from './GoogleMapComponent';

interface Staff {
  id: string;
  name: string;
  avatar?: string;
  status?: string;
}

interface DeliveryMapProps {
  deliveryStaff: Staff[];
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ deliveryStaff }) => {
  const { locations } = useRealtimeLocations();
  const entregadores = useEntregadoresRealtime();

  // Relacionar entregadores do Firebase com a equipe cadastrada
  const deliveryStaffWithLocation = deliveryStaff.map((staff) => {
    const match = entregadores.find(ent => ent.name.split(' ')[0].toLowerCase() === staff.name.split(' ')[0].toLowerCase());
    return {
      ...staff,
      lat: match?.lat || -23.5505,
      lng: match?.lng || -46.6333,
      status: match?.status || 'desconhecido',
    };
  });

  const markers = deliveryStaffWithLocation.map((staff) => ({
    id: staff.id,
    position: { lat: staff.lat, lng: staff.lng },
    title: staff.name,
    type: 'entregador',
    info: `Status: ${staff.status || 'Indefinido'}`
  }));

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <GoogleMapComponent 
        markers={markers}
        center={{ lat: -23.5505, lng: -46.6333 }}
        zoom={13}
        className="w-full h-full"
      />
    </div>
  );
};

export default DeliveryMap;
