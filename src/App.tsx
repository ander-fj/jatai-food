import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from "react";
import { useOrders } from './features/orders/hooks/useOrders';
import TrackingPage from './pages/TrackingPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import DeliveryStatusPage from './pages/DeliveryStatusPage';
import AdminPage from './pages/AdminPage';
import CustomerOrderPage from './pages/CustomerOrderPage';
import LocationStatusComponent from './components/LocationStatusComponent';
import WaiterPage from './pages/WaiterPage';
import ComandaPage from './pages/ComandaPage';
import KitchenDisplayPage from './pages/KitchenDisplayPage';
import ComandaHistoryPage from './pages/ComandaHistoryPage';
import { useAuth } from './hooks/useAuth';
import { startListeningToNewLocations } from "./utils/firebase-listener";

function App() {
  const { isLoggedIn, username, isAuthenticated } = useAuth();
  const { serviceFee } = useOrders();

  useEffect(() => {
    // Inicializar listeners do Firebase
    try {
      startListeningToNewLocations();
      console.log('✅ Firebase listeners inicializados');
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase listeners:', error);
    }
  }, []);

  // Cleanup global quando a aplicação é desmontada
  useEffect(() => {
    return () => {
      console.log('🧹 App: Cleanup global realizado');
    };
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<TrackingPage />} />
        <Route path="/pedido" element={<CustomerOrderPage />} />
        <Route path="/meus-pedidos" element={<OrderHistoryPage />} />
        <Route path="/cozinha" element={<KitchenDisplayPage />} />
        <Route path="/comanda/:comandaId" element={<ComandaPage />} />
        <Route path="/comandas" element={<ComandaHistoryPage />} />
        <Route path="/salao" element={<WaiterPage serviceFee={serviceFee} />} />
        <Route path="/delivery-status/:trackingCode" element={<DeliveryStatusPage />} />
        <Route 
          path="/location" 
          element={
            <div className="min-h-screen bg-gray-100 p-4">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">
                  Sistema de Localização - 6 Casas Decimais
                </h1>
                <LocationStatusComponent currentUserId="anderson_jatai_123" />
              </div>
            </div>
          } 
        />
        <Route 
          path="/admin" 
          element={
            isAuthenticated() ? (
              <Navigate to={`/admin/${username}`} replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/admin/:username" 
          element={
            <AdminPage />
          }
        />
        {/* Rota catch-all para páginas não encontradas */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-gray-600 mb-6">Página não encontrada</p>
                <a 
                  href="/" 
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Voltar ao Início
                </a>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
