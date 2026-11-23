/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Prevent iOS/iPadOS Safari browser-level viewport pinch-zoom traps while preserving in-SVG board pinch zoom
if (typeof document !== 'undefined') {
  const preventSafariGesture = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', preventSafariGesture, { passive: false });
  document.addEventListener('gesturechange', preventSafariGesture, { passive: false });
  document.addEventListener('gestureend', preventSafariGesture, { passive: false });
}

// Register PWA Service Worker in production web/PWA contexts (skip Electron file:// and dev HMR)
if (
  import.meta.env.PROD &&
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.location.protocol !== 'file:' &&
  !(window as Window & { catanDesktop?: { isDesktopApp?: boolean } }).catanDesktop?.isDesktopApp
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

