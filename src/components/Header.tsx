import React, { useState } from 'react';
import { MapPin, Settings, ShoppingCart, Pizza, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import LoginModal from './LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useRestaurantConfig } from '../hooks/useRestaurantConfig'; // Importar o hook de configuração

const Header: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isLoggedIn, username, isAuthenticated } = useAuth();
  const { restaurantName, welcomeMessage } = useRestaurantConfig(); // Usar o hook para obter o nome do restaurante
  const { theme, iconProps } = useTheme();
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');
  const isOrderPage = location.pathname.startsWith('/pedido');

  // Remove o prefixo "Pizzaria Delícia - " do nome do restaurante
  const displayName = restaurantName?.replace("Pizzaria Delícia - ", "") || "";

  // Debug para verificar estado de autenticação
  console.log('🔍 Header: Estado de autenticação', {
    isLoggedIn,
    username,
    isAuthenticated: isAuthenticated(),
    isAdminPage,
    pathname: location.pathname
  });
  return (
    <>
      <header 
        className="text-white py-3 px-4 theme-header"
        style={{
          fontFamily: theme.fontFamily,
          background: theme.headerStyle === 'gradient' 
            ? `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`
            : theme.primaryColor
        }}
      >
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-4 hover:bg-black hover:bg-opacity-20 px-3 py-2 rounded-md transition-colors"
          >
            <div className="flex flex-col items-center text-center">
              {theme.systemIcon ? (
                <img 
                  src={theme.systemIcon} 
                  alt="Logo" 
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <Pizza className="h-12 w-12" {...iconProps}/>
              )}
              {welcomeMessage && (
                <span className="text-xs mt-1 text-white opacity-90">{welcomeMessage}</span>
              )}
            </div>
          </Link>

          {/* Nome do Restaurante - Centralizado */}
          <div className="flex-grow text-center">
            <span className="text-5xl font-bold text-white">{displayName}</span>
          </div>

          {/* Botões e Informações do Usuário */}
          <div className="flex items-center gap-4">
            
            {!isAdminPage && !isOrderPage && (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 bg-black bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-md transition-colors"
              >
                <Settings className="h-5 w-5" {...iconProps}/>
              </button>
            )}
            
            {isAdminPage && (
              <Link to="/admin" className="flex items-center gap-2 bg-black bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-md transition-colors">
                  <Settings className="h-5 w-5" {...iconProps}/>
              </Link>
            )}
          </div>
        </div>
      </header>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
};

export default Header;