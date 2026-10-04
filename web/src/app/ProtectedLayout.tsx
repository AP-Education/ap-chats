import { RequireAuth } from '../features/auth/components/RequireAuth';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { WorkspaceUnreadScope } from '../layouts/MainLayout/WorkspaceUnreadScope';
import { WorkspaceStartup } from './WorkspaceStartup';

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <WorkspaceStartup>
        <WorkspaceUnreadScope>
          <MainLayout />
        </WorkspaceUnreadScope>
      </WorkspaceStartup>
    </RequireAuth>
  );
}
