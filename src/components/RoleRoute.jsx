import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Solo admin (o rol no definido, ej. el creador) accede a las rutas anidadas.
// Los usuarios regulares (rol 'user') son redirigidos al Punto de Venta.
export default function RoleRoute() {
  const { user } = useAuth();
  const esAdmin = user?.role !== 'user';
  if (!esAdmin) return <Navigate to="/venta" replace />;
  return <Outlet />;
}