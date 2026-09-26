import { RequireAuth } from '../features/auth/components/RequireAuth';
import { MainLayout } from '../layouts/MainLayout/MainLayout';

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <MainLayout />
    </RequireAuth>
  );
}
