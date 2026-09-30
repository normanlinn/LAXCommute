import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountProvider } from './hooks/useAccount';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000) } },
});
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <App />
      </AccountProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
