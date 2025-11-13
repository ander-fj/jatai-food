import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../features/orders/hooks/useMenu';

interface GoogleSheetsImportProps {
  onClose: () => void;
}

const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { addPizzaFlavor, addBeverage } = useMenu();
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    pizzasAdded: number;
    beveragesAdded: number;
  } | null>(null);

  // Template da planilha
  const templateUrl = 'https://docs.google.com/spreadsheets/d/1example/edit#gid=0';
  
  const createTemplateSheet = () => {
    // Dados de exemplo para a planilha
    const templateData = [
      // Header
      ['Tipo', 'Nome', 'Preço', 'Ingredientes/Descrição', 'Categoria', 'Imagem URL', 'Tamanhos (Bebidas)', 'Preços Tamanhos'],
      
      // Pizzas de exemplo
      ['Pizza', 'Margherita Especial', '45.90', 'Molho de tomate artesanal, mussarela de búfala, manjericão fresco, azeite extravirgem', 'especial', 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', '', ''],
      ['Pizza', 'Pepperoni Premium', '47.90', 'Molho de tomate, mussarela, pepperoni importado, orégano', 'salgada', 'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg', '', ''],
      ['Pizza', 'Portuguesa Tradicional', '47.90', 'Molho de tomate, mussarela, presunto, ovos, cebola, azeitona preta, orégano', 'salgada', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg', '', ''],
      ['Pizza', 'Quatro Queijos Gourmet', '49.90', 'Molho branco, mussarela, provolone, parmesão, gorgonzola', 'especial', 'https://images.pexels.com/photos/365459/pexels-photo-365459.jpeg', '', ''],
      ['Pizza', 'Calabresa Artesanal', '46.90', 'Molho de tomate, mussarela, calabresa defumada, cebola roxa', 'salgada', 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg', '', ''],
      
      // Bebidas de exemplo
      ['Bebida', 'Coca-Cola Gelada', '', 'O refrigerante mais famoso do mundo, sempre gelado e refrescante', '', 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg', '350ml|600ml|1L|2L', '5.90|8.90|10.90|12.90'],
      ['Bebida', 'Guaraná Natural', '', 'Sabor brasileiro autêntico, refrescante e natural', '', 'https://images.pexels.com/photos/1571458/pexels-photo-1571458.jpeg', '350ml|600ml|1L|2L', '5.90|8.90|10.90|11.90'],
      ['Bebida', 'Água Mineral Cristalina', '', 'Água pura e cristalina para sua hidratação', '', 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg', '500ml', '3.90'],
      ['Bebida', 'Suco de Laranja Natural', '', 'Suco natural de laranja, rico em vitamina C', '', 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg', '300ml|500ml', '6.90|9.90'],
    ];

    // Converter para CSV
    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_cardapio.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromSheets = async () => {
    if (!sheetsUrl.trim()) {
      setImportResult({
        success: false,
        message: 'Por favor, insira a URL da planilha do Google Sheets',
        pizzasAdded: 0,
        beveragesAdded: 0
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Converter URL do Google Sheets para formato CSV
      let csvUrl = sheetsUrl;
      
      // Se for URL do Google Sheets, converter para CSV
      if (sheetsUrl.includes('docs.google.com/spreadsheets')) {
        const sheetId = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (sheetId) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        }
      }

      console.log('🔄 Importando de:', csvUrl);

      // Fazer requisição para obter os dados
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao acessar planilha: ${response.status}`);
      }

      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      if (lines.length < 2) {
        throw new Error('Planilha vazia ou formato inválido');
      }

      // Pular header (primeira linha)
      const dataLines = lines.slice(1).filter(line => line.trim());
      
      let pizzasAdded = 0;
      let beveragesAdded = 0;

      for (const line of dataLines) {
        // Parse CSV line (considerando aspas)
        const columns = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());
        
        if (columns.length < 3) continue;

        const [tipo, nome, preco, descricao, categoria, imagemUrl, tamanhos, precosTamanhos] = columns;

        if (!nome || !tipo) continue;

        if (tipo.toLowerCase() === 'pizza') {
          // Adicionar pizza
          await addPizzaFlavor({
            name: nome,
            price: parseFloat(preco) || 0,
            image: imagemUrl || '',
            ingredients: descricao || '',
            category: categoria || 'salgada'
          });
          pizzasAdded++;
        } else if (tipo.toLowerCase() === 'bebida') {
          // Processar tamanhos e preços das bebidas
          const sizesArray = tamanhos ? tamanhos.split('|') : ['500ml'];
          const pricesArray = precosTamanhos ? precosTamanhos.split('|').map(p => parseFloat(p)) : [parseFloat(preco) || 0];
          
          const sizes = sizesArray.map((size, index) => ({
            size: size.trim(),
            price: pricesArray[index] || pricesArray[0] || 0
          }));

          await addBeverage({
            name: nome,
            sizes: sizes,
            image: imagemUrl || '',
            description: descricao || ''
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

      // Forçar atualização da página para mostrar novos itens
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
            Importar do Google Sheets
          </h2>
        </div>
        <p 
          className="text-gray-600"
          style={{ fontFamily: theme.fontFamily }}
        >
          Importe itens do cardápio diretamente de uma planilha do Google Sheets
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
              1. Baixe o Template
            </h3>
            <p className="text-blue-700 text-sm mb-3">
              Baixe nosso template com exemplos de pizzas e bebidas para usar como base.
            </p>
            <button
              onClick={createTemplateSheet}
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
              Baixar Template CSV
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
              2. Crie sua Planilha no Google Sheets
            </h3>
            <div className="text-yellow-700 text-sm space-y-2">
              <p>• Abra o Google Sheets e crie uma nova planilha</p>
              <p>• Importe o template CSV baixado ou copie a estrutura:</p>
              <div className="bg-yellow-100 p-2 rounded mt-2 font-mono text-xs">
                <strong>Colunas:</strong> Tipo | Nome | Preço | Ingredientes/Descrição | Categoria | Imagem URL | Tamanhos | Preços Tamanhos
              </div>
              <p>• <strong>Para Pizzas:</strong> Tipo = "Pizza", preencha Nome, Preço, Ingredientes, Categoria</p>
              <p>• <strong>Para Bebidas:</strong> Tipo = "Bebida", use Tamanhos separados por "|" (ex: 350ml|600ml)</p>
              <p>• <strong>Compartilhe</strong> a planilha como "Qualquer pessoa com o link pode visualizar"</p>
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
            3. Importar Planilha
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL da Planilha do Google Sheets
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
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
              disabled={importing}
            />
            <p className="text-xs text-gray-500 mt-1">
              Cole aqui o link da sua planilha do Google Sheets (deve estar compartilhada publicamente)
            </p>
          </div>

          <button
            onClick={importFromSheets}
            disabled={importing || !sheetsUrl.trim()}
            className="w-full flex items-center justify-center gap-2 text-white px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                Importar Cardápio
              </>
            )}
          </button>
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
                  <p>✅ {importResult.pizzasAdded} pizzas adicionadas</p>
                  <p>✅ {importResult.beveragesAdded} bebidas adicionadas</p>
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

export default GoogleSheetsImport;