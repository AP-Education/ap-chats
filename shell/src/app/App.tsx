import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '../features/auth/components/RequireAuth';
import { CurrentUserProvider } from '../features/auth/providers/CurrentUserProvider';
import { CallbackPage } from './CallbackPage';
import { Shell } from './Shell';
import { ThemeProvider } from './ThemeProvider';

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
                  <Shell />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </CurrentUserProvider>
  );
}
