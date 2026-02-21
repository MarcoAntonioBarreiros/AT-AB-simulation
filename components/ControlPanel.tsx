import React from 'react';
import { SimulationConfig, AntibodyType } from '../types';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  config: SimulationConfig;
  setConfig: (c: SimulationConfig) => void;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  reset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, isRunning, setIsRunning, reset }) => {
  
  const handleChange = (key: keyof SimulationConfig, value: number | string | boolean) => {
    setConfig({ ...config, [key]: value });
  };

  const applyPreset = (preset: string) => {
    let newConfig = { ...config };
    switch (preset) {
        case 'equivalence':
            newConfig = { ...newConfig, antibodyCount: 100, antigenCount: 50, epitopesPerAntigen: 4, affinity: 80, dissociation: 8, antibodyType: 'IgG', isHapten: false };
            break;
        case 'prozone':
            newConfig = { ...newConfig, antibodyCount: 200, antigenCount: 30, epitopesPerAntigen: 4, affinity: 80, dissociation: 8, antibodyType: 'IgG', isHapten: false };
            break;
        case 'postzone':
            newConfig = { ...newConfig, antibodyCount: 20, antigenCount: 150, epitopesPerAntigen: 4, affinity: 80, dissociation: 8, antibodyType: 'IgG', isHapten: false };
            break;
        case 'igm':
            newConfig = { ...newConfig, antibodyCount: 30, antigenCount: 50, epitopesPerAntigen: 6, affinity: 55, dissociation: 12, antibodyType: 'IgM', isHapten: false };
            break;
        case 'hapten':
            newConfig = { ...newConfig, antibodyCount: 100, antigenCount: 50, epitopesPerAntigen: 4, affinity: 80, dissociation: 8, antibodyType: 'IgG', isHapten: true };
            break;
    }
    setConfig(newConfig);
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm flex flex-col gap-6 h-full overflow-y-auto">
      
      {/* Header Controls */}
      <div className="flex gap-2">
         <button 
           onClick={() => setIsRunning(!isRunning)}
           className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
             isRunning 
             ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20' 
             : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
           }`}
         >
           {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
         </button>
         <button 
           onClick={reset}
           className="px-4 py-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-colors"
           title="Reset Simulation"
         >
           <RefreshCw size={18} />
         </button>
      </div>

      <div className="space-y-6">
        {/* Presets */}
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => applyPreset('equivalence')} className="px-2 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded text-slate-300 border border-slate-600">⚖️ Equivalence</button>
            <button onClick={() => applyPreset('prozone')} className="px-2 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded text-slate-300 border border-slate-600">🔴 Prozone (Excess Ab)</button>
            <button onClick={() => applyPreset('postzone')} className="px-2 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded text-slate-300 border border-slate-600">🟡 Post-zone (Excess Ag)</button>
            <button onClick={() => applyPreset('igm')} className="px-2 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded text-slate-300 border border-slate-600">🌟 IgM Agglutination</button>
            <button onClick={() => applyPreset('hapten')} className="px-2 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded text-slate-300 border border-slate-600">💊 Hapten (Monovalent)</button>
        </div>

        {/* Antibody Type */}
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
           <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Antibody Structure</label>
           <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              {(['IgG', 'IgM'] as AntibodyType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleChange('antibodyType', type)}
                  className={`flex-1 py-1 text-xs rounded-md font-medium transition-all ${
                    config.antibodyType === type 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
           </div>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
           <ControlSlider 
             label="Antigen Concentration" 
             value={config.antigenCount} 
             min={5} max={200} 
             onChange={(v) => handleChange('antigenCount', v)} 
             unit="units"
           />
           <ControlSlider 
             label="Antibody Concentration" 
             value={config.antibodyCount} 
             min={5} max={200} 
             onChange={(v) => handleChange('antibodyCount', v)} 
             unit="units"
           />
           <ControlSlider 
             label="Epitopes per Antigen" 
             value={config.isHapten ? 1 : config.epitopesPerAntigen} 
             min={1} max={12} 
             onChange={(v) => handleChange('epitopesPerAntigen', v)} 
             unit={config.isHapten ? "hapten" : "sites"}
             disabled={config.isHapten}
           />
           
           <div className="h-px bg-slate-700 my-2"></div>

           <ControlSlider 
             label="Affinity (Kon)" 
             value={config.affinity} 
             min={5} max={100} 
             onChange={(v) => handleChange('affinity', v)} 
             unit="%"
             color="accent-cyan-500"
             textColor="text-cyan-400"
           />
           <ControlSlider 
             label="Dissociation (Koff)" 
             value={config.dissociation} 
             min={0} max={50} 
             onChange={(v) => handleChange('dissociation', v)} 
             unit="%"
             color="accent-purple-500"
             textColor="text-purple-400"
           />

           <ControlSlider 
             label="Temperature" 
             value={config.temperature} 
             min={0} max={100} 
             onChange={(v) => handleChange('temperature', v)} 
             unit="°"
           />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
           <Toggle label="Show Lattice" checked={config.showLinks} onChange={(v) => handleChange('showLinks', v)} />
           <Toggle label="Hapten Mode" checked={config.isHapten} onChange={(v) => handleChange('isHapten', v)} />
           <div className="col-span-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Antigen Size</label>
              <div className="flex bg-slate-700 rounded-lg p-0.5 border border-slate-600">
                  <button 
                    onClick={() => handleChange('antigenRadius', 18)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${config.antigenRadius === 18 ? 'bg-slate-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    1x
                  </button>
                  <button 
                    onClick={() => handleChange('antigenRadius', 36)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${config.antigenRadius === 36 ? 'bg-slate-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    2x
                  </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

const ControlSlider = ({ label, value, min, max, onChange, unit, color = "accent-blue-500", textColor = "text-blue-400", disabled = false }: any) => (
  <div className={disabled ? "opacity-50 pointer-events-none" : "mb-3"}>
    <div className="flex justify-between mb-1">
       <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</label>
       <span className={`text-[10px] font-mono font-bold ${textColor}`}>{value} {unit}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer ${color} hover:opacity-90`}
    />
  </div>
);

const Toggle = ({ label, checked, onChange }: any) => (
    <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        <button 
            onClick={() => onChange(!checked)}
            className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
        </button>
    </div>
);

export default ControlPanel;
