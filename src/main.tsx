import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initFullStory } from './services/fullstory';
import { initConsent } from './services/consent';

// The consent banner only appears when there is something to consent to.
const capture = initFullStory();
if (capture) initConsent(capture.setConsent);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
