import { createContext, useContext } from "react";

interface GoogleMapsContextType {
  isLoaded: boolean;
  isLoading: boolean;
  error?: any;
  google?: typeof google;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  isLoading: true,
  error: undefined,
  google: undefined,
});

export const useGoogleMapsContext = () => useContext(GoogleMapsContext);

export default GoogleMapsContext;
