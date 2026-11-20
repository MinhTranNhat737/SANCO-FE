import {createRoot} from 'react-dom/client';
import Lessons from './Lessons';
import {initializeLanguage} from './language';
import './theme.css';
import './practice.css';
import './modern.css';
import './lessons.css';

initializeLanguage();

const root=document.getElementById('lesson-root');
if(root)createRoot(root).render(<Lessons/>);
