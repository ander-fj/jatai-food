import React from 'react';
import { Pizza } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

const Footer: React.FC = () => {
  const { storeName, storeAddress, storePhone } = useAuth();
  const { iconProps } = useTheme();
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');

  // Remove o prefixo "Pizzaria Delícia - " do nome da loja
  const cleanStoreName = storeName?.replace("Pizzaria Delícia - ", "") || "";

  return (
    <footer className="bg-gray-800 text-white py-4 px-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        {cleanStoreName && <h2 className="text-lg font-bold mb-2 md:mb-0">{cleanStoreName}</h2>}
        <div className="text-center md:text-right text-sm">
          {storeAddress && <p>{storeAddress}</p>}
          {storePhone && <p>{storePhone}</p>}
        </div>
      </div>
      <div className="container mx-auto mt-4 text-center text-xs text-gray-400">
        <p>© 2025 {'Secontaf'}. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;