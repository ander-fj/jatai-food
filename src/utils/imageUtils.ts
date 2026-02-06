/**
 * Converte URLs do Google Drive para formato direto de visualização
 * @param url - URL original do Google Drive
 * @returns URL convertida para visualização direta
 */
export const convertGoogleDriveUrl = (url: string): string => {
  console.log(`🔍 convertGoogleDriveUrl: Processando URL: "${url}"`);
  
  // Verificar se é uma URL do Google Drive
  if (!url.includes('drive.google.com')) {
    console.log(`ℹ️ convertGoogleDriveUrl: Não é URL do Google Drive, retornando original`);
    return url;
  }

  try {
    // Extrair o ID do arquivo da URL
    let fileId = null;
    
    // Padrão principal: /file/d/ID/view ou /file/d/ID/edit (melhorado)
    const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]{25,})/;
    const fileIdMatch = url.match(fileIdRegex);
    
    if (fileIdMatch && fileIdMatch[1]) {
      fileId = fileIdMatch[1];
      console.log(`✅ convertGoogleDriveUrl: ID extraído via /file/d/: "${fileId}"`);
    } else {
      // Padrão alternativo: open?id=ID
      const openIdRegex = /[?&]id=([a-zA-Z0-9_-]{25,})/;
      const openIdMatch = url.match(openIdRegex);
      
      if (openIdMatch && openIdMatch[1]) {
        fileId = openIdMatch[1];
        console.log(`✅ convertGoogleDriveUrl: ID extraído via open?id=: "${fileId}"`);
      }
    }
    
    if (fileId) {
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      console.log(`🔄 convertGoogleDriveUrl: Conversão realizada:`);
      console.log(`  📥 Original: ${url}`);
      console.log(`  📤 Convertida: ${directUrl}`);
      console.log(`  🆔 ID extraído: ${fileId}`);
      return directUrl;
    } else {
      console.warn(`⚠️ convertGoogleDriveUrl: Não foi possível extrair ID da URL: "${url}"`);
      return url;
    }
  } catch (error) {
    console.error(`❌ convertGoogleDriveUrl: Erro ao processar URL:`, error);
    return url;
  }
};

/**
 * Valida se uma URL é uma imagem válida
 * @param url - URL para validar
 * @returns Promise que resolve com true se a imagem for válida
 */
export const validateImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log(`🔍 validateImageUrl: Validando URL: "${url}"`);
    
    const img = new Image();
    
    img.onload = () => {
      console.log(`✅ validateImageUrl: Imagem válida: "${url}"`);
      resolve(true);
    };
    
    img.onerror = (error) => {
      console.log(`❌ validateImageUrl: Imagem inválida: "${url}"`, error);
      resolve(false);
    };
    
    // Timeout de 10 segundos para evitar travamento
    setTimeout(() => {
      console.log(`⏰ validateImageUrl: Timeout na validação da imagem: "${url}"`);
      resolve(false);
    }, 10000);
    
    img.src = url;
  });
};

/**
 * Obtém uma imagem padrão baseada no tipo de produto
 * @param type - Tipo do produto ('pizza' ou 'beverage')
 * @returns URL da imagem padrão
 */
export const getDefaultImage = (type: 'pizza' | 'beverage'): string => {
  if (type === 'pizza') {
    return 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';
  } else {
    return 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=400';
  }
};

/**
 * Processa URL de imagem aplicando conversões necessárias
 * @param url - URL original
 * @param type - Tipo do produto para fallback
 * @returns URL processada
 */
export const processImageUrl = (url: string, type: 'pizza' | 'beverage' = 'pizza'): string => {
  console.log(`🔄 processImageUrl: Iniciando processamento para tipo "${type}"`);
  console.log(`📥 processImageUrl: URL recebida: "${url}"`);
  
  if (!url || url.trim() === '') {
    const defaultImg = getDefaultImage(type);
    console.log(`📷 processImageUrl: URL vazia, usando imagem padrão: "${defaultImg}"`);
    return defaultImg;
  }
  
  // Limpar URL
  const cleanUrl = url.trim();
  console.log(`🧹 processImageUrl: URL limpa: "${cleanUrl}"`);
  
  // Converter URLs do Google Drive
  const processedUrl = convertGoogleDriveUrl(cleanUrl);
  
  // Log do resultado final
  if (processedUrl !== cleanUrl) {
    console.log(`🎯 processImageUrl: URL convertida com sucesso!`);
    console.log(`  📥 Original: ${cleanUrl}`);
    console.log(`  📤 Processada: ${processedUrl}`);
  } else {
    console.log(`ℹ️ processImageUrl: URL mantida sem alterações: "${processedUrl}"`);
  }
  
  return processedUrl;
};

/**
 * Testa especificamente a URL fornecida pelo usuário
 */
export const testSpecificGoogleDriveUrl = () => {
  const testUrl = 'https://drive.google.com/file/d/12GN_obpmV8V0Lg3HmLJPt4wEkawtMh_i/view?usp=drive_link';
  console.log(`🧪 Testando URL específica: ${testUrl}`);
  
  const result = convertGoogleDriveUrl(testUrl);
  console.log(`🎯 Resultado do teste: ${result}`);
  
  return result;
};