import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Download, Upload, X, Coffee, Utensils, Sandwich, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
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

const MenuManagementSection: React.FC = () => {
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

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showGoogleSheetsImport, setShowGoogleSheetsImport] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [newItemType, setNewItemType] = useState<'pizza' | 'bebida' | 'lanche' | 'refeicao'>('pizza');
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  // Estados para controlar seções recolhidas
  const [collapsedSections, setCollapsedSections] = useState<{
    pizzasSalgadas: boolean;
    pizzasEspeciais: boolean;
    pizzasDoces: boolean;
    lanches: boolean;
    refeicoes: boolean;
    bebidas: boolean;
  }>({
    pizzasSalgadas: false,
    pizzasEspeciais: false,
    pizzasDoces: false,
    lanches: false,
    refeicoes: false,
    bebidas: false
  });

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

  // Filtrar itens por categoria
  const pizzasSalgadas = pizzaFlavors.filter(item => item.category === 'salgada');
  const pizzasEspeciais = pizzaFlavors.filter(item => item.category === 'especial');
  const pizzasDoces = pizzaFlavors.filter(item => item.category === 'doce');
  const lanches = pizzaFlavors.filter(item => item.category === 'lanche');
  const refeicoes = pizzaFlavors.filter(item => item.category === 'refeicao');

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
      category: pizza.category || 'salgada',
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
            category: editingItem.category
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
      if (newItem.type === 'pizza' || newItem.type === 'lanche' || newItem.type === 'refeicao') {
        await addPizzaFlavor({
          name: newItem.name,
          price: newItem.price,
          image: newItem.image,
          ingredients: newItem.ingredients,
          category: newItem.category
        });
      } else {
        const validSizes = newItem.sizes.filter(size => size.size.trim() && size.price > 0);
        if (validSizes.length === 0) {
          alert('Adicione pelo menos um tamanho válido para a bebida');
          return;
        }

        await addBeverage({
          name: newItem.name,
          sizes: validSizes,
          image: newItem.image,
          description: newItem.description
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

  // Função para obter as categorias baseadas no tipo
  const getCategoriesForType = (type: 'pizza' | 'bebida' | 'lanche' | 'refeicao') => {
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
  const getDefaultCategory = (type: 'pizza' | 'bebida' | 'lanche' | 'refeicao') => {
    switch (type) {
      case 'pizza':
        return 'salgada';
      case 'lanche':
        return 'lanche';
      case 'refeicao':
        return 'refeicao';
      case 'bebida':
      default:
        return '';
    }
  };

  // Atualizar categoria quando o tipo mudar
  const handleTypeChange = (type: 'pizza' | 'bebida' | 'lanche' | 'refeicao') => {
    setNewItem({
      ...newItem,
      type,
      category: getDefaultCategory(type)
    });
  };

  // Função para alternar seção recolhida
  const toggleSection = (section: keyof typeof collapsedSections) => {
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
    sectionKey: keyof typeof collapsedSections,
    handleEdit: (item: PizzaFlavor) => void,
    handleDelete: (id: string) => void
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
                    <p className="text-sm text-gray-600 mt-1">
                      {item.ingredients || 'Sem descrição'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span 
                        className="font-semibold"
                        style={{ color: theme.primaryColor }}
                      >
                        R$ {item.price.toFixed(2)}
                      </span>
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: theme.primaryColor + '20',
                          color: theme.primaryColor
                        }}
                      >
                        {item.category || 'salgada'}
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
                        handleDelete(item.id);
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
            className="flex items-center gap-2 text-white px-4 py-2 font-medium transition-colors"
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
        </div>
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
                value={newItem.type}
                onChange={(e) => handleTypeChange(e.target.value as 'pizza' | 'bebida' | 'lanche' | 'refeicao')}
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
                <option value="pizza">🍕 Pizza</option>
                <option value="lanche">🥪 Lanche</option>
                <option value="refeicao">🍽️ Refeição</option>
                <option value="bebida">🥤 Bebida</option>
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
            {newItem.type !== 'bebida' && (
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
            <div className={newItem.type !== 'bebida' ? 'md:col-span-2' : 'md:col-span-1'}>
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
            {newItem.type !== 'bebida' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
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
                  {getCategoriesForType(newItem.type).map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Imagem URL */}
            <div className={newItem.type !== 'bebida' ? 'md:col-span-1' : 'md:col-span-2'}>
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
            {newItem.type === 'bebida' && (
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
              disabled={!newItem.name.trim() || (newItem.type !== 'bebida' && newItem.price <= 0) || (newItem.type === 'bebida' && newItem.sizes.every(s => !s.size.trim() || s.price <= 0))}
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
              {editingItem.type !== 'bebida' && (
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
              <div className={editingItem.type !== 'bebida' ? 'md:col-span-2' : 'md:col-span-1'}>
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
              {editingItem.type !== 'bebida' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
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
                    {getCategoriesForType(editingItem.type).map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Imagem URL */}
              <div className={editingItem.type !== 'bebida' ? 'md:col-span-1' : 'md:col-span-2'}>
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
              {editingItem.type === 'bebida' && (
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
                disabled={!editingItem.name.trim() || (editingItem.type !== 'bebida' && editingItem.price <= 0) || (editingItem.type === 'bebida' && editingItem.sizes.every(s => !s.size.trim() || s.price <= 0))}
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
      {renderItemSection('Pizzas Salgadas', '🍕', pizzasSalgadas, 'pizzasSalgadas', handleEditPizza, deletePizzaFlavor)}
      {renderItemSection('Pizzas Especiais', '⭐', pizzasEspeciais, 'pizzasEspeciais', handleEditPizza, deletePizzaFlavor)}
      {renderItemSection('Pizzas Doces', '🍰', pizzasDoces, 'pizzasDoces', handleEditPizza, deletePizzaFlavor)}
      {renderItemSection('Lanches', '🥪', lanches, 'lanches', handleEditPizza, deletePizzaFlavor)}
      {renderItemSection('Refeições', '🍽️', refeicoes, 'refeicoes', handleEditPizza, deletePizzaFlavor)}

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
                      <p className="text-sm text-gray-600 mt-1">
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