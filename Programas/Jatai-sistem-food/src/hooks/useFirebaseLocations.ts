// src/hooks/useFirebaseLocations.ts
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export const useFirebaseLocations = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);

  useEffect(() => {
    const locationRef = ref(database, 'locations');

    const unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: LocationData[] = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          latitude: value.latitude,
          longitude: value.longitude,
          timestamp: value.timestamp || 0
        }));
        setLocations(parsed);
      } else {
        setLocations([]);
      }
    });

    return () => unsubscribe(); // Cleanup ao desmontar
  }, []);

  return locations;
};
