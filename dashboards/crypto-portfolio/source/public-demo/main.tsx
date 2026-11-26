import React from 'react';
import {createRoot} from 'react-dom/client';
import Portfolio from '../app/portfolio';
import {demoRequest} from './demo-api.mjs';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<Portfolio request={demoRequest as typeof fetch} demo/>);
