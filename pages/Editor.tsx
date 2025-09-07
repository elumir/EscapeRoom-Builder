
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game } from '../types';
import Icon from '../components/Icon';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGame = async () => {
      if (!id) return;
      setIsLoading(true);
      const data = await gameService.getGame(id);
      setGame(data);
      setIsLoading(false);
    };
    fetchGame();
  }, [id]);

  if (isLoading) {
    return <div className="h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">Loading editor...</div>;
  }

  if (!game) {
    return <div className="h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">Game not found.</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-md p-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
            <Icon as="prev" className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{game.title}</h1>
        </div>
        <div className="flex items-center gap-4">
            <Link to={`/settings/${game.id}`} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">
                <Icon as="settings" className="w-4 h-4" />
                <span>Settings</span>
            </Link>
            <a href={`/game/presenter/${game.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
                <Icon as="present" className="w-4 h-4" />
                <span>Present</span>
            </a>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Editor View</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">This is where you would edit your game.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Number of rooms: {game.rooms.length}</p>
        </div>
      </main>
    </div>
  );
};

export default Editor;
