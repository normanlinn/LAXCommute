import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountProvider } from './hooks/useAccount';
import App from './App';
import { readAuthReturn } from './domain/auth';
import { LanguageProvider } from './i18n/LanguageProvider';
import ShuttleGuide from './components/ShuttleGuide';
import './styles.css';

// Optional, cookie-free page analytics. The beacon token is public, not an API secret.
// The poster uses /employee-shuttles so its visits can be filtered by Path.
const analyticsToken = import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN;
if (
  analyticsToken &&
  !readAuthReturn(location.href).active &&
  !document.querySelector('script[data-cf-beacon]')
) {
  const beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({ token: analyticsToken }));
  document.body.append(beacon);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000) } },
});
// Keep the crawlable HTML guide until the interactive app is ready to render it.
const guideTarget = document.getElementById('shuttle-guide');
guideTarget?.replaceChildren();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AccountProvider>
          <App />
          {guideTarget && <ShuttleGuide target={guideTarget} />}
        </AccountProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
