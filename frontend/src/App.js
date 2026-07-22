import React from 'react';
import './App.css';
import AppRouter from './AppRouter';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ToastManager';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="App">
          <main>
            <AppRouter />
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
