import { createRoot } from 'react-dom/client';
import AppErrorBoundary from './AppErrorBoundary';
import AdminDashboard from './AdminDashboard';
import './admin.css';

createRoot(document.getElementById('root')!).render(<AppErrorBoundary><AdminDashboard/></AppErrorBoundary>);
