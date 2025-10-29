import React, { useState } from 'react';
import { MapPin, Settings, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import LoginModal from './LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { storeName, storeAddress, storePhone, isLoggedIn, username, isAuthenticated } = useAuth();
  const { theme, iconProps } = useTheme();
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');

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
          background: theme.headerStyle === 'gradient' 
            ? `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`
            : theme.primaryColor
        }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:bg-black hover:bg-opacity-20 px-3 py-2 rounded-md transition-colors"
            style={{ fontFamily: theme.fontFamily }}
          >
            {theme.systemIcon ? (
              <img 
                src={theme.systemIcon} 
                alt="Logo" 
                className="h-6 w-6 system-icon"
                onError={(e) => {
                  // Fallback para ícone padrão se a imagem falhar
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallbackIcon = document.createElement('div');
                  fallbackIcon.innerHTML = '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
                  (e.target as HTMLImageElement).parentNode?.insertBefore(fallbackIcon, e.target);
                }}
              />
            ) : (
              <MapPin className="h-6 w-6" {...iconProps}/>
            )}
            {isAdminPage && (
              <h1 className="text-xl font-bold">{storeName || 'Sua Pizzaria'}</h1>
            )}
          </Link>
          <div className="flex items-center gap-4">
            {isAdminPage && (
              <div className="text-right text-sm" style={{ fontFamily: theme.fontFamily }}>
                <p>{storeAddress}</p>
                <p>{storePhone}</p>
              </div>
            )}
            {!isAdminPage && (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 bg-black bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-md transition-colors"
                style={{ fontFamily: theme.fontFamily }}
              >
                <Settings className="h-5 w-5" {...iconProps}/>
                <span className="hidden sm:inline"></span>
              </button>
            )}
            {isAdminPage && isLoggedIn && (
              <div className="text-xs text-white text-opacity-80" style={{ fontFamily: theme.fontFamily }}>
                Logado como: {username}
              </div>
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