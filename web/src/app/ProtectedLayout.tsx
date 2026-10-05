import { RequireAuth } from '../features/auth/components/RequireAuth';
import { PushNavigation } from '../features/notifications/navigation/PushNavigation';
import { PushPresence } from '../features/notifications/presence/PushPresence';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { WorkspaceUnreadScope } from '../layouts/MainLayout/WorkspaceUnreadScope';
import { WorkspaceStartup } from './WorkspaceStartup';

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <PushNavigation>
        <PushPresence />
        <WorkspaceStartup>
          <WorkspaceUnreadScope>
            <MainLayout />
          </WorkspaceUnreadScope>
        </WorkspaceStartup>
      </PushNavigation>
    </RequireAuth>
  );
}
