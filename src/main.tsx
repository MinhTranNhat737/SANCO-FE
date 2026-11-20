import React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import AppErrorBoundary from './AppErrorBoundary';
import './theme.css';
import './compact.css';
import './modern.css';
import './rankings.css';
import './mobile-board.css';
import './lobby.css';
import './estate-readability.css';
import './estate-fullscreen.css';
createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
    <Analytics />
  </AppErrorBoundary>
);
