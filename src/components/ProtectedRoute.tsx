import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireReception?: boolean;
  requiredRole?: 'admin' | 'gerente' | 'recepcionista' | 'funcionario' | 'cliente';
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireReception = false,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isGerente, isRecepcionista, isFuncionario, isCliente } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // For admin routes, wait for admin status to be confirmed
  if (requireAdmin) {
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  if (requireReception) {
    if (!isRecepcionista && !isGerente && !isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  // Check for specific role requirement
  if (requiredRole) {
    switch (requiredRole) {
      case 'admin':
        if (!isAdmin) return <Navigate to="/" replace />;
        break;
      case 'gerente':
        if (!isGerente) return <Navigate to="/" replace />;
        break;
      case 'recepcionista':
        if (!isRecepcionista) return <Navigate to="/" replace />;
        break;
      case 'funcionario':
        if (!isFuncionario) return <Navigate to="/" replace />;
        break;
      case 'cliente':
        if (!isCliente) return <Navigate to="/" replace />;
        break;
    }
  }

  return <>{children}</>;
}