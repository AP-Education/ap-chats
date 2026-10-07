import { ThemeProvider } from '@ap/ui';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { CallbackPage } from '@/features/auth/components/CallbackPage';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { CurrentUserProvider } from '@/features/auth/providers/CurrentUserProvider';

import { Workspace } from './Workspace';

export function App() {
  return (
    <CurrentUserProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="auth/callback" element={<CallbackPage />} />
            <Route
              path="*"
              element={
                <RequireAuth>
                  <Workspace />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </CurrentUserProvider>
  );
}
