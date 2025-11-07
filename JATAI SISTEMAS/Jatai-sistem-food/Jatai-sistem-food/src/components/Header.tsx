import React, { useState } from 'react';
import { MapPin, Settings, ShoppingCart, Pizza } from 'lucide-react';
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
            <Pizza className="h-8 w-8" style={{ color: theme.secondaryColor || '#fff' }} />
            {isAdminPage && (
              <h1 className="text-xl font-bold">{storeName || 'Jatai - System Food'}</h1>
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