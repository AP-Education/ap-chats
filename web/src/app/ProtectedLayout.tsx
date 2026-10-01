import { RequireAuth } from '../features/auth/components/RequireAuth';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { WorkspaceUnreadScope } from '../layouts/MainLayout/WorkspaceUnreadScope';

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <WorkspaceUnreadScope>
        <MainLayout />
      </WorkspaceUnreadScope>
    </RequireAuth>
  );
}
