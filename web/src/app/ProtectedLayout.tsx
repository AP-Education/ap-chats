import { RequireAuth } from '../features/auth/components/RequireAuth';
import { AttentionReporter } from '../features/notifications/components/AttentionReporter';
import { NotificationDismissal } from '../features/notifications/components/NotificationDismissal';
import { PushNavigation } from '../features/notifications/components/PushNavigation';
import { PushSubscriptionSync } from '../features/notifications/components/PushSubscriptionSync';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { WorkspaceUnreadScope } from '../layouts/MainLayout/WorkspaceUnreadScope';
import { WorkspaceStartup } from './WorkspaceStartup';

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <PushNavigation>
        <PushSubscriptionSync />
        <AttentionReporter />
        <NotificationDismissal />
        <WorkspaceStartup>
          <WorkspaceUnreadScope>
            <MainLayout />
          </WorkspaceUnreadScope>
        </WorkspaceStartup>
      </PushNavigation>
    </RequireAuth>
  );
}
