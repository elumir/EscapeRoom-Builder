
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PresentationView from './pages/PresentationView';
import PresenterView from './pages/PresenterView';

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/present/:id" element={<PresentationView />} />
        <Route path="/presenter/:id" element={<PresenterView />} />
      </Routes>
    </div>
  );
};

export default App;