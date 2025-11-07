import React, { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle, File } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../features/orders/hooks/useMenu';
import { processImageUrl } from '../utils/imageUtils';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onClose: () => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { addPizzaFlavor, addBeverage } = useMenu();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    pizzasAdded: number;
    beveragesAdded: number;
  } | null>(null);

  // Criar template Excel
  const createTemplateExcel = () => {
    // Dados de exemplo para a planilha
    const templateData = [
      // Header
      ['Tipo', 'Nome', 'Preço', 'Ingredientes/Descrição', 'Categoria', 'Imagem URL', 'Tamanhos (Bebidas)', 'Preços Tamanhos'],
      
      // Pizzas de exemplo
      ['Pizza', 'Margherita Especial', 45.90, 'Molho de tomate artesanal, mussarela de búfala, manjericão fresco, azeite extravirgem', 'especial', 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', '', ''],
      ['Pizza', 'Pepperoni Premium', 47.90, 'Molho de tomate, mussarela, pepperoni importado, orégano', 'salgada', 'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg', '', ''],
      ['Pizza', 'Portuguesa Tradicional', 47.90, 'Molho de tomate, mussarela, presunto, ovos, cebola, azeitona preta, orégano', 'salgada', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg', '', ''],
      ['Pizza', 'Quatro Queijos Gourmet', 49.90, 'Molho branco, mussarela, provolone, parmesão, gorgonzola', 'especial', 'https://images.pexels.com/photos/365459/pexels-photo-365459.jpeg', '', ''],
      ['Pizza', 'Calabresa Artesanal', 46.90, 'Molho de tomate, mussarela, calabresa defumada, cebola roxa', 'salgada', 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg', '', ''],
      
      // Bebidas de exemplo
      ['Bebida', 'Coca-Cola Gelada', '', 'O refrigerante mais famoso do mundo, sempre gelado e refrescante', '', 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg', '350ml|600ml|1L|2L', '5.90|8.90|10.90|12.90'],
      ['Bebida', 'Guaraná Natural', '', 'Sabor brasileiro autêntico, refrescante e natural', '', 'https://images.pexels.com/photos/1571458/pexels-photo-1571458.jpeg', '350ml|600ml|1L|2L', '5.90|8.90|10.90|11.90'],
      ['Bebida', 'Água Mineral Cristalina', '', 'Água pura e cristalina para sua hidratação', '', 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg', '500ml', '3.90'],
      ['Bebida', 'Suco de Laranja Natural', '', 'Suco natural de laranja, rico em vitamina C', '', 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg', '300ml|500ml', '6.90|9.90'],
    ];

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Definir larguras das colunas
    ws['!cols'] = [
      { wch: 10 }, // Tipo
      { wch: 25 }, // Nome
      { wch: 10 }, // Preço
      { wch: 50 }, // Ingredientes/Descrição
      { wch: 12 }, // Categoria
      { wch: 40 }, // Imagem URL
      { wch: 20 }, // Tamanhos
      { wch: 20 }  // Preços Tamanhos
    ];

    // Gerar nome do arquivo com data atual
    const now = new Date();
    const fileName = `template_cardapio_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Cardápio');
    XLSX.writeFile(wb, fileName);
    
    console.log('✅ Template Excel criado:', fileName);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setImportResult({
        success: false,
        message: 'Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV (.csv)',
        pizzasAdded: 0,
        beveragesAdded: 0
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      console.log('🔄 Importando arquivo:', file.name);

      // Ler arquivo Excel/CSV
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Pegar primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Planilha vazia ou formato inválido');
      }

      // Pular header (primeira linha)
      const dataRows = jsonData.slice(1).filter((row: any) => row && row.length > 0);
      
      let pizzasAdded = 0;
      let beveragesAdded = 0;

      for (const row of dataRows) {
        const columns = row as any[];
        
        if (columns.length < 3) continue;

        const [tipo, nome, preco, descricao, categoria, imagemUrl, tamanhos, precosTamanhos] = columns;

        if (!nome || !tipo) continue;

        if (tipo.toString().toLowerCase() === 'pizza') {
          // Adicionar pizza
          const processedImageUrl = imagemUrl ? processImageUrl(imagemUrl.toString(), 'pizza') : '';
          console.log(`🍕 Adicionando pizza: ${nome}`);
          console.log(`  📸 Imagem original: ${imagemUrl || 'SEM IMAGEM'}`);
          console.log(`  📸 Imagem processada: ${processedImageUrl || 'SEM IMAGEM'}`);
          
          await addPizzaFlavor({
            name: nome.toString(),
            price: parseFloat(preco) || 0,
            image: processedImageUrl,
            ingredients: descricao?.toString() || '',
            category: categoria?.toString() || 'salgada'
          });
          pizzasAdded++;
        } else if (tipo.toString().toLowerCase() === 'bebida') {
          // Processar tamanhos e preços das bebidas
          const sizesArray = tamanhos ? tamanhos.toString().split('|') : ['500ml'];
          const pricesArray = precosTamanhos ? 
            precosTamanhos.toString().split('|').map((p: string) => parseFloat(p)) : 
            [parseFloat(preco) || 0];
          
          const sizes = sizesArray.map((size: string, index: number) => ({
            size: size.trim(),
            price: pricesArray[index] || pricesArray[0] || 0
          }));

          const processedImageUrl = imagemUrl ? processImageUrl(imagemUrl.toString(), 'beverage') : '';
          console.log(`🥤 Adicionando bebida: ${nome}`);
          console.log(`  📸 Imagem original: ${imagemUrl || 'SEM IMAGEM'}`);
          console.log(`  📸 Imagem processada: ${processedImageUrl || 'SEM IMAGEM'}`);
          
          await addBeverage({
            name: nome.toString(),
            sizes: sizes,
            image: processedImageUrl,
            description: descricao?.toString() || ''
          });
          beveragesAdded++;
        }
      }

      setImportResult({
        success: true,
        message: 'Importação concluída com sucesso!',
        pizzasAdded,
        beveragesAdded
      });

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Aguardar um pouco para garantir que o Firebase foi atualizado
      setTimeout(() => {
        console.log('🔄 Forçando atualização da página para mostrar novos itens...');
        // Disparar evento para forçar re-render
        window.dispatchEvent(new CustomEvent('forceMenuRefresh'));
        // Recarregar página como backup
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 500);
    } catch (error) {
      console.error('❌ Erro na importação:', error);
      setImportResult({
        success: false,
        message: `Erro na importação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        pizzasAdded: 0,
        beveragesAdded: 0
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FileSpreadsheet className="h-8 w-8" style={{ color: theme.primaryColor }} />
          <h2 
            className="text-2xl font-bold"
            style={{ 
              color: theme.textColor,
              fontFamily: theme.fontFamily
            }}
          >
            Importar do Excel
          </h2>
        </div>
        <p 
          className="text-gray-600"
          style={{ fontFamily: theme.fontFamily }}
        >
          Importe itens do cardápio de uma planilha Excel (.xlsx, .xls) ou CSV
        </p>
      </div>

      {/* Template Download */}
      <div 
        className="bg-blue-50 border border-blue-200 p-4"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-800 mb-2">
              1. Baixe o Template Excel
            </h3>
            <p className="text-blue-700 text-sm mb-3">
              Baixe nosso template Excel com exemplos de pizzas e bebidas para usar como base.
            </p>
            <button
              onClick={createTemplateExcel}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-medium transition-colors"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            >
              <Download className="h-4 w-4" />
              Baixar Template Excel
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div 
        className="bg-yellow-50 border border-yellow-200 p-4"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-2">
              2. Edite sua Planilha Excel
            </h3>
            <div className="text-yellow-700 text-sm space-y-2">
              <p>• Abra o template Excel baixado</p>
              <p>• Edite os dados conforme sua necessidade:</p>
              <div className="bg-yellow-100 p-3 rounded mt-2">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong>📋 Colunas Obrigatórias:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• <strong>Tipo:</strong> "Pizza" ou "Bebida"</li>
                      <li>• <strong>Nome:</strong> Nome do item</li>
                      <li>• <strong>Preço:</strong> Valor numérico</li>
                    </ul>
                  </div>
                  <div>
                    <strong>🍕 Para Pizzas:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• <strong>Ingredientes:</strong> Lista completa</li>
                      <li>• <strong>Categoria:</strong> salgada/doce/especial</li>
                      <li>• <strong>Imagem URL:</strong> Link da foto</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 text-xs">
                  <strong>🥤 Para Bebidas:</strong> Use "Tamanhos" separados por "|" (ex: 350ml|600ml) e "Preços Tamanhos" correspondentes (ex: 5.90|8.90)
                </div>
              </div>
              <p>• Salve o arquivo como Excel (.xlsx) ou CSV</p>
            </div>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div 
        className="bg-white border border-gray-200 p-6"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5" style={{ color: theme.primaryColor }} />
          <h3 
            className="font-semibold"
            style={{ 
              color: theme.textColor,
              fontFamily: theme.fontFamily
            }}
          >
            3. Importar Planilha Excel
          </h3>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 p-6 text-center">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4" style={{ fontFamily: theme.fontFamily }}>
              Arraste e solte seu arquivo Excel aqui ou clique para selecionar
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center justify-center gap-2 text-white px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
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
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Selecionar Arquivo Excel
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-3">
              Formatos aceitos: Excel (.xlsx, .xls) e CSV (.csv)
            </p>
          </div>
        </div>
      </div>

      {/* Result */}
      {importResult && (
        <div 
          className={`border p-4 ${
            importResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${
                importResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {importResult.message}
              </p>
              {importResult.success && (
                <div className="mt-2 text-sm text-green-700">
                  <p>🍕 {importResult.pizzasAdded} pizzas adicionadas</p>
                  <p>🥤 {importResult.beveragesAdded} bebidas adicionadas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default ExcelImport;