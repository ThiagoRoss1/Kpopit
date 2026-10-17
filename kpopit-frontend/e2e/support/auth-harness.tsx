// Test-only browser entry: exercise the real provider while explicitly requesting refreshAuth.
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/contexts/AuthProvider';
import { useAuth } from '../../src/hooks/useAuth';

export function Session() {
  const auth = useAuth();
  return <>
    <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
    <button onClick={() => auth.refreshAuth()}>Refresh session</button>
  </>;
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient()}><AuthProvider><Session /></AuthProvider></QueryClientProvider>,
);
