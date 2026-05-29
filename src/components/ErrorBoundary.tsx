import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
              <CardTitle>Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Recarregar Página
                </Button>
              </div>
              {this.state.error && (
                <details className="text-xs text-muted-foreground mt-4">
                  <summary className="cursor-pointer hover:text-foreground transition-colors">Detalhes técnicos do erro</summary>
                  <pre className="mt-2 p-3 bg-muted rounded-xl text-xs overflow-auto max-h-[200px] border border-border/50">
                    {this.state.error.toString()}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;