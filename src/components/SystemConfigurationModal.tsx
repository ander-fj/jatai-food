import React, { useState, useEffect } from 'react';
import { 
  X, 
  Palette, 
  Type, 
  Zap, 
  Layout, 
  RotateCcw, 
  Save,
  Eye,
  Monitor,
  Smartphone,
  Download,
  Upload,
  DollarSign,
  Percent,
  Bike
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getTenantRef } from '../config/firebase';
import { onValue, set } from 'firebase/database';

interface SystemConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SystemConfigurationModal: React.FC<SystemConfigurationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { theme, updateTheme, resetTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'layout' | 'fees' | 'animations'>('colors');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Estados para as taxas
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Carregar e salvar taxas no Firebase
  useEffect(() => {
    if (!isOpen) return;

    const feesConfigRef = getTenantRef('config/fees');
    const unsubscribe = onValue(feesConfigRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setServiceFee(data.serviceFee || 0);
        setDeliveryFee(data.deliveryFee || 0);
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  const saveFeesConfig = async () => {
    const feesConfigRef = getTenantRef('config/fees');
    const fees = {
      serviceFee: Number(serviceFee) || 0,
      deliveryFee: Number(deliveryFee) || 0,
    };
    await set(feesConfigRef, {
      ...fees,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem('app-fees', JSON.stringify(fees));
    window.dispatchEvent(new Event('fees-updated'));
    console.log('💰 Saved fees to Firebase and localStorage');
  };

  const colorPresets = [
    { name: 'Pizzaria Clássica', primary: '#DC2626', secondary: '#EA580C', accent: '#059669' },
    { name: 'Azul Moderno', primary: '#2563EB', secondary: '#3B82F6', accent: '#10B981' },
    { name: 'Verde Natural', primary: '#059669', secondary: '#10B981', accent: '#F59E0B' },
    { name: 'Roxo Elegante', primary: '#7C3AED', secondary: '#8B5CF6', accent: '#EC4899' },
    { name: 'Laranja Vibrante', primary: '#EA580C', secondary: '#FB923C', accent: '#06B6D4' },
    { name: 'Rosa Suave', primary: '#EC4899', secondary: '#F472B6', accent: '#8B5CF6' },
    { name: 'Escuro Vermelho', primary: '#991B1B', secondary: '#B91C1C', accent: '#059669', backgroundColor: '#1F2937', textColor: '#F9FAFB' },
    { name: 'Escuro Azul', primary: '#1E3A8A', secondary: '#1D4ED8', accent: '#10B981', backgroundColor: '#111827', textColor: '#F3F4F6' },
    { name: 'Escuro Verde', primary: '#064E3B', secondary: '#047857', accent: '#F59E0B', backgroundColor: '#1F2937', textColor: '#F9FAFB' },
    { name: 'Escuro Roxo', primary: '#581C87', secondary: '#6B21A8', accent: '#EC4899', backgroundColor: '#111827', textColor: '#F3F4F6' },
    { name: 'Escuro Laranja', primary: '#C2410C', secondary: '#EA580C', accent: '#06B6D4', backgroundColor: '#1F2937', textColor: '#F9FAFB' },
    { name: 'Escuro Rosa', primary: '#BE185D', secondary: '#DB2777', accent: '#8B5CF6', backgroundColor: '#111827', textColor: '#F3F4F6' },
    
    // Temas Especiais
    { name: 'Preto Total', primary: '#000000', secondary: '#1F1F1F', accent: '#FFFFFF', backgroundColor: '#000000', textColor: '#FFFFFF' },
    { name: 'Azul Profundo', primary: '#001F3F', secondary: '#003366', accent: '#0074D9', backgroundColor: '#000814', textColor: '#E6F3FF' },
    { name: 'Prata Elegante', primary: '#708090', secondary: '#A9A9A9', accent: '#C0C0C0', backgroundColor: '#2F2F2F', textColor: '#F5F5F5' },
    { name: 'Preto Cinza', primary: '#2C2C2C', secondary: '#404040', accent: '#808080', backgroundColor: '#1A1A1A', textColor: '#E5E5E5' },
    { name: 'Branco Puro', primary: '#FFFFFF', secondary: '#F8F9FA', accent: '#6C757D', backgroundColor: '#FFFFFF', textColor: '#212529' },
    
    // Clubes de Futebol Brasileiros
    { name: 'Flamengo', primary: '#E30613', secondary: '#000000', accent: '#FFD700', backgroundColor: '#1A0000', textColor: '#FFFFFF' },
    { name: 'Corinthians', primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700', backgroundColor: '#0D0D0D', textColor: '#FFFFFF' },
    { name: 'Palmeiras', primary: '#006B3F', secondary: '#FFFFFF', accent: '#FFD700', backgroundColor: '#003D24', textColor: '#FFFFFF' },
    { name: 'São Paulo', primary: '#FF0000', secondary: '#000000', accent: '#FFFFFF', backgroundColor: '#330000', textColor: '#FFFFFF' },
    { name: 'Santos', primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700', backgroundColor: '#0D0D0D', textColor: '#FFFFFF' },
    { name: 'Vasco', primary: '#000000', secondary: '#FFFFFF', accent: '#FF0000', backgroundColor: '#0D0D0D', textColor: '#FFFFFF' },
    { name: 'Grêmio', primary: '#0066CC', secondary: '#000000', accent: '#FFFFFF', backgroundColor: '#001A33', textColor: '#FFFFFF' },
    { name: 'Internacional', primary: '#D50000', secondary: '#FFFFFF', accent: '#FFD700', backgroundColor: '#330000', textColor: '#FFFFFF' },
    { name: 'Cruzeiro', primary: '#003399', secondary: '#FFFFFF', accent: '#FFD700', backgroundColor: '#001A4D', textColor: '#FFFFFF' },
    { name: 'Atlético-MG', primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700', backgroundColor: '#0D0D0D', textColor: '#FFFFFF' },
    { name: 'Fluminense', primary: '#8B0000', secondary: '#006400', accent: '#FFFFFF', backgroundColor: '#2D0000', textColor: '#FFFFFF' },
    { name: 'Botafogo', primary: '#000000', secondary: '#FFFFFF', accent: '#C0C0C0', backgroundColor: '#0D0D0D', textColor: '#FFFFFF' }
  ];

  const fontOptions = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Nunito', value: 'Nunito, sans-serif' }
  ];

  const exportConfig = () => {
    const config = JSON.stringify(theme, null, 2);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          updateTheme(config);
          alert('Configuração importada com sucesso!');
        } catch (error) {
          alert('Erro ao importar configuração. Verifique se o arquivo é válido.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSave = () => {
    saveFeesConfig();
    // Forçar re-aplicação do tema
    setTimeout(() => {
      const event = new CustomEvent('themeChanged', { detail: theme });
      window.dispatchEvent(event);
    }, 100);
    
    alert('Configurações salvas com sucesso!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Configuração do Sistema</h2>
                <p className="text-blue-100">Personalize a aparência da sua pizzaria</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportConfig}
                className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              <label className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                Importar
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                />
              </label>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <div className="space-y-2">
              {[
                { id: 'colors', label: 'Cores', icon: Palette },
                { id: 'typography', label: 'Tipografia', icon: Type },
                { id: 'layout', label: 'Layout', icon: Layout },
                { id: 'fees', label: 'Taxas', icon: DollarSign },
                { id: 'icons', label: 'Ícones', icon: Monitor },
                { id: 'animations', label: 'Animações', icon: Zap }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                     : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Preview Mode Toggle */}
            <div className="mt-8 pt-4 border-t border-gray-200">
             <p className="text-sm font-medium text-gray-800 mb-3">Modo de Visualização</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                    previewMode === 'desktop'
                      ? 'bg-blue-100 text-blue-700'
                     : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  <span className="text-xs">Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                    previewMode === 'mobile'
                      ? 'bg-blue-100 text-blue-700'
                     : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span className="text-xs">Mobile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Colors Tab */}
              {activeTab === 'colors' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Esquema de Cores</h3>
                    
                    {/* Color Presets */}
                    <div className="mb-8">
                      <h4 className="text-lg font-medium mb-4">Presets de Cores</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => updateTheme({
                              primaryColor: preset.primary,
                              secondaryColor: preset.secondary,
                              accentColor: preset.accent,
                              ...(preset.backgroundColor && { backgroundColor: preset.backgroundColor }),
                              ...(preset.textColor && { textColor: preset.textColor })
                            })}
                            className={`p-4 border rounded-lg hover:border-gray-300 transition-colors hover:shadow-md ${
                              preset.backgroundColor ? 'border-gray-600' : 'border-gray-200'
                            }`}
                            style={{
                              backgroundColor: preset.backgroundColor || '#ffffff',
                              color: preset.textColor || '#000000'
                            }}
                          >
                            <div className="flex gap-2 mb-2 justify-center">
                              <div 
                                className="w-6 h-6 rounded-full border border-gray-200"
                                style={{ backgroundColor: preset.primary }}
                              ></div>
                              <div 
                                className="w-6 h-6 rounded-full border border-gray-200"
                                style={{ backgroundColor: preset.secondary }}
                              ></div>
                              <div 
                                className="w-6 h-6 rounded-full border border-gray-200"
                                style={{ backgroundColor: preset.accent }}
                              ></div>
                            </div>
                            <p className="text-sm font-medium">{preset.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor Primária
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.primaryColor}
                            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.primaryColor}
                            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#DC2626"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor Secundária
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.secondaryColor}
                            onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.secondaryColor}
                            onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#EA580C"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor de Destaque
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.accentColor}
                            onChange={(e) => updateTheme({ accentColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.accentColor}
                            onChange={(e) => updateTheme({ accentColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#059669"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor de Fundo
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.backgroundColor}
                            onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.backgroundColor}
                            onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#F3F4F6"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor dos Cabeçalhos
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.headerTextColor || '#FFFFFF'}
                            onChange={(e) => updateTheme({ headerTextColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.headerTextColor || '#FFFFFF'}
                            onChange={(e) => updateTheme({ headerTextColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#FFFFFF"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor dos Textos Secundários
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.secondaryTextColor || '#6B7280'}
                            onChange={(e) => updateTheme({ secondaryTextColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.secondaryTextColor || '#6B7280'}
                            onChange={(e) => updateTheme({ secondaryTextColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#6B7280"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Live Color Preview */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium mb-3">Prévia das Cores</h4>
                      <div className="flex gap-4 items-center">
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          Primária
                        </div>
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: theme.secondaryColor }}
                        >
                          Secundária
                        </div>
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: theme.accentColor }}
                        >
                          Destaque
                        </div>
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md border border-gray-300 flex items-center justify-center text-gray-700 font-bold"
                          style={{ backgroundColor: theme.backgroundColor }}
                        >
                          Fundo
                        </div>
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md border border-gray-300 flex items-center justify-center font-bold"
                          style={{ 
                            backgroundColor: theme.backgroundColor,
                            color: theme.headerTextColor || '#FFFFFF'
                          }}
                        >
                          Header
                        </div>
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md border border-gray-300 flex items-center justify-center font-bold"
                          style={{ 
                            backgroundColor: theme.backgroundColor,
                            color: theme.secondaryTextColor || '#6B7280'
                          }}
                        >
                          Texto
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Typography Tab */}
              {activeTab === 'typography' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Tipografia</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Família da Fonte
                        </label>
                        <select
                          value={theme.fontFamily}
                          onChange={(e) => updateTheme({ fontFamily: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {fontOptions.map((font) => (
                            <option key={font.name} value={font.value}>
                              {font.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tamanho da Fonte
                        </label>
                        <select
                          value={theme.fontSize}
                          onChange={(e) => updateTheme({ fontSize: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="xs">Extra Pequeno</option>
                          <option value="sm">Pequeno</option>
                          <option value="base">Normal</option>
                          <option value="lg">Grande</option>
                          <option value="xl">Extra Grande</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor do Texto Principal
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.textColor}
                            onChange={(e) => updateTheme({ textColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.textColor}
                            onChange={(e) => updateTheme({ textColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#111827"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cor dos Cabeçalhos
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={theme.headerTextColor || '#FFFFFF'}
                            onChange={(e) => updateTheme({ headerTextColor: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme.headerTextColor || '#FFFFFF'}
                            onChange={(e) => updateTheme({ headerTextColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="#FFFFFF"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Font Preview */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium mb-3">Prévia da Fonte</h4>
                      <div 
                        style={{ 
                          fontFamily: theme.fontFamily,
                          fontSize: theme.fontSize === 'xs' ? '0.75rem' :
                                   theme.fontSize === 'sm' ? '0.875rem' :
                                   theme.fontSize === 'base' ? '1rem' :
                                   theme.fontSize === 'lg' ? '1.125rem' : '1.25rem'
                        }}
                      >
                        <h1 className="text-2xl font-bold mb-2">Pizzaria Delícia</h1>
                        <p className="mb-2">Este é um exemplo de como o texto aparecerá no sistema.</p>
                        <p className="text-sm text-gray-600">Texto menor para descrições e detalhes.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Layout Tab */}
              {activeTab === 'layout' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Layout e Estilo</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estilo do Header
                        </label>
                        <select
                          value={theme.headerStyle}
                          onChange={(e) => updateTheme({ headerStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="gradient">Gradiente</option>
                          <option value="solid">Sólido</option>
                          <option value="transparent">Transparente</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estilo dos Botões
                        </label>
                        <select
                          value={theme.buttonStyle}
                          onChange={(e) => updateTheme({ buttonStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="rounded">Arredondado</option>
                          <option value="square">Quadrado</option>
                          <option value="pill">Pílula</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estilo dos Cards
                        </label>
                        <select
                          value={theme.cardStyle}
                          onChange={(e) => updateTheme({ cardStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="shadow">Com Sombra</option>
                          <option value="border">Com Borda</option>
                          <option value="flat">Plano</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Raio das Bordas
                        </label>
                        <select
                          value={theme.borderRadius}
                          onChange={(e) => updateTheme({ borderRadius: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Sem Arredondamento</option>
                          <option value="sm">Pequeno</option>
                          <option value="md">Médio</option>
                          <option value="lg">Grande</option>
                          <option value="xl">Extra Grande</option>
                          <option value="full">Totalmente Arredondado</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Espaçamento
                        </label>
                        <select
                          value={theme.spacing}
                          onChange={(e) => updateTheme({ spacing: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="tight">Compacto</option>
                          <option value="normal">Normal</option>
                          <option value="loose">Espaçoso</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estilo dos Ícones
                        </label>
                        <select
                          value={theme.iconStyle}
                          onChange={(e) => updateTheme({ iconStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="outline">Contorno</option>
                          <option value="filled">Preenchido</option>
                          <option value="rounded">Arredondado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fees Tab */}
              {activeTab === 'fees' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Taxas e Entregas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Taxa de Serviço */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taxa de Serviço (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={serviceFee}
                            onChange={(e) => setServiceFee(parseFloat(e.target.value) || 0)}
                            className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 10"
                            min="0"
                            max="100"
                          />
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Taxa percentual aplicada sobre o valor total do pedido para consumo no local.</p>
                      </div>

                      {/* Taxa de Entrega */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taxa de Entrega (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={deliveryFee}
                            onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                            className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 5"
                          />
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Taxa percentual aplicada sobre o valor total do pedido para entregas.</p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={saveFeesConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        <Save className="h-4 w-4" />
                        Salvar Taxas
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Animations Tab */}
              {activeTab === 'animations' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Animações e Transições</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Velocidade das Animações
                        </label>
                        <select
                          value={theme.animationSpeed}
                          onChange={(e) => updateTheme({ animationSpeed: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="slow">Lenta (500ms)</option>
                          <option value="normal">Normal (300ms)</option>
                          <option value="fast">Rápida (150ms)</option>
                        </select>
                      </div>
                    </div>

                    {/* Animation Preview */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium mb-3">Prévia das Animações</h4>
                      <div className="flex gap-4">
                        <button 
                          className="px-4 py-2 text-white rounded-lg transition-all transform hover:scale-105"
                          style={{
                            backgroundColor: theme.primaryColor,
                            borderRadius: theme.borderRadius === 'none' ? '0' :
                                         theme.borderRadius === 'sm' ? '0.125rem' :
                                         theme.borderRadius === 'md' ? '0.375rem' :
                                         theme.borderRadius === 'lg' ? '0.5rem' :
                                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                            fontFamily: theme.fontFamily,
                            transitionDuration: theme.animationSpeed === 'slow' ? '500ms' :
                                              theme.animationSpeed === 'normal' ? '300ms' : '150ms'
                          }}
                        >
                          Botão Animado
                        </button>
                        <div 
                          className="w-16 h-16 rounded-lg animate-pulse"
                          style={{
                            background: `linear-gradient(45deg, ${theme.primaryColor}, ${theme.accentColor})`,
                            animationDuration: theme.animationSpeed === 'slow' ? '3s' :
                                              theme.animationSpeed === 'normal' ? '2s' : '1s'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Icons Tab */}
              {activeTab === 'icons' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Ícones do Sistema</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ícone Principal (Favicon)
                        </label>
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={theme.systemIcon || ''}
                            onChange={(e) => updateTheme({ systemIcon: e.target.value })}
                            placeholder="https://exemplo.com/icone.png"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500">
                            URL do ícone que aparecerá na aba do navegador e como logo
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estilo dos Ícones
                        </label>
                        <select
                          value={theme.iconStyle}
                          onChange={(e) => updateTheme({ iconStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="outline">Contorno</option>
                          <option value="filled">Preenchido</option>
                          <option value="rounded">Arredondado</option>
                        </select>
                      </div>
                    </div>

                    {/* Icon Preview */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium mb-3">Prévia do Ícone</h4>
                      <div className="flex items-center gap-4">
                        {theme.systemIcon ? (
                          <div className="flex items-center gap-4">
                            <img 
                              src={theme.systemIcon} 
                              alt="Ícone do sistema"
                             className="w-16 h-16 border border-gray-200 rounded-full"
                              style={{
                               objectFit: 'cover'
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <p className="font-medium">Ícone Personalizado</p>
                              <p className="text-sm text-gray-600">Este ícone aparecerá na aba do navegador</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-16 h-16 bg-gray-200 flex items-center justify-center"
                              style={{
                                borderRadius: theme.borderRadius === 'none' ? '0' :
                                             theme.borderRadius === 'sm' ? '0.125rem' :
                                             theme.borderRadius === 'md' ? '0.375rem' :
                                             theme.borderRadius === 'lg' ? '0.5rem' :
                                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                              }}
                            >
                              <Monitor className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Ícone Padrão</p>
                              <p className="text-sm text-gray-500">Adicione uma URL para personalizar</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="w-80 bg-gray-50 border-l border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-700">Prévia ao Vivo</h4>
              <Eye className="h-5 w-5 text-gray-500" />
            </div>
            
            <div 
              className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
              }`}
              style={{ 
                transform: previewMode === 'mobile' ? 'scale(0.8)' : 'scale(1)',
                transformOrigin: 'top center'
              }}
            >
              {/* Preview Header */}
              <div 
                className="p-4 text-white"
                style={{
                  background: theme.headerStyle === 'gradient' 
                    ? `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`
                    : theme.primaryColor
                }}
              >
                <h1 
                  className="text-lg font-bold"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  Sua Pizzaria
                </h1>
              </div>

              {/* Preview Content */}
              <div className="p-4 space-y-4">
                <div 
                  className={`p-3 bg-white ${
                    theme.cardStyle === 'shadow' ? 'shadow-md' :
                    theme.cardStyle === 'border' ? 'border border-gray-200' : ''
                  }`}
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                  }}
                >
                  <h3 
                    className="font-semibold mb-2"
                    style={{ 
                      fontFamily: theme.fontFamily,
                      color: theme.textColor
                    }}
                  >
                    Pizza Margherita
                  </h3>
                  <p 
                    className="text-sm text-gray-600 mb-3"
                    style={{ fontFamily: theme.fontFamily }}
                  >
                    Molho de tomate, mussarela e manjericão
                  </p>
                  <button
                    className="px-4 py-2 text-white font-medium transition-all"
                    style={{
                      backgroundColor: theme.secondaryColor,
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily,
                      transitionDuration: theme.animationSpeed === 'slow' ? '500ms' :
                                        theme.animationSpeed === 'normal' ? '300ms' : '150ms'
                    }}
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>

                {/* Color indicators */}
                <div className="flex gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.primaryColor }}
                  ></div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.secondaryColor }}
                  ></div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.accentColor }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={resetTheme}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrão
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Save className="h-4 w-4" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigurationModal;