import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

console.log("Mounting React app...");

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("React app mounted successfully");
} catch (error) {
  console.error("Failed to mount React app:", error);
  rootElement.innerHTML = `<div style="color: red; padding: 20px;">Failed to load application: ${error}</div>`;
}