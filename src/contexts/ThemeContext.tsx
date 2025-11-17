import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerTextColor?: string;
  secondaryTextColor?: string;
  fontFamily: string;
  fontSize: string;
  iconStyle: 'outline' | 'filled' | 'rounded';
  borderRadius: string;
  spacing: string;
  headerStyle: 'gradient' | 'solid' | 'transparent';
  buttonStyle: 'rounded' | 'square' | 'pill';
  cardStyle: 'shadow' | 'border' | 'flat';
  animationSpeed: 'slow' | 'normal' | 'fast';
  systemIcon?: string;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#DC2626', // red-600
  secondaryColor: '#EA580C', // orange-600
  accentColor: '#059669', // emerald-600
  backgroundColor: '#F3F4F6', // gray-100
  textColor: '#111827', // gray-900
  headerTextColor: '#FFFFFF', // white
  secondaryTextColor: '#6B7280', // gray-500
  fontFamily: 'Inter',
  fontSize: 'base',
  iconStyle: 'outline',
  borderRadius: 'lg',
  spacing: 'normal',
  headerStyle: 'gradient',
  buttonStyle: 'rounded',
  cardStyle: 'shadow',
  animationSpeed: 'normal',
  systemIcon: ''
};

interface ThemeContextType {
  theme: ThemeConfig;
  iconProps: React.SVGProps<SVGSVGElement>; // Objeto de estilo para ícones
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const savedTheme = localStorage.getItem('systemTheme');
      return savedTheme ? { ...defaultTheme, ...JSON.parse(savedTheme) } : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  // Cria o objeto de propriedades para os ícones com base no tema
  const iconProps = useMemo(() => {
    switch (theme.iconStyle) {
      case 'filled':
        return { fill: 'currentColor', stroke: 'none', strokeWidth: 0 };
      case 'rounded':
        return { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
      case 'outline':
      default:
        return { fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
    }
  }, [theme.iconStyle]);

  const applyThemeToDOM = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Aplicar variáveis CSS customizadas
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
    root.style.setProperty('--secondary-color', themeConfig.secondaryColor);
    root.style.setProperty('--accent-color', themeConfig.accentColor);
    root.style.setProperty('--background-color', themeConfig.backgroundColor);
    root.style.setProperty('--text-color', themeConfig.textColor);
    root.style.setProperty('--header-text-color', themeConfig.headerTextColor || '#FFFFFF');
    root.style.setProperty('--secondary-text-color', themeConfig.secondaryTextColor || '#6B7280');
    
    // Aplicar fonte
    root.style.setProperty('--font-family', themeConfig.fontFamily);
    
    // Aplicar tamanho da fonte
    const fontSizes = {
      'xs': '0.75rem',
      'sm': '0.875rem',
      'base': '1rem',
      'lg': '1.125rem',
      'xl': '1.25rem'
    };
    root.style.setProperty('--font-size', fontSizes[themeConfig.fontSize as keyof typeof fontSizes]);
    
    // Aplicar border radius
    const borderRadiuses = {
      'none': '0',
      'sm': '0.125rem',
      'md': '0.375rem',
      'lg': '0.5rem',
      'xl': '0.75rem',
      'full': '9999px'
    };
    root.style.setProperty('--border-radius', borderRadiuses[themeConfig.borderRadius as keyof typeof borderRadiuses]);
    
    // Aplicar espaçamento
    const spacings = {
      'tight': '0.5rem',
      'normal': '1rem',
      'loose': '1.5rem'
    };
    root.style.setProperty('--spacing', spacings[themeConfig.spacing as keyof typeof spacings]);

    // Aplicar classes CSS dinâmicas no body
    const body = document.body;
    
    // Remover classes anteriores
    body.classList.remove('theme-applied');
    
    // Aplicar nova classe
    body.classList.add('theme-applied');
    
    // Aplicar estilos diretamente nos elementos principais
    const headers = document.querySelectorAll('header');
    headers.forEach(header => {
      if (themeConfig.headerStyle === 'gradient') {
        header.style.background = `linear-gradient(to right, ${themeConfig.primaryColor}, ${themeConfig.secondaryColor})`;
      } else {
        header.style.backgroundColor = themeConfig.primaryColor;
      }
    });

    // Aplicar estilos nos botões principais
    const buttons = document.querySelectorAll('button:not(.theme-ignore)');
    buttons.forEach(button => {
      const buttonElement = button as HTMLElement;
      
      // Aplicar cores baseadas nas classes CSS
      const classList = buttonElement.classList;
      
      // Botões primários (vermelhos/laranja)
      if (classList.contains('bg-red-600') || 
          classList.contains('bg-red-700') ||
          classList.contains('bg-orange-500') ||
          classList.contains('bg-orange-600') ||
          classList.contains('theme-button-primary')) {
        buttonElement.style.backgroundColor = themeConfig.primaryColor;
        buttonElement.style.borderColor = themeConfig.primaryColor;
      }
      
      // Botões de destaque (verdes)
      if (classList.contains('bg-green-500') || 
          classList.contains('bg-green-600') ||
          classList.contains('bg-green-700') ||
          classList.contains('theme-button-accent')) {
        buttonElement.style.backgroundColor = themeConfig.accentColor;
        buttonElement.style.borderColor = themeConfig.accentColor;
      }
      
      // Botões secundários (azuis)
      if (classList.contains('bg-blue-500') || 
          classList.contains('bg-blue-600') ||
          classList.contains('bg-blue-700') ||
          classList.contains('theme-button-secondary')) {
        buttonElement.style.backgroundColor = themeConfig.secondaryColor;
        buttonElement.style.borderColor = themeConfig.secondaryColor;
      }
      
      // Aplicar hover states
      buttonElement.addEventListener('mouseenter', () => {
        if (classList.contains('bg-red-600') || classList.contains('bg-red-700') || 
            classList.contains('bg-orange-500') || classList.contains('bg-orange-600') ||
            classList.contains('theme-button-primary')) {
          buttonElement.style.backgroundColor = adjustColorBrightness(themeConfig.primaryColor, -20);
        }
        if (classList.contains('bg-green-500') || classList.contains('bg-green-600') || 
            classList.contains('bg-green-700') || classList.contains('theme-button-accent')) {
          buttonElement.style.backgroundColor = adjustColorBrightness(themeConfig.accentColor, -20);
        }
        if (classList.contains('bg-blue-500') || classList.contains('bg-blue-600') || 
            classList.contains('bg-blue-700') || classList.contains('theme-button-secondary')) {
          buttonElement.style.backgroundColor = adjustColorBrightness(themeConfig.secondaryColor, -20);
        }
      });
      
      buttonElement.addEventListener('mouseleave', () => {
        if (classList.contains('bg-red-600') || classList.contains('bg-red-700') || 
            classList.contains('bg-orange-500') || classList.contains('bg-orange-600') ||
            classList.contains('theme-button-primary')) {
          buttonElement.style.backgroundColor = themeConfig.primaryColor;
        }
        if (classList.contains('bg-green-500') || classList.contains('bg-green-600') || 
            classList.contains('bg-green-700') || classList.contains('theme-button-accent')) {
          buttonElement.style.backgroundColor = themeConfig.accentColor;
        }
        if (classList.contains('bg-blue-500') || classList.contains('bg-blue-600') || 
            classList.contains('bg-blue-700') || classList.contains('theme-button-secondary')) {
          buttonElement.style.backgroundColor = themeConfig.secondaryColor;
        }
      });
    });

    // Aplicar ícone personalizado
    if (themeConfig.systemIcon) {
      // Atualizar favicon
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = themeConfig.systemIcon;
      
      // Atualizar ícones no header se existirem
      const headerIcons = document.querySelectorAll('.system-icon');
      headerIcons.forEach(icon => {
        if (icon instanceof HTMLImageElement) {
          icon.src = themeConfig.systemIcon!;
        }
      });
    }

    console.log('🎨 Tema aplicado:', themeConfig);
  };

  // Função auxiliar para ajustar brilho da cor
  const adjustColorBrightness = (color: string, amount: number): string => {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    localStorage.setItem('systemTheme', JSON.stringify(newTheme));
    
    // Aplicar imediatamente
    setTimeout(() => {
      applyThemeToDOM(newTheme);
    }, 50);
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('systemTheme');
    setTimeout(() => {
      applyThemeToDOM(defaultTheme);
    }, 50);
  };

  const applyTheme = () => {
    applyThemeToDOM(theme);
  };

  useEffect(() => {
    // Aplicar tema inicial
    const timer = setTimeout(() => {
      applyThemeToDOM(theme);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Re-aplicar tema quando houver mudanças
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, iconProps, updateTheme, resetTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};