import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught uncaught render error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>

            <div>
              <div className="inline-block bg-indigo-950 border border-indigo-800 text-amber-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-2">
                Tú Super Cartón • Recuperación Segura
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Error de Renderizado Capturado
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                El sistema aisló una excepción de vista para evitar la pantalla blanca. Tus datos y transacciones se encuentran seguros.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-left text-xs font-mono text-rose-400 max-h-32 overflow-y-auto leading-tight">
                {this.state.error.message || this.state.error.toString()}
              </div>
            )}

            <button
              id="error-boundary-reload-btn"
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
