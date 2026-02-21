import React, { useState, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import { SimulationConfig, SimulationStats } from './types';
import { DEFAULT_CONFIG } from './constants';
import { Beaker } from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [stats, setStats] = useState<SimulationStats>({ 
    ratio: 1, 
    zone: 'Equivalence', 
    complexSize: 0, 
    precipitation: 0,
    bridges: 0,
    maxCluster: 0,
    epitopeOccupancy: 0
  });

  const handleStatsUpdate = useCallback((newStats: SimulationStats) => {
    setStats(newStats);
  }, []);

  const reset = () => {
    // Force re-render of canvas by toggling running momentarily or just passing config
    // Actually, just resetting config to default triggers effect in Canvas
    setConfig({ ...DEFAULT_CONFIG });
    setIsRunning(true);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center px-6 justify-between flex-shrink-0 z-10">
         <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Beaker className="text-white" size={24} />
            </div>
            <div>
               <h1 className="text-xl font-bold tracking-tight text-white">ImmunoSim</h1>
               <p className="text-xs text-slate-400">Antigen-Antibody Interaction & Precipitation</p>
            </div>
         </div>
         <div className="text-xs text-slate-500 hidden md:block">
            v2.0 • React • TypeScript • Physics Engine
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
         
         {/* Left Panel: Simulation */}
         <div className="flex-1 p-4 md:p-6 relative flex flex-col min-h-0">
            <SimulationCanvas 
               config={config} 
               isRunning={isRunning} 
               onStatsUpdate={handleStatsUpdate} 
            />
         </div>

         {/* Right Panel: Controls & Stats */}
         <div className="w-[26rem] p-4 md:p-6 border-l border-slate-800 bg-slate-900 flex flex-col gap-6 overflow-y-auto flex-shrink-0">
            
            {/* Stats Chart */}
            <StatsPanel stats={stats} />

            {/* Controls */}
            <ControlPanel 
               config={config} 
               setConfig={setConfig} 
               isRunning={isRunning} 
               setIsRunning={setIsRunning} 
               reset={reset}
            />

         </div>
      </main>
    </div>
  );
};

export default App;
