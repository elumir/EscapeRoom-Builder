import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PresentationView from './pages/PresentationView';
import PresenterView from './pages/PresenterView';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/editor/:id" 
              element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              } 
            />
            {/* Publicly accessible presentation routes */}
            <Route path="/present/:id" element={<PresentationView />} />
            <Route path="/presenter/:id" element={<PresenterView />} />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
};

export default App;