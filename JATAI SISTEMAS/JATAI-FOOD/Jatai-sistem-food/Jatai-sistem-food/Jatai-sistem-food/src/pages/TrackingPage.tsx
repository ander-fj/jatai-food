import React from 'react';
import { useState, useEffect } from 'react';
import { createTestOrder } from '../utils/createTestOrder';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TrackingForm from '../components/TrackingForm';
import TrackingInfo from '../components/TrackingInfo';
import { useTheme } from '../contexts/ThemeContext';

const TrackingPage: React.FC = () => {
  const { theme } = useTheme();
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Criar pedido de teste na primeira vez que a página carrega
  useEffect(() => {
    const createTestOrderOnce = async () => {
      try {
        // Verificar se já foram criados
        const testOrdersCreated = localStorage.getItem('testOrdersCreated');
        if (!testOrdersCreated) {
          await createTestOrder();
          localStorage.setItem('testOrdersCreated', 'true');
          console.log('✅ Pedidos de teste criados');
        }
      } catch (error) {
        console.error('❌ Erro ao criar pedidos de teste:', error);
      }
    };

    createTestOrderOnce();
  }, []);

  // Simular carregamento inicial da página
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsPageLoading(false);
    }, 200);

    return () => clearTimeout(loadingTimer);
  }, []);

  // Cleanup quando sair da página
  useEffect(() => {
    return () => {
      console.log('🧹 TrackingPage: Cleanup realizado');
    };
  }, []);

  // Mostrar loading se a página ainda está carregando
  if (isPageLoading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: theme.primaryColor }}
            ></div>
            <p 
              className="text-gray-600"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              Carregando página...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      <Header />
      <main 
        className="flex-1 container mx-auto px-4 py-8 max-w-md"
        style={{ fontFamily: theme.fontFamily }}
      >
        <TrackingForm />
        <TrackingInfo />
      </main>
      <Footer />
    </div>
  );
};

export default TrackingPage;