import { RequireAuth } from '../features/auth/components/RequireAuth';
import { PushNavigation } from '../features/notifications/components/PushNavigation';
import { PushPresence } from '../features/notifications/components/PushPresence';
import { PushSubscriptionSync } from '../features/notifications/components/PushSubscriptionSync';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { WorkspaceUnreadScope } from '../layouts/MainLayout/WorkspaceUnreadScope';
import { WorkspaceStartup } from './WorkspaceStartup';

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <PushNavigation>
        <PushSubscriptionSync />
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
