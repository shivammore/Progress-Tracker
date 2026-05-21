import React from 'react';
import './App.css';
import AppRouter from './AppRouter';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <main>
          <AppRouter />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
