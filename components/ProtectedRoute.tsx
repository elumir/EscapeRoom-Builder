import React from 'react';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // User is not authenticated, redirect them to the login page.
    // The server will handle the /login route and redirect to Auth0.
    window.location.href = '/game/login';
    return null; // Render nothing while redirecting
  }

  return children; // User is authenticated, render the child component.
};

export default ProtectedRoute;
