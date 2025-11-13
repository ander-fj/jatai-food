import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { storage } from '../config/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { convertGoogleDriveUrl } from '../utils/imageUtils';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  category: 'pizzas' | 'bebidas';
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  category
}) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar imagens existentes quando o modal abrir
  React.useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen, category]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const categoryRef = storageRef(storage, `menu-images/${category}`);
      const result = await listAll(categoryRef);
      
      const imageUrls = await Promise.all(
        result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return url;
        })
      );
      
      setImages(imageUrls);
    } catch (error) {
      const errorCode = (error as any).code;
      
      if (errorCode === 'storage/unauthorized') {
        console.warn('⚠️ Firebase Storage: Acesso não autorizado');
        console.warn('💡 Solução: Configure as regras do Firebase Storage');
        console.warn('📋 Regra sugerida: match /menu-images/{category}/{imageId} { allow read: if request.auth != null; }');
        
        // Set empty array silently - don't throw error
        setImages([]);
      } else if (errorCode === 'storage/object-not-found') {
        console.log('📁 Pasta de imagens não existe ainda, será criada no primeiro upload');
        setImages([]);
      } else {
        console.error('❌ Erro ao carregar imagens:', error);
        setImages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      // Criar referência única para o arquivo
      const fileName = `${Date.now()}_${file.name}`;
      const imageRef = storageRef(storage, `menu-images/${category}/${fileName}`);
      
      // Upload do arquivo
      const snapshot = await uploadBytes(imageRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Adicionar à lista de imagens
      setImages(prev => [...prev, downloadURL]);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      alert('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      if ((error as any).code === 'storage/unauthorized') {
        alert('Erro: Firebase Storage não configurado ou sem permissões. Configure as regras do Firebase Storage.');
      } else {
        alert('Erro ao fazer upload da imagem. Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };
  const handleAddImageUrl = async () => {
    if (!imageUrl.trim()) {
      alert('Por favor, insira uma URL válida');
      return;
    }

    // Processar URL (incluindo conversão do Google Drive)
    const processedUrl = convertGoogleDriveUrl(imageUrl.trim());
    
    // Validar se é uma URL de imagem válida ou Google Drive
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isImageUrl = imageExtensions.some(ext => 
      processedUrl.toLowerCase().includes(ext)
    );
    const isGoogleDrive = processedUrl.includes('drive.google.com/uc?export=view');
    const isDataUrl = processedUrl.includes('data:image/');

    if (!isImageUrl && !isGoogleDrive && !isDataUrl) {
      alert('Por favor, insira uma URL válida de imagem (jpg, png, gif, webp) ou link do Google Drive');
      return;
    }

    setAddingUrl(true);
    try {
      
      // Testar se a imagem carrega
      const img = new Image();
      img.onload = () => {
        // Adicionar à lista de imagens
        setImages(prev => [...prev, processedUrl]);
        setImageUrl('');
        alert('Imagem adicionada com sucesso!');
        setAddingUrl(false);
      };
      img.onerror = () => {
        alert('Erro ao carregar a imagem. Verifique se a URL está correta e se o arquivo do Google Drive está compartilhado publicamente.');
        setAddingUrl(false);
      };
      img.src = processedUrl;
    } catch (error) {
      console.error('Erro ao adicionar imagem por URL:', error);
      alert('Erro ao adicionar imagem. Tente novamente.');
      setAddingUrl(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta imagem?')) {
      return;
    }

    try {
      // Extrair o caminho da imagem do Firebase Storage
      let imagePath = '';
      try {
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
        if (pathMatch) {
          imagePath = decodeURIComponent(pathMatch[1]);
        }
      } catch (urlError) {
        console.log('URL externa, não é do Firebase Storage');
      }

      // Verificar permissões antes de deletar
      try {
        // Só deletar se for uma imagem do Firebase Storage
        if (imagePath.startsWith('menu-images/')) {
          const imageRef = storageRef(storage, imagePath);
          await deleteObject(imageRef);
        }
      } catch (deleteError: any) {
        if (deleteError.code === 'storage/unauthorized') {
          console.warn('Sem permissão para deletar imagens. Configure as regras do Firebase Storage.');
          return;
        }
        throw deleteError;
      }
      
      // Remover da lista
      setImages(prev => prev.filter(url => url !== imageUrl));
      
      alert('Imagem excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      // Remover da lista mesmo se houver erro no Firebase (para URLs externas)
      setImages(prev => prev.filter(url => url !== imageUrl));
      alert('Imagem removida da lista.');
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    onSelectImage(imageUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            Gerenciar Imagens - {category === 'pizzas' ? 'Pizzas' : 'Bebidas'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Adicione novas imagens para {category === 'pizzas' ? 'pizzas' : 'bebidas'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {/* Upload de Arquivo */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {uploading ? 'Enviando...' : 'Upload de Arquivo'}
                </button>
              </div>
              
              <div className="text-gray-400">ou</div>
              
              {/* URL de Imagem */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Cole a URL da imagem aqui"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
                  disabled={addingUrl}
                />
                <button
                  onClick={handleAddImageUrl}
                  disabled={addingUrl || !imageUrl.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  {addingUrl ? 'Adicionando...' : 'Adicionar URL'}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Upload: JPG, PNG, GIF (máximo 5MB) • URL: Link direto para imagem
            </p>
          </div>
        </div>

        {/* Images Grid */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Imagens Disponíveis ({images.length})
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Carregando imagens...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma imagem encontrada</p>
              <p className="text-gray-500 text-sm">Faça upload da primeira imagem</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleSelectImage(imageUrl)}
                    />
                  </div>
                  
                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        onClick={() => handleSelectImage(imageUrl)}
                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                        title="Selecionar imagem"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(imageUrl)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                        title="Excluir imagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;