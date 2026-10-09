import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado:", error, info.componentStack);
  }

  handleRecargar = () => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-sm text-center">
            <h1 className="font-semibold text-lg mb-2">Algo salio mal</h1>
            <p className="text-sm text-neutral-500 mb-4">
              Ocurrio un error inesperado en la app. Tu informacion no se perdio en el
              servidor, pero conviene volver al inicio y reintentar.
            </p>
            <p className="text-xs text-neutral-400 mb-4 break-words">
              {this.state.error.message}
            </p>
            <button
              onClick={this.handleRecargar}
              className="bg-neutral-900 text-white rounded px-4 py-2 text-sm"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
