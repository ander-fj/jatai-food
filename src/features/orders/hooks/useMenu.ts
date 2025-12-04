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
  type?: string; // Adicionado para identificar o tipo do item (pizza, lanche, etc.)
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
  const [pizzaFlavors, setPizzaFlavors] = useState<PizzaFlavor[]>([]);
  const [beverages, setBeverages] = useState<Beverage[]>([]);

  useEffect(() => {
    try {
      console.log('🔄 Carregando dados do cardápio do Firebase...');

      // Listener único para a pasta 'menu'
      const menuRef = getTenantRef('menu');
      const unsubscribeMenu = onValue(menuRef, (snapshot) => {
        const data = snapshot.val();
        const loadedPizzas: PizzaFlavor[] = []; // Usado para todos os itens de preço único
        const loadedBeverages: Beverage[] = [];

        if (data) {
          // Iterar sobre todas as subcoleções dentro de 'menu'
          Object.entries(data).forEach(([collectionName, collectionData]: [string, any]) => {
            if (collectionData) {
              Object.entries(collectionData).forEach(([id, itemData]: [string, any]) => {
                // Determinar o tipo do item com base na estrutura
                if (itemData.sizes && Array.isArray(itemData.sizes)) {
                  // É uma bebida
                  loadedBeverages.push({ id, ...itemData });
                } else {
                  // É um item de preço único (pizza, lanche, refeicao, aromatizante, etc.)
                  loadedPizzas.push({ id, ...itemData });
                }
              });
            }
          });
          console.log('✅ Itens do cardápio carregados do Firebase.');
          setPizzaFlavors(loadedPizzas);
          setBeverages(loadedBeverages);
        } else {
          console.log('📝 Nenhum item encontrado no Firebase.');
          setPizzaFlavors([]);
          setBeverages([]);
        }
      });
      
      // Função de limpeza para desinscrever dos listeners
      return () => {
        unsubscribeMenu();
      };
    } catch (error) {
      console.error('❌ Erro ao configurar listeners do menu:', error);
    };
  }, []);

  // Modificado para aceitar o 'type' do item e salvar na coleção correta
  const addPizzaFlavor = async (flavor: {
    name: string; 
    price: number; 
    image?: string; 
    ingredients?: string;
    category?: string;
    type: string; // O tipo agora é obrigatório
    isPromotion?: boolean;
    promotionPrice?: number;
  }) => {
    try {
      const itemType = flavor.type || 'pizza'; // Usa o tipo passado ou 'pizza' como padrão
      const collectionName = `${itemType}Flavors`; // Ex: 'pizzaFlavors', 'lancheFlavors'
      console.log(`🍕 Adicionando novo item (${itemType}):`, flavor);
      
      // Gerar novo ID único baseado em timestamp
      const newId = `${itemType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newFlavor: PizzaFlavor = {
        id: newId,
        ...flavor,
        image: flavor.image || '',
        ingredients: flavor.ingredients || '',
        category: flavor.category || 'salgada',
        type: itemType, // Salva o tipo junto com o item
        isPromotion: flavor.isPromotion || false,
        promotionPrice: flavor.promotionPrice || 0
      };

      // Salvar no Firebase
      const itemRef = getTenantRef(`menu/${collectionName}/${newId}`);
      await set(itemRef, {
        name: flavor.name,
        price: flavor.price,
        image: flavor.image || '',
        ingredients: flavor.ingredients || '',
        category: flavor.category || 'salgada',
        isPromotion: flavor.isPromotion || false,
        promotionPrice: flavor.promotionPrice || 0,
        type: itemType // Garante que o tipo seja salvo no Firebase
      });

      // A atualização do estado local será feita pelo listener do useEffect
      // setPizzaFlavors(prev => [...prev, newFlavor]);
      
      console.log('✅ Novo item adicionado com sucesso:', newFlavor);
      
      // Forçar re-render em todos os componentes que usam o menu
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menuUpdated', { 
          detail: { type: itemType, action: 'added', item: newFlavor } 
        }));
      }, 100);
    } catch (error) {
      console.error('❌ Erro ao adicionar item:', error);
      
      // Fallback: adicionar apenas localmente se Firebase falhar (considerar remover este fallback para consistência)
      const newFlavor: PizzaFlavor = {
        id: `${flavor.type || 'item'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      const itemType = 'bebida';
      const collectionName = `${itemType}Flavors`;
      console.log('🥤 Adicionando nova bebida:', beverage);
      
      // Gerar novo ID único baseado em timestamp
      const newId = `${itemType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newBeverage: Beverage = {
        id: newId,
        ...beverage,
        image: beverage.image || '',
        description: beverage.description || ''
      };

      // Salvar no Firebase
      const itemRef = getTenantRef(`menu/${collectionName}/${newId}`);
      await set(itemRef, {
        name: beverage.name,
        sizes: beverage.sizes,
        image: beverage.image || '',
        description: beverage.description || '',
        type: itemType // Garante que o tipo seja salvo no Firebase
      });

      // A atualização do estado local será feita pelo listener do useEffect
      // setBeverages(prev => [...prev, newBeverage]);
      
      console.log('✅ Nova bebida adicionada com sucesso:', newBeverage);
      
      // Forçar re-render em todos os componentes que usam o menu
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menuUpdated', { 
          detail: { type: itemType, action: 'added', item: newBeverage } 
        }));
      }, 100);
    } catch (error) {
      console.error('❌ Erro ao adicionar bebida:', error);
      
      // Fallback: adicionar apenas localmente se Firebase falhar
      const newBeverage: Beverage = {
        id: `bebida_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...beverage,
        image: beverage.image || ''
      };
      setBeverages(prev => [...prev, newBeverage]);
    }
  };

  // Modificado para aceitar o 'type' do item e atualizar na coleção correta
  const updatePizzaFlavor = async (id: string, updatedFlavor: {
    name: string; 
    price: number; 
    image?: string; 
    ingredients?: string;
    category?: string;
    type: string; // O tipo agora é obrigatório
    isPromotion?: boolean;
    promotionPrice?: number;
  }) => {
    try {
      const itemType = updatedFlavor.type || 'pizza';
      const collectionName = `${itemType}Flavors`;
      console.log(`🍕 Atualizando item (${itemType}):`, id, updatedFlavor);
      
      // Atualizar no Firebase
      const itemRef = getTenantRef(`menu/${collectionName}/${id}`);
      await set(itemRef, {
        name: updatedFlavor.name,
        price: updatedFlavor.price,
        image: updatedFlavor.image || '',
        ingredients: updatedFlavor.ingredients || '',
        category: updatedFlavor.category || 'salgada',
        isPromotion: updatedFlavor.isPromotion || false,
        promotionPrice: updatedFlavor.promotionPrice || 0,
        type: itemType // Garante que o tipo seja salvo no Firebase
      });

      // A atualização do estado local será feita pelo listener do useEffect
      // setPizzaFlavors(prev => prev.map(flavor => 
      //   flavor.id === id 
      //     ? { ...flavor, ...updatedFlavor }
      //     : flavor
      // ));
      
      console.log('✅ Item atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar item:', error);
      
      // Fallback: atualizar apenas localmente se Firebase falhar
      setPizzaFlavors(prev => prev.map(flavor => 
        flavor.id === id 
          ? { ...flavor, ...updatedFlavor }
          : flavor
      ));
    }
  };

  // Modificado para aceitar o 'type' do item e excluir da coleção correta
  const deletePizzaFlavor = async (id: string, itemType: string) => { // Adicionado itemType
    try {
      const collectionName = `${itemType}Flavors`;
      console.log(`🍕 Excluindo item (${itemType}):`, id);
      
      // Excluir do Firebase
      const itemRef = getTenantRef(`menu/${collectionName}/${id}`);
      await set(itemRef, null);

      // A atualização do estado local será feita pelo listener do useEffect
      // setPizzaFlavors(prev => prev.filter(flavor => flavor.id !== id));
      
      console.log('✅ Item excluído com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir item:', error);
      
      // Fallback: excluir apenas localmente se Firebase falhar
      setPizzaFlavors(prev => prev.filter(flavor => flavor.id !== id));
    }
  };

  const deleteBeverage = async (id: string) => {
    try {
      const itemType = 'bebida';
      const collectionName = `${itemType}Flavors`;
      console.log('🥤 Excluindo bebida:', id);
      
      // Excluir do Firebase
      const itemRef = getTenantRef(`menu/${collectionName}/${id}`);
      await set(itemRef, null);

      // A atualização do estado local será feita pelo listener do useEffect
      // setBeverages(prev => prev.filter(beverage => beverage.id !== id));
      
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
      const itemType = 'bebida';
      const collectionName = `${itemType}Flavors`;
      console.log('🥤 Atualizando bebida:', id, updatedBeverage);
      
      // Atualizar no Firebase
      const itemRef = getTenantRef(`menu/${collectionName}/${id}`);
      await set(itemRef, {
        name: updatedBeverage.name,
        sizes: updatedBeverage.sizes,
        image: updatedBeverage.image || '',
        description: updatedBeverage.description || '',
        type: itemType // Garante que o tipo seja salvo no Firebase
      });

      // A atualização do estado local será feita pelo listener do useEffect
      // setBeverages(prev => prev.map(beverage => 
      //   beverage.id === id 
      //     ? { ...beverage, ...updatedBeverage }
      //     : beverage
      // ));
      
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
    pizzaFlavors, // Agora contém todos os itens de preço único (pizzas, lanches, etc.)
    beverages,
    addPizzaFlavor, // Agora aceita um parâmetro 'type'
    addBeverage,
    updatePizzaFlavor, // Agora aceita um parâmetro 'type'
    updateBeverage,
    deletePizzaFlavor, // Agora aceita um parâmetro 'itemType'
    deleteBeverage
  };
};