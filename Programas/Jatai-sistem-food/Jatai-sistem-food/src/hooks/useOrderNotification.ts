import { useEffect, useRef, useState } from 'react';
import { Order } from '../features/orders/types';

interface UseOrderNotificationProps {
  orders: Order[];
  getOrdersByStatus: () => {
    new: Order[];
    preparing: Order[];
    ready: Order[];
    next: Order[];
    delivering: Order[];
    delivered: Order[];
    cancelled: Order[];
  };
}

export const useOrderNotification = ({ orders, getOrdersByStatus }: UseOrderNotificationProps) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('orderNotificationSound');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const previousNewOrdersCount = useRef<number>(0);
  const isInitialized = useRef<boolean>(false);

  // Função simples para tocar som
  const playSound = () => {
    if (!soundEnabled) return;
    
    try {
      // Método 1: Tentar com arquivo de áudio embutido
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU3k9n1unEiBC13yO/eizEIHWq+8+OWT';
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Método 2: Fallback com Web Audio API
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          
          console.log('🔔 Som de notificação tocado');
        } catch (e) {
          console.log('Som não disponível');
        }
      });
    } catch (error) {
      console.log('Erro no som:', error);
    }
  };

  // Monitorar novos pedidos
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    try {
      const newOrders = getOrdersByStatus().new || [];
      const currentCount = newOrders.length;

      if (!isInitialized.current) {
        previousNewOrdersCount.current = currentCount;
        isInitialized.current = true;
        console.log(`📊 Inicializado com ${currentCount} pedidos novos`);
        return;
      }

      if (currentCount > previousNewOrdersCount.current) {
        const newOrdersAdded = currentCount - previousNewOrdersCount.current;
        console.log(`🔔 ${newOrdersAdded} novo(s) pedido(s) detectado(s)!`);
        playSound();
        
        // Notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🍕 Novo Pedido!', {
            body: `${newOrdersAdded} novo(s) pedido(s) recebido(s)`,
            icon: '/favicon.ico',
            tag: 'new-order'
          });
        }
      }

      previousNewOrdersCount.current = currentCount;
    } catch (error) {
      console.error('Erro no monitoramento de pedidos:', error);
    }
  }, [orders, soundEnabled, getOrdersByStatus]);

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('orderNotificationSound', JSON.stringify(newState));
    console.log(newState ? '🔊 Som ativado' : '🔇 Som desativado');
  };

  const testSound = () => {
    console.log('🧪 Testando som...');
    playSound();
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  return {
    soundEnabled,
    toggleSound,
    testSound,
    requestNotificationPermission
  };
};

