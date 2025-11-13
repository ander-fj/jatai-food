import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../config/firebase";


interface LocationData {
  trackingCode: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export const useRealtimeLocations = () => {
  const [locations, setLocations] = useState<Record<string, LocationData>>({});

  useEffect(() => {
    const locationsRef = ref(database, "locations");

    const unsubscribe = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLocations(data);
      }
    });

    return () => unsubscribe();
  }, []);

  return { locations };
};
