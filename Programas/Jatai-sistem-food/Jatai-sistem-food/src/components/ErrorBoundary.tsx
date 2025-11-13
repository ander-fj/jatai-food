import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Você pode logar o erro para um serviço de relatórios de erro aqui
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      // Renderiza a UI de fallback customizada se fornecida
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback padrão
      return (
        <div style={{ padding: '20px', margin: '20px', border: '1px solid #ef4444', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7f1d1d' }}>Oops! Algo deu errado.</h2>
          <p style={{ marginTop: '8px', color: '#991b1b' }}>Um erro ocorreu nesta parte da aplicação.</p>
          
          {this.state.error && (
            <details style={{ marginTop: '16px', background: '#fff1f2', padding: '12px', borderRadius: '4px' }}>
              <summary style={{ fontWeight: 'bold', cursor: 'pointer', color: '#991b1b' }}>Detalhes do Erro</summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordWrap: 'break-word', 
                color: '#7f1d1d', 
                fontSize: '13px', 
                marginTop: '8px' 
              }}>
                <strong>Erro:</strong> {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;