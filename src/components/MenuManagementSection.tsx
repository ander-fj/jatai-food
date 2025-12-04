import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Download, Upload, X, Coffee, Utensils, Sandwich, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getTenantRef } from '../config/firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { useMenu } from '../features/orders/hooks/useMenu';
import ImageUploadModal from './ImageUploadModal';
import ExcelImport from './ExcelImport';
import GoogleSheetsImport from './GoogleSheetsImport';
import { processImageUrl } from '../utils/imageUtils';

interface PizzaFlavor {
  id: string;
  name: string;
  price: number;
  image?: string;
  ingredients?: string;
  category?: string;
  type?: string; // Adicionado para identificar o tipo do item
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

interface EditingItem {
  type: 'pizza' | 'bebida' | 'lanche' | 'refeicao';
  id: string;
  name: string;
  price: number;
  image: string;
  ingredients: string;
  category: string;
  sizes: BeverageSize[];
  description: string;
}

interface MenuManagementSectionProps {
  productTypes?: { id: string; name: string }[];
}

const MenuManagementSection: React.FC<MenuManagementSectionProps> = () => {
  const { theme } = useTheme();
  const { 
    pizzaFlavors, 
    beverages, 
    addPizzaFlavor, 
    addBeverage, 
    updatePizzaFlavor, 
    updateBeverage, 
    deletePizzaFlavor, 
    deleteBeverage 
  } = useMenu();

  // Estados para tipos e categorias dinâmicos
  const [productTypes, setProductTypes] = useState<{ id: string; name: string }[]>([]);
  const [productCategories, setProductCategories] = useState<{ id: string; name: string }[]>([]);

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showGoogleSheetsImport, setShowGoogleSheetsImport] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [newItemType, setNewItemType] = useState<'pizza' | 'bebida' | 'lanche' | 'refeicao'>('pizza');
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showClearMenuConfirm, setShowClearMenuConfirm] = useState(false);

  // Estados para controlar seções recolhidas
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Novo item sendo criado
  const [newItem, setNewItem] = useState<EditingItem>({
    type: 'pizza',
    id: '',
    name: '',
    price: 0,
    image: '',
    ingredients: '',
    category: 'salgada',
    sizes: [{ size: '', price: 0 }],
    description: ''
  });

  // Carregar tipos e categorias do Firebase
  useEffect(() => {
    const typesRef = getTenantRef('product_types');
    const categoriesRef = getTenantRef('product_categories');

    const unsubscribeTypes = onValue(typesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data ? Object.entries(data).map(([id, type]: any) => ({ id, name: type.name })) : [];
      setProductTypes(typesList);
    });

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      const categoriesList = data ? Object.entries(data).map(([id, cat]: any) => ({ id, name: cat.name })) : [];
      setProductCategories(categoriesList);
    });

    return () => {
      unsubscribeTypes();
      unsubscribeCategories();
    };
  }, []);


  const handleAddNewValue = async (entity: 'type' | 'category') => {
    const entityName = entity === 'type' ? 'tipo' : 'categoria';
    const newValue = prompt(`Digite o nome do novo ${entityName}:`);
    if (newValue && newValue.trim()) {
      const dbRef = getTenantRef(entity === 'type' ? 'product_types' : 'product_categories');
      await set(push(dbRef), { name: newValue.trim() });
    }
  };

  const handleEditValue = async (entity: 'type' | 'category', id: string, currentName: string) => {
    const entityName = entity === 'type' ? 'tipo' : 'categoria';
    const newValue = prompt(`Digite o novo nome para "${currentName}":`, currentName);
    if (newValue && newValue.trim() && newValue.trim() !== currentName) {
      const dbPath = entity === 'type' ? `product_types/${id}` : `product_categories/${id}`;
      const dbRef = getTenantRef(dbPath);
      await update(dbRef, { name: newValue.trim() });
      alert(`${entityName} atualizado com sucesso!`);
    }
  };

  const handleDeleteValue = async (entity: 'type' | 'category', id: string, name: string) => {
    const entityName = entity === 'type' ? 'tipo' : 'categoria';
    const isType = entity === 'type';

    // Verificar se o tipo/categoria está em uso
    const isUsed = pizzaFlavors.some(item => 
      isType ? item.type?.toLowerCase() === name.toLowerCase() : item.category?.toLowerCase() === name.toLowerCase()
    );

    if (isUsed) {
      alert(`Não é possível excluir o ${entityName} "${name}" pois ele está sendo utilizado em um ou mais itens do cardápio.`);
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o ${entityName} "${name}"?`)) {
      const dbPath = isType ? `product_types/${id}` : `product_categories/${id}`;
      const dbRef = getTenantRef(dbPath);
      await remove(dbRef);
      alert(`${entityName} excluído com sucesso!`);
    }
  };

  const handleClearMenu = async () => {
    try {
      // Apaga o nó 'menu' inteiro, limpando todos os itens (pizzas, bebidas, etc.)
      const menuRef = getTenantRef('menu');
      await set(menuRef, null);

      alert('✅ Cardápio limpo com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao limpar o cardápio:', error);
      alert('Ocorreu um erro ao limpar o cardápio. Tente novamente.');
    } finally {
      setShowClearMenuConfirm(false);
    }
  };


  const renderManageableList = (
    title: string,
    items: { id: string; name: string }[],
    onEdit: (id: string, name: string) => void,
    onDelete: (id: string, name: string) => void
  ) => (
    <div>
      <h4 className="font-semibold text-gray-800 mb-2">{title}</h4>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
            <span className="text-sm">{item.name}</span>
            <div className="flex gap-2">
              <button onClick={() => onEdit(item.id, item.name)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
              <button onClick={() => onDelete(item.id, item.name)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  // Função para obter as categorias baseadas no tipo
  const getCategoriesForType = (type: string) => {
    switch (type) {
      case 'pizza':
        return [
          { value: 'salgada', label: 'Salgada' },
          { value: 'doce', label: 'Doce' },
          { value: 'especial', label: 'Especial' }
        ];
      case 'lanche':
        return [
          { value: 'lanche', label: 'Lanche' }
        ];
      case 'refeicao':
        return [
          { value: 'refeicao', label: 'Refeição' }
        ];
      case 'bebida':
      default:
        return [];
    }
  };

  // Função para obter a categoria padrão baseada no tipo
  const getDefaultCategory = (type: string) => {
    switch (type) {
      case 'pizza': return 'salgada';
      case 'lanche': return 'lanche';
      case 'refeicao': return 'refeicao';
      default: return '';
    }
  };

  // Agrupar itens por categoria dinamicamente (igual à página do cliente)
  const menuSections = React.useMemo(() => {
    const sections = new Map<string, any[]>();
    pizzaFlavors.forEach(item => {
      const category = item.category || 'sem_categoria'; // Categoria padrão
      if (!sections.has(category)) {
        sections.set(category, []);
      }
      sections.get(category)?.push(item);
    });
    return sections;
  }, [pizzaFlavors]);

  // Inicializa o estado das seções recolhidas dinamicamente
  useEffect(() => {
    const initialCollapsedState: Record<string, boolean> = { bebidas: false };
    menuSections.forEach((_, key) => { initialCollapsedState[key] = false; });
    setCollapsedSections(initialCollapsedState);
  }, [menuSections]);

  const resetNewItem = () => {
    setNewItem({
      type: 'pizza',
      id: '',
      name: '',
      price: 0,
      image: '',
      ingredients: '',
      category: 'salgada',
      sizes: [{ size: '', price: 0 }],
      description: ''
    });
  };

  const handleEditPizza = (pizza: PizzaFlavor) => {
    setEditingItem({
      type: 'pizza',
      id: pizza.id,
      name: pizza.name,
      price: pizza.price,
      image: pizza.image || '',
      ingredients: pizza.ingredients || '',
      category: pizza.category || getDefaultCategory(pizza.type || 'pizza'),
      sizes: [],
      description: ''
    });
    setImagePreview(pizza.image || '');
  };

  const handleEditBeverage = (beverage: Beverage) => {
    setEditingItem({
      type: 'bebida',
      id: beverage.id,
      name: beverage.name,
      price: 0,
      image: beverage.image || '',
      ingredients: '',
      category: '',
      sizes: beverage.sizes || [{ size: '', price: 0 }],
      description: beverage.description || ''
    });
    setImagePreview(beverage.image || '');
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;

    try {
      if (editingItem.type === 'pizza' || editingItem.type === 'lanche' || editingItem.type === 'refeicao') {
        if (editingItem.id) {
          // Editando item existente
          await updatePizzaFlavor(editingItem.id, {
            name: editingItem.name,
            price: editingItem.price,
            image: editingItem.image,
            ingredients: editingItem.ingredients,
            category: editingItem.category
          });
        } else {
          // Criando novo item
          await addPizzaFlavor({
            name: editingItem.name,
            price: editingItem.price,
            image: editingItem.image,
            ingredients: editingItem.ingredients,
            category: editingItem.category,
            type: editingItem.type // Passa o tipo do item
          });
        }
      } else {
        // Bebida
        const validSizes = editingItem.sizes.filter(size => size.size.trim() && size.price > 0);
        if (validSizes.length === 0) {
          alert('Adicione pelo menos um tamanho válido para a bebida');
          return;
        }

        if (editingItem.id) {
          // Editando bebida existente
          await updateBeverage(editingItem.id, {
            name: editingItem.name,
            sizes: validSizes,
            image: editingItem.image,
            description: editingItem.description
          });
        } else {
          // Criando nova bebida
          await addBeverage({
            name: editingItem.name,
            sizes: validSizes,
            image: editingItem.image,
            description: editingItem.description
          });
        }
      }

      setEditingItem(null);
      setImagePreview('');
      alert('Item salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      alert('Erro ao salvar item. Tente novamente.');
    }
  };

  const handleSaveNewItem = async () => {
    try {
      if (newItem.type === 'bebida') {
        const validSizes = newItem.sizes.filter(size => size.size.trim() && size.price > 0);
        if (validSizes.length === 0) {
          alert(`Para o tipo "${newItem.type}", adicione pelo menos um tamanho com nome e preço válidos.`);
          return;
        }
        await addBeverage({
          name: newItem.name,
          sizes: validSizes,
          image: newItem.image,
          description: newItem.description,
        });
      } else {
        // Trata 'pizza', 'lanche', 'refeicao' e qualquer outro novo tipo como um item com preço único.
        await addPizzaFlavor({
          name: newItem.name,
          price: newItem.price,
          image: newItem.image,
          ingredients: newItem.ingredients,
          category: newItem.category,
          type: newItem.type, // Passa o tipo do item
        });
      }

      resetNewItem();
      setShowNewItemForm(false);
      alert('Item adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      alert('Erro ao adicionar item. Tente novamente.');
    }
  };

  const handleImageSelect = (imageUrl: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, image: imageUrl });
      setImagePreview(imageUrl);
    } else {
      setNewItem({ ...newItem, image: imageUrl });
    }
  };

  const addSizeToNewItem = () => {
    setNewItem({
      ...newItem,
      sizes: [...newItem.sizes, { size: '', price: 0 }]
    });
  };

  const removeSizeFromNewItem = (index: number) => {
    const newSizes = newItem.sizes.filter((_, i) => i !== index);
    setNewItem({
      ...newItem,
      sizes: newSizes.length > 0 ? newSizes : [{ size: '', price: 0 }]
    });
  };

  const updateNewItemSize = (index: number, field: 'size' | 'price', value: string | number) => {
    const newSizes = [...newItem.sizes];
    if (field === 'size') {
      newSizes[index].size = value as string;
    } else {
      newSizes[index].price = value as number;
    }
    setNewItem({ ...newItem, sizes: newSizes });
  };

  const addSizeToEditingItem = () => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      sizes: [...editingItem.sizes, { size: '', price: 0 }]
    });
  };

  const removeSizeFromEditingItem = (index: number) => {
    if (!editingItem) return;
    const newSizes = editingItem.sizes.filter((_, i) => i !== index);
    setEditingItem({
      ...editingItem,
      sizes: newSizes.length > 0 ? newSizes : [{ size: '', price: 0 }]
    });
  };

  const updateEditingItemSize = (index: number, field: 'size' | 'price', value: string | number) => {
    if (!editingItem) return;
    const newSizes = [...editingItem.sizes];
    if (field === 'size') {
      newSizes[index].size = value as string;
    } else {
      newSizes[index].price = value as number;
    }
    setEditingItem({ ...editingItem, sizes: newSizes });
  };

  // Atualizar categoria quando o tipo mudar
  const handleTypeChange = (type: string, category?: string) => {
    setNewItem({
      ...newItem,
      type,
      category: getDefaultCategory(type)
    });
  };

  // Combina tipos padrão com os tipos do Firebase, sem duplicatas
  const combinedProductTypes = React.useMemo(() => {
    const baseTypes = [{ name: 'pizza' }, { name: 'lanche' }, { name: 'refeicao' }, { name: 'bebida' }];
    const allTypes = [...baseTypes, ...productTypes];
    return allTypes.filter((type, index, self) => 
      index === self.findIndex((t) => t.name.toLowerCase() === type.name.toLowerCase())
    );
  }, [productTypes]);

  // Combina categorias padrão com as do Firebase, sem duplicatas
  // Agora, todas as categorias padrão serão sempre incluídas, independentemente do tipo.
  const combinedProductCategories = React.useMemo(() => {
    const allDefaultCategories = [
      { name: 'salgada', label: 'Salgada' },
      { name: 'doce', label: 'Doce' },
      { name: 'especial', label: 'Especial' },
      { name: 'lanche', label: 'Lanche' },
      { name: 'refeicao', label: 'Refeição' },
      { name: 'bebida', label: 'Bebida' }, // Adiciona bebida como categoria padrão
    ];
    const allCategories = [...allDefaultCategories, ...productCategories.map(c => ({ name: c.name, label: c.name }))];
    return allCategories.filter((cat, index, self) => 
      index === self.findIndex((c) => c.name.toLowerCase() === cat.name.toLowerCase())
    );
  }, [productCategories]);

  // Função para alternar seção recolhida
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Função para renderizar seção de itens
  const renderItemSection = (
    title: string,
    emoji: string,
    items: PizzaFlavor[],
    sectionKey: string,
    handleEdit: (item: PizzaFlavor) => void, // Mantém PizzaFlavor pois é a interface base para itens de preço único
    handleDelete: (id: string, itemType: string) => void // Modificado para aceitar o tipo do item
  ) => {
    if (items.length === 0) return null;

    return (
      <div 
        className="bg-white border border-gray-200 p-6 shadow-sm"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <h3 
            className="text-lg font-semibold flex items-center gap-2"
            style={{ 
              color: theme.textColor,
              fontFamily: theme.fontFamily
            }}
          >
            <span>{emoji}</span>
            {title} ({items.length})
          </h3>
          <button className="p-1 hover:bg-gray-100 rounded">
            {collapsedSections[sectionKey] ? (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
        
        {!collapsedSections[sectionKey] && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div 
                key={item.id}
                className="border border-gray-200 p-4 hover:shadow-md transition-shadow"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                }}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={processImageUrl(item.image || '', 'pizza')}
                    alt={item.name}
                    className="w-16 h-16 object-cover border border-gray-200"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';
                    }}
                  />
                  <div className="flex-1">
                    <h4 
                      className="font-medium"
                      style={{ 
                        color: theme.textColor,
                        fontFamily: theme.fontFamily
                      }}
                    >
                      {item.name}
                    </h4>
                    <p 
                      className="text-sm mt-1"
                      style={{ color: theme.secondaryTextColor }}
                    >
                      {item.ingredients || 'Sem descrição'}
                    </p>
                    <div className="mt-2">
                      {item.sizes && item.sizes.length > 0 ? (
                        <div className="space-y-1">
                          {item.sizes.map((size, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{size.size}</span>
                              <span className="font-semibold" style={{ color: theme.primaryColor }}>
                                {typeof size.price === 'number' ? `R$ ${size.price.toFixed(2)}` : 'Preço inválido'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold" style={{ color: theme.primaryColor }}>
                            {typeof item.price === 'number' ? `R$ ${item.price.toFixed(2)}` : 'Preço inválido'}
                          </span>
                        </div>
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: theme.primaryColor + '20',
                          color: theme.primaryColor
                        }}
                      >
                        {item.category || 'Sem Categoria'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este item?')) {
                        handleDelete(item.id, item.type || 'pizza'); // Passa o tipo do item para a função de exclusão
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 border border-red-600 hover:bg-red-50 transition-colors"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 
            className="text-2xl font-bold"
            style={{ 
              fontFamily: theme.fontFamily,
              color: theme.textColor
            }}
          >
            🍕 Gerenciar Cardápio
          </h2>
          <p 
            className="text-gray-600 mt-1"
            style={{ fontFamily: theme.fontFamily }}
          >
            Adicione, edite e organize os itens do seu cardápio
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExcelImport(true)}
            className="flex items-center gap-2 text-black px-4 py-2 font-medium transition-colors"
            style={{
              backgroundColor: theme.secondaryColor,
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Upload className="h-5 w-5" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowGoogleSheetsImport(true)}
            className="flex items-center gap-2 text-white px-4 py-2 font-medium transition-colors"
            style={{
              backgroundColor: theme.accentColor,
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Download className="h-5 w-5" />
            Google Sheets
          </button>
          <button
            onClick={() => setShowNewItemForm(true)}
            className="flex items-center gap-2 text-white px-4 py-2 font-medium transition-colors"
            style={{
              backgroundColor: theme.primaryColor,
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Plus className="h-5 w-5" />
            Novo Item
          </button>
          <button
            onClick={() => setShowClearMenuConfirm(true)}
            className="flex items-center gap-2 text-white px-4 py-2 font-medium transition-colors bg-red-600 hover:bg-red-700"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Trash2 className="h-5 w-5" />
            Limpar Cardápio
          </button>
         </div>
      </div>

      {/* Botão para Gerenciar Tipos e Categorias */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsManagingTypes(!isManagingTypes)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <Settings size={16} />
          {isManagingTypes ? 'Ocultar Gerenciador' : 'Gerenciar Tipos e Categorias'}
        </button>
      </div>

      {/* Formulário para Novo Item */}
      {showNewItemForm && (
        <div 
          className="bg-white border border-gray-200 p-6 shadow-sm"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 
              className="text-lg font-semibold"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              Adicionar Novo Item
            </h3>
            <button
              onClick={() => {
                setShowNewItemForm(false);
                resetNewItem();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={newItem.type || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'add_new') {
                    handleAddNewValue('type');
                  } else {
                    handleTypeChange(value as any);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily,
                  '--tw-ring-color': theme.primaryColor
                } as React.CSSProperties}
              >
                <option value="" disabled>Selecione um tipo</option>
                {combinedProductTypes.map(type => (
                  <option key={type.name} value={type.name}>{type.name}</option>
                ))}
                <option value="add_new" className="font-bold text-blue-600">
                  + Adicionar novo tipo...
                </option>
              </select>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder={
                  newItem.type === 'pizza' ? 'Ex: Margherita' :
                  newItem.type === 'lanche' ? 'Ex: X-Burger' :
                  newItem.type === 'refeicao' ? 'Ex: Prato Executivo' :
                  'Ex: Coca-Cola'
                }
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily,
                  '--tw-ring-color': theme.primaryColor
                } as React.CSSProperties}
              />
            </div>

            {/* Preço (para todos exceto bebidas) */}
            {['pizza', 'lanche', 'refeicao'].includes(newItem.type) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                  placeholder="45.90"
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                />
              </div>
            )}

            {/* Ingredientes/Descrição */}
            <div className={!['pizza', 'lanche', 'refeicao'].includes(newItem.type) ? 'md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newItem.type === 'bebida' ? 'Descrição' : 'Ingredientes'}
              </label>
              <textarea
                value={newItem.type === 'bebida' ? newItem.description : newItem.ingredients}
                onChange={(e) => {
                  if (newItem.type === 'bebida') {
                    setNewItem({ ...newItem, description: e.target.value });
                  } else {
                    setNewItem({ ...newItem, ingredients: e.target.value });
                  }
                }}
                placeholder={
                  newItem.type === 'pizza' ? 'Ex: Molho de tomate, mussarela, manjericão fresco' :
                  newItem.type === 'lanche' ? 'Ex: Pão, hambúrguer, queijo, alface, tomate' :
                  newItem.type === 'refeicao' ? 'Ex: Arroz, feijão, carne, salada, batata frita' :
                  'Ex: Refrigerante gelado e refrescante'
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent resize-none"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily,
                  '--tw-ring-color': theme.primaryColor
                } as React.CSSProperties}
              />
            </div>

            {/* Categoria (para todos exceto bebidas) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={newItem.category || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'add_new') {
                    handleAddNewValue('category');
                  } else {
                    setNewItem({ ...newItem, category: value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                                theme.borderRadius === 'sm' ? '0.125rem' :
                                theme.borderRadius === 'md' ? '0.375rem' :
                                theme.borderRadius === 'lg' ? '0.5rem' :
                                theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily,
                  '--tw-ring-color': theme.primaryColor
                } as React.CSSProperties}
              >
                <option value="" disabled>Selecione uma categoria</option>
                {combinedProductCategories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.label}
                  </option>
                ))}
                <option value="add_new" className="font-bold text-blue-600">
                  + Adicionar nova categoria...
                </option>
              </select>
            </div>

            {/* Imagem URL */}
            <div className={!['pizza', 'lanche', 'refeicao'].includes(newItem.type) ? 'md:col-span-2' : 'md:col-span-1'}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  placeholder="Cole a URL da imagem aqui (suporta Google Drive)"
                  className="flex-1 px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-50 transition-colors"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                  title="Abrir galeria de imagens"
                >
                  📁
                </button>
              </div>
              {newItem.image && (
                <div className="mt-2">
                  <img
                    src={processImageUrl(newItem.image, newItem.type === 'bebida' ? 'beverage' : 'pizza')}
                    alt="Preview"
                    className="w-20 h-20 object-cover border border-gray-200"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = newItem.type === 'bebida' 
                        ? 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=400'
                        : 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Tamanhos (apenas para bebidas) */}
            {!['pizza', 'lanche', 'refeicao'].includes(newItem.type) && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanhos e Preços
                </label>
                <div className="space-y-3">
                  {newItem.sizes.map((size, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={size.size}
                          onChange={(e) => updateNewItemSize(index, 'size', e.target.value)}
                          placeholder="Ex: 350ml"
                          className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                          style={{
                            borderRadius: theme.borderRadius === 'none' ? '0' :
                                         theme.borderRadius === 'sm' ? '0.125rem' :
                                         theme.borderRadius === 'md' ? '0.375rem' :
                                         theme.borderRadius === 'lg' ? '0.5rem' :
                                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                            fontFamily: theme.fontFamily,
                            '--tw-ring-color': theme.primaryColor
                          } as React.CSSProperties}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={size.price}
                          onChange={(e) => updateNewItemSize(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="5.90"
                          className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                          style={{
                            borderRadius: theme.borderRadius === 'none' ? '0' :
                                         theme.borderRadius === 'sm' ? '0.125rem' :
                                         theme.borderRadius === 'md' ? '0.375rem' :
                                         theme.borderRadius === 'lg' ? '0.5rem' :
                                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                            fontFamily: theme.fontFamily,
                            '--tw-ring-color': theme.primaryColor
                          } as React.CSSProperties}
                        />
                      </div>
                      {newItem.sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSizeFromNewItem(index)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSizeToNewItem}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Tamanho
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowNewItemForm(false);
                resetNewItem();
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNewItem}
              disabled={!newItem.name.trim() || (['pizza', 'lanche', 'refeicao'].includes(newItem.type) && newItem.price <= 0) || (!['pizza', 'lanche', 'refeicao'].includes(newItem.type) && newItem.sizes.every(s => !s.size.trim() || s.price <= 0))}
              className="px-4 py-2 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.primaryColor,
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            >
              Adicionar Item
            </button>
          </div>
        </div>
      )}

      {/* Seção para Gerenciar Tipos e Categorias */}
      {isManagingTypes && (
        <div 
          className="bg-white border border-gray-200 p-6 shadow-sm mt-6"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <h3 className="text-lg font-semibold mb-4">Gerenciar Tipos e Categorias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderManageableList('Tipos de Produto', productTypes, 
              (id, name) => handleEditValue('type', id, name),
              (id, name) => handleDeleteValue('type', id, name)
            )}
            {renderManageableList('Categorias de Produto', productCategories,
              (id, name) => handleEditValue('category', id, name),
              (id, name) => handleDeleteValue('category', id, name)
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="bg-white p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 
                className="text-xl font-semibold"
                style={{ 
                  color: theme.textColor,
                  fontFamily: theme.fontFamily
                }}
              >
                Editar {
                  editingItem.type === 'pizza' ? 'Pizza' :
                  editingItem.type === 'lanche' ? 'Lanche' :
                  editingItem.type === 'refeicao' ? 'Refeição' :
                  'Bebida'
                }
              </h3>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setImagePreview('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <input
                  type="text"
                  value={
                    editingItem.type === 'pizza' ? '🍕 Pizza' :
                    editingItem.type === 'lanche' ? '🥪 Lanche' :
                    editingItem.type === 'refeicao' ? '🍽️ Refeição' :
                    '🥤 Bebida'
                  }
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                />
              </div>

              {/* Preço (para todos exceto bebidas) */}
              {['pizza', 'lanche', 'refeicao'].includes(editingItem.type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily,
                      '--tw-ring-color': theme.primaryColor
                    } as React.CSSProperties}
                  />
                </div>
              )}

              {/* Ingredientes/Descrição */}
              <div className={!['pizza', 'lanche', 'refeicao'].includes(editingItem.type) ? 'md:col-span-1' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingItem.type === 'bebida' ? 'Descrição' : 'Ingredientes'}
                </label>
                <textarea
                  value={editingItem.type === 'bebida' ? editingItem.description : editingItem.ingredients}
                  onChange={(e) => {
                    if (editingItem.type === 'bebida') {
                      setEditingItem({ ...editingItem, description: e.target.value });
                    } else {
                      setEditingItem({ ...editingItem, ingredients: e.target.value });
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent resize-none"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                />
              </div>

              {/* Categoria (para todos exceto bebidas) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={editingItem.category || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'add_new') {
                      handleAddNewValue('category');
                    } else {
                      setEditingItem({ ...editingItem, category: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                  theme.borderRadius === 'sm' ? '0.125rem' :
                                  theme.borderRadius === 'md' ? '0.375rem' :
                                  theme.borderRadius === 'lg' ? '0.5rem' :
                                  theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                >
                  <option value="" disabled>Selecione uma categoria</option>
                  {combinedProductCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="add_new" className="font-bold text-blue-600">
                    + Adicionar nova categoria...
                  </option>
                </select>
              </div>

              {/* Imagem URL */}
              <div className={!['pizza', 'lanche', 'refeicao'].includes(editingItem.type) ? 'md:col-span-2' : 'md:col-span-1'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagem URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editingItem.image}
                    onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                    placeholder="Cole a URL da imagem aqui (suporta Google Drive)"
                    className="flex-1 px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily,
                      '--tw-ring-color': theme.primaryColor
                    } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageModal(true)}
                    className="px-3 py-2 border border-gray-300 hover:bg-gray-50 transition-colors"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily
                    }}
                    title="Abrir galeria de imagens"
                  >
                    📁
                  </button>
                </div>
                {editingItem.image && (
                  <div className="mt-2">
                    <img
                      src={processImageUrl(editingItem.image, editingItem.type === 'bebida' ? 'beverage' : 'pizza')}
                      alt="Preview"
                      className="w-20 h-20 object-cover border border-gray-200"
                      style={{
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = editingItem.type === 'bebida' 
                          ? 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=400'
                          : 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Tamanhos (apenas para bebidas) */}
              {!['pizza', 'lanche', 'refeicao'].includes(editingItem.type) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanhos e Preços
                  </label>
                  <div className="space-y-3">
                    {editingItem.sizes.map((size, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={size.size}
                            onChange={(e) => updateEditingItemSize(index, 'size', e.target.value)}
                            placeholder="Ex: 350ml"
                            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                            style={{
                              borderRadius: theme.borderRadius === 'none' ? '0' :
                                           theme.borderRadius === 'sm' ? '0.125rem' :
                                           theme.borderRadius === 'md' ? '0.375rem' :
                                           theme.borderRadius === 'lg' ? '0.5rem' :
                                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                              fontFamily: theme.fontFamily,
                              '--tw-ring-color': theme.primaryColor
                            } as React.CSSProperties}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={size.price}
                            onChange={(e) => updateEditingItemSize(index, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="5.90"
                            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                            style={{
                              borderRadius: theme.borderRadius === 'none' ? '0' :
                                           theme.borderRadius === 'sm' ? '0.125rem' :
                                           theme.borderRadius === 'md' ? '0.375rem' :
                                           theme.borderRadius === 'lg' ? '0.5rem' :
                                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                              fontFamily: theme.fontFamily,
                              '--tw-ring-color': theme.primaryColor
                            } as React.CSSProperties}
                          />
                        </div>
                        {editingItem.sizes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSizeFromEditingItem(index)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSizeToEditingItem}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Tamanho
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setImagePreview('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!editingItem.name.trim() || (['pizza', 'lanche', 'refeicao'].includes(editingItem.type) && editingItem.price <= 0) || (!['pizza', 'lanche', 'refeicao'].includes(editingItem.type) && editingItem.sizes.every(s => !s.size.trim() || s.price <= 0))}
                className="px-4 py-2 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.primaryColor,
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily
                }}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seções por Categoria */}
      {Array.from(menuSections.entries()).map(([category, items]) => 
        renderItemSection(
          category.replace(/_/g, ' '), // Formata o nome da categoria
          '🍴', // Ícone genérico, pode ser melhorado depois
          items, category, handleEditPizza, deletePizzaFlavor
        )
      )}

      {/* Lista de Bebidas */}
      {beverages.length > 0 && (
        <div 
          className="bg-white border border-gray-200 p-6 shadow-sm"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => toggleSection('bebidas')}
          >
            <h3 
              className="text-lg font-semibold flex items-center gap-2"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              <span>🥤</span>
              Bebidas ({beverages.length})
            </h3>
            <button className="p-1 hover:bg-gray-100 rounded">
              {collapsedSections.bebidas ? (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
          
          {!collapsedSections.bebidas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beverages.map((beverage) => (
                <div 
                  key={beverage.id}
                  className="border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={processImageUrl(beverage.image || '', 'beverage')}
                      alt={beverage.name}
                      className="w-16 h-16 object-cover border border-gray-200"
                      style={{
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=400';
                      }}
                    />
                    <div className="flex-1">
                      <h4 
                        className="font-medium"
                        style={{ 
                          color: theme.textColor,
                          fontFamily: theme.fontFamily
                        }}
                      >
                        {beverage.name}
                      </h4>
                      <p 
                        className="text-sm mt-1"
                        style={{ color: theme.secondaryTextColor }}
                      >
                        {beverage.description || 'Sem descrição'}
                      </p>
                      <div className="mt-2 space-y-1">
                        {beverage.sizes.map((size, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{size.size}</span>
                            <span 
                              className="font-semibold"
                              style={{ color: theme.primaryColor }}
                            >
                              R$ {size.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditBeverage(beverage)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors"
                      style={{
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                        fontFamily: theme.fontFamily
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta bebida?')) {
                          deleteBeverage(beverage.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 border border-red-600 hover:bg-red-50 transition-colors"
                      style={{
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                        fontFamily: theme.fontFamily
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {showImageModal && (
        <ImageUploadModal
          onClose={() => setShowImageModal(false)}
          onImageSelect={handleImageSelect}
        />
      )}

      {/* Modal de Confirmação para Limpar Cardápio */}
      {showClearMenuConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4 text-red-700">Atenção!</h3>
            <p className="mb-6">
              Você tem certeza que deseja <strong>excluir TODOS os itens</strong> do seu cardápio? 
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearMenuConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearMenu}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="inline h-4 w-4 mr-2" />
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {showExcelImport && (
        <ExcelImport
          onClose={() => setShowExcelImport(false)}
        />
      )}

      {showGoogleSheetsImport && (
        <GoogleSheetsImport
          onClose={() => setShowGoogleSheetsImport(false)}
        />
      )}
    </div>
  );
};

export default MenuManagementSection;