import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from "react";
import { useOrders } from './features/orders/hooks/useOrders';
import LocationStatusComponent from './components/LocationStatusComponent';

const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const DeliveryStatusPage = lazy(() => import('./pages/DeliveryStatusPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CustomerOrderPage = lazy(() => import('./pages/CustomerOrderPage'));
const WaiterPage = lazy(() => import('./pages/WaiterPage'));
const ComandaPage = lazy(() => import('./pages/ComandaPage'));
const KitchenDisplayPage = lazy(() => import('./pages/KitchenDisplayPage'));
const ComandaHistoryPage = lazy(() => import('./pages/ComandaHistoryPage'));
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
      <Suspense fallback={<div>Carregando...</div>}>
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
      </Suspense>
    </Router>
  );
}

export default App;
