import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PresentationView from './pages/PresentationView';
import PresenterView from './pages/PresenterView';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/present/:id" element={<PresentationView />} />
          <Route path="/presenter/:id" element={<PresenterView />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
};

export default App;
