import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AppErrorBoundary from './AppErrorBoundary';
import './theme.css';
import './compact.css';
import './modern.css';
createRoot(document.getElementById('root')!).render(<AppErrorBoundary><App /></AppErrorBoundary>);
