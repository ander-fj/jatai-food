import { useState, useEffect } from 'react';
import { getTenantRef } from '../../../config/firebase';
import { onValue, set, push } from 'firebase/database';

interface PizzaFlavor {
  id: string;
  name: string;
  price: number;
  image?: string;
  ingredients?: string;
  category?: string;
  isPromotion?: boolean;
  promotionPrice?: number;
}

interface BeverageSize {
  size: string;
  price: number;
}

interface Beverage {
  id: string;
  name: string;
  sizes: BeverageSize[];
  image?: string;
  description?: string;
}

export const useMenu = () => {
  const [pizzaFlavors, setPizzaFlavors] = useState<PizzaFlavor[]>([
    { 
      id: '1', 
      name: 'Margherita', 
      price: 45.90,
      ingredients: 'Molho de tomate, mussarela, manjericão fresco e azeite extravirgem',
      category: 'salgada'
    },
    { 
      id: '2', 
      name: 'Pepperoni', 
      price: 47.90,
      ingredients: 'Molho de tomate, mussarela e fatias generosas de pepperoni',
      category: 'salgada'
    },
    { 
      id: '3', 
      name: 'Portuguesa', 
      price: 47.90,
      ingredients: 'Molho de tomate, mussarela, presunto, ovos, cebola, azeitona e orégano',
      category: 'salgada'
    },
    { 
      id: '4', 
      name: '4 Queijos', 
      price: 49.90,
      ingredients: 'Molho branco, mussarela, provolone, parmesão e gorgonzola',
      category: 'especial'
    },
    { 
      id: '5', 
      name: 'Calabresa', 
      price: 46.90,
      ingredients: 'Molho de tomate, mussarela, calabresa fatiada e cebola',
      category: 'salgada'
    },
    { 
      id: '6', 
      name: 'Frango Catupiry', 
      price: 47.90,
      ingredients: 'Molho de tomate, mussarela, frango desfiado e catupiry original',
      category: 'salgada'
    }
  ]);

  const [beverages, setBeverages] = useState<Beverage[]>([
    { 
      id: '1', 
      name: 'Coca-Cola', 
      description: 'O refrigerante mais famoso do mundo, sempre gelado e refrescante',
      sizes: [
        { size: '350ml', price: 5.90 },
        { size: '600ml', price: 8.90 },
        { size: '1L', price: 10.90 },
        { size: '2L', price: 12.90 }
      ]
    },
    { 
      id: '2', 
      name: 'Guaraná', 
      description: 'Sabor brasileiro autêntico, refrescante e natural',
      sizes: [
        { size: '350ml', price: 5.90 },
        { size: '600ml', price: 8.90 },
        { size: '1L', price: 10.90 },
        { size: '2L', price: 11.90 }
      ]
    },
    { 
      id: '3', 
      name: 'Água Mineral', 
      description: 'Água pura e cristalina para sua hidratação',
      sizes: [
        { size: '500ml', price: 3.90 }
      ]
    }
  ]);

  // Carregar sabores de pizza do Firebase quando o componente inicializar
  useEffect(() => {
    const loadPizzaFlavors = () => {
    try {
      console.log('🔄 Carregando sabores de pizza do Firebase...');
      const pizzaFlavorsRef = getTenantRef('menu/pizzaFlavors');
      
      const unsubscribe = onValue(pizzaFlavorsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const flavorsList = Object.entries(data).map(([id, flavor]: any) => ({
            id,
            ...flavor,
          }));
          console.log('✅ Sabores carregados do Firebase:', flavorsList.length, flavorsList);
          setPizzaFlavors(flavorsList);
        } else {
          console.log('📝 Nenhum sabor personalizado encontrado, usando sabores padrão');
          // Salvar sabores padrão no Firebase na primeira vez
          saveDefaultFlavorsToFirebase();
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar sabores (usuário não autenticado):', error);
      // Manter sabores padrão se não conseguir acessar Firebase
    }
    };

    // Carregar inicialmente
    const cleanup = loadPizzaFlavors();

    // Listener para forçar refresh
    const handleForceRefresh = () => {
      console.log('🔄 Forçando refresh dos sabores de pizza...');
      if (cleanup) cleanup();
      setTimeout(loadPizzaFlavors, 100);
    };

    window.addEventListener('forceMenuRefresh', handleForceRefresh);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('forceMenuRefresh', handleForceRefresh);
    };
  }, []);

  // Carregar bebidas do Firebase quando o componente inicializar
  useEffect(() => {
    const loadBeverages = () => {
    try {
      console.log('🔄 Carregando bebidas do Firebase...');
      const beveragesRef = getTenantRef('menu/beverages');
      
      const unsubscribe = onValue(beveragesRef, (snapshot) => {
        const data = snapshot.val();
        console.log('🔍 Dados brutos do Firebase (beverages):', data);
        if (data) {
          const beveragesList = Object.entries(data).map(([id, beverage]: any) => ({
            id,
            ...beverage,
          }));
          console.log('✅ Bebidas carregadas do Firebase:', beveragesList.length);
          console.log('📋 Lista completa de bebidas:', beveragesList);
          beveragesList.forEach(beverage => {
            console.log(`  - ${beverage.name}: ${beverage.sizes?.length || 0} tamanhos | Imagem: ${beverage.image || 'SEM IMAGEM'}`);
          });
          setBeverages(beveragesList);
        } else {
          console.log('📝 Nenhuma bebida personalizada encontrada, usando bebidas padrão');
          // Salvar bebidas padrão no Firebase na primeira vez
          saveDefaultBeveragesToFirebase();
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar bebidas (usuário não autenticado):', error);
      // Manter bebidas padrão se não conseguir acessar Firebase
    }
    };

    // Carregar inicialmente
    const cleanup = loadBeverages();

    // Listener para forçar refresh
    const handleForceRefresh = () => {
      console.log('🔄 Forçando refresh das bebidas...');
      if (cleanup) cleanup();
      setTimeout(loadBeverages, 100);
    };

    window.addEventListener('forceMenuRefresh', handleForceRefresh);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('forceMenuRefresh', handleForceRefresh);
    };
  }, []);

  // Função para salvar sabores padrão no Firebase
  const saveDefaultFlavorsToFirebase = async () => {
    try {
      console.log('💾 Salvando sabores padrão no Firebase...');
      const pizzaFlavorsRef = getTenantRef('menu/pizzaFlavors');
      
      // Converter array para objeto com IDs como chaves
      const flavorsObject: { [key: string]: Omit<PizzaFlavor, 'id'> } = {};
      pizzaFlavors.forEach(flavor => {
        flavorsObject[flavor.id] = {
          name: flavor.name,
          price: flavor.price
        };
      });
      
      await set(pizzaFlavorsRef, flavorsObject);
      console.log('✅ Sabores padrão salvos no Firebase');
    } catch (error) {
      console.error('❌ Erro ao salvar sabores padrão:', error);
    }
  };

  // Função para salvar bebidas padrão no Firebase
  const saveDefaultBeveragesToFirebase = async () => {
    try {
      console.log('💾 Salvando bebidas padrão no Firebase...');
      const beveragesRef = getTenantRef('menu/beverages');
      
      // Converter array para objeto com IDs como chaves
      const beveragesObject: { [key: string]: Omit<Beverage, 'id'> } = {};
      beverages.forEach(beverage => {
        beveragesObject[beverage.id] = {
          name: beverage.name,
          sizes: beverage.sizes
        };
      });
      
      await set(beveragesRef, beveragesObject);
      console.log('✅ Bebidas padrão salvas no Firebase');
    } catch (error) {
      console.error('❌ Erro ao salvar bebidas padrão:', error);
    }
  };

  const addPizzaFlavor = async (flavor: { 
    name: string; 
    price: number; 
    image?: string; 
    ingredients?: string;
    category?: string;
    isPromotion?: boolean;
    promotionPrice?: number;
  }) => {
    try {
      console.log('🍕 Adicionando novo sabor de pizza:', flavor);
      
      // Gerar novo ID único baseado em timestamp
      const newId = `pizza_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newFlavor: PizzaFlavor = {
        id: newId,
        ...flavor,
        image: flavor.image || '',
        ingredients: flavor.ingredients || '',
        category: flavor.category || 'salgada',
        isPromotion: flavor.isPromotion || false,
        promotionPrice: flavor.promotionPrice || 0
      };

      // Salvar no Firebase
      const pizzaFlavorRef = getTenantRef(`menu/pizzaFlavors/${newId}`);
      await set(pizzaFlavorRef, {
        name: flavor.name,
        price: flavor.price,
        image: flavor.image || '',
        ingredients: flavor.ingredients || '',
        category: flavor.category || 'salgada',
        isPromotion: flavor.isPromotion || false,
        promotionPrice: flavor.promotionPrice || 0
      });

      // Atualizar estado local imediatamente
      setPizzaFlavors(prev => [...prev, newFlavor]);
      
      console.log('✅ Novo sabor adicionado com sucesso:', newFlavor);
      
      // Forçar re-render em todos os componentes que usam o menu
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menuUpdated', { 
          detail: { type: 'pizza', action: 'added', item: newFlavor } 
        }));
      }, 100);
    } catch (error) {
      console.error('❌ Erro ao adicionar sabor:', error);
      
      // Fallback: adicionar apenas localmente se Firebase falhar
      const newFlavor: PizzaFlavor = {
        id: `pizza_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...flavor,
        image: flavor.image || ''
      };
      setPizzaFlavors(prev => [...prev, newFlavor]);
    }
  };

  const addBeverage = async (beverage: { 
    name: string; 
    sizes: Array<{ size: string; price: number }>; 
    image?: string;
    description?: string;
  }) => {
    try {
      console.log('🥤 Adicionando nova bebida:', beverage);
      
      // Gerar novo ID único baseado em timestamp
      const newId = `beverage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newBeverage: Beverage = {
        id: newId,
        ...beverage,
        image: beverage.image || '',
        description: beverage.description || ''
      };

      // Salvar no Firebase
      const beverageRef = getTenantRef(`menu/beverages/${newId}`);
      await set(beverageRef, {
        name: beverage.name,
        sizes: beverage.sizes,
        image: beverage.image || '',
        description: beverage.description || ''
      });

      // Atualizar estado local imediatamente
      setBeverages(prev => [...prev, newBeverage]);
      
      console.log('✅ Nova bebida adicionada com sucesso:', newBeverage);
      
      // Forçar re-render em todos os componentes que usam o menu
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menuUpdated', { 
          detail: { type: 'beverage', action: 'added', item: newBeverage } 
        }));
      }, 100);
    } catch (error) {
      console.error('❌ Erro ao adicionar bebida:', error);
      
      // Fallback: adicionar apenas localmente se Firebase falhar
      const newBeverage: Beverage = {
        id: `beverage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...beverage,
        image: beverage.image || ''
      };
      setBeverages(prev => [...prev, newBeverage]);
    }
  };

  const updatePizzaFlavor = async (id: string, updatedFlavor: { 
    name: string; 
    price: number; 
    image?: string; 
    ingredients?: string;
    category?: string;
    isPromotion?: boolean;
    promotionPrice?: number;
  }) => {
    try {
      console.log('🍕 Atualizando sabor de pizza:', id, updatedFlavor);
      
      // Atualizar no Firebase
      const pizzaFlavorRef = getTenantRef(`menu/pizzaFlavors/${id}`);
      await set(pizzaFlavorRef, {
        name: updatedFlavor.name,
        price: updatedFlavor.price,
        image: updatedFlavor.image || '',
        ingredients: updatedFlavor.ingredients || '',
        category: updatedFlavor.category || 'salgada',
        isPromotion: updatedFlavor.isPromotion || false,
        promotionPrice: updatedFlavor.promotionPrice || 0
      });

      // Atualizar estado local
      setPizzaFlavors(prev => prev.map(flavor => 
        flavor.id === id 
          ? { ...flavor, ...updatedFlavor }
          : flavor
      ));
      
      console.log('✅ Sabor atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar sabor:', error);
      
      // Fallback: atualizar apenas localmente se Firebase falhar
      setPizzaFlavors(prev => prev.map(flavor => 
        flavor.id === id 
          ? { ...flavor, ...updatedFlavor }
          : flavor
      ));
    }
  };

  const deletePizzaFlavor = async (id: string) => {
    try {
      console.log('🍕 Excluindo sabor de pizza:', id);
      
      // Excluir do Firebase
      const pizzaFlavorRef = getTenantRef(`menu/pizzaFlavors/${id}`);
      await set(pizzaFlavorRef, null);

      // Atualizar estado local
      setPizzaFlavors(prev => prev.filter(flavor => flavor.id !== id));
      
      console.log('✅ Sabor excluído com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir sabor:', error);
      
      // Fallback: excluir apenas localmente se Firebase falhar
      setPizzaFlavors(prev => prev.filter(flavor => flavor.id !== id));
    }
  };

  const deleteBeverage = async (id: string) => {
    try {
      console.log('🥤 Excluindo bebida:', id);
      
      // Excluir do Firebase
      const beverageRef = getTenantRef(`menu/beverages/${id}`);
      await set(beverageRef, null);

      // Atualizar estado local
      setBeverages(prev => prev.filter(beverage => beverage.id !== id));
      
      console.log('✅ Bebida excluída com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir bebida:', error);
      
      // Fallback: excluir apenas localmente se Firebase falhar
      setBeverages(prev => prev.filter(beverage => beverage.id !== id));
    }
  };

  const updateBeverage = async (id: string, updatedBeverage: { 
    name: string; 
    sizes: Array<{ size: string; price: number }>; 
    image?: string;
    description?: string;
  }) => {
    try {
      console.log('🥤 Atualizando bebida:', id, updatedBeverage);
      
      // Atualizar no Firebase
      const beverageRef = getTenantRef(`menu/beverages/${id}`);
      await set(beverageRef, {
        name: updatedBeverage.name,
        sizes: updatedBeverage.sizes,
        image: updatedBeverage.image || '',
        description: updatedBeverage.description || ''
      });

      // Atualizar estado local
      setBeverages(prev => prev.map(beverage => 
        beverage.id === id 
          ? { ...beverage, ...updatedBeverage }
          : beverage
      ));
      
      console.log('✅ Bebida atualizada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar bebida:', error);
      
      // Fallback: atualizar apenas localmente se Firebase falhar
      setBeverages(prev => prev.map(beverage => 
        beverage.id === id 
          ? { ...beverage, ...updatedBeverage }
          : beverage
      ));
    }
  };
  return {
    pizzaFlavors,
    beverages,
    addPizzaFlavor,
    addBeverage,
    updatePizzaFlavor,
    updateBeverage,
    deletePizzaFlavor,
    deleteBeverage
  };
};