import React from 'react';
import { SimulationStats } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceDot } from 'recharts';

interface StatsPanelProps {
  stats: SimulationStats;
}

// Data for the theoretical Heidelberger Curve
// X: Ratio (Ab/Ag), Y: Precipitation
const curveData = [
  { x: 0.05, y: 0, zone: 'Post-zone' },
  { x: 0.1, y: 5, zone: 'Post-zone' },
  { x: 0.2, y: 20, zone: 'Post-zone' },
  { x: 0.5, y: 60, zone: 'Equivalence' },
  { x: 1.0, y: 100, zone: 'Equivalence' }, // Peak
  { x: 2.0, y: 60, zone: 'Equivalence' },
  { x: 5.0, y: 10, zone: 'Prozone' },
  { x: 10.0, y: 0, zone: 'Prozone' },
];

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  
  const currentX = Math.max(0.05, Math.min(10, stats.ratio));
  
  let zoneColor = '#fbbf24'; // Warning (Pro/Post)
  if (stats.zone === 'Equivalence') zoneColor = '#10b981'; // Good
  if (stats.zone === 'Prozone') zoneColor = '#ef4444'; 
  if (stats.zone === 'Post-zone') zoneColor = '#f59e0b';

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center justify-between">
        <span>Heidelberger Curve</span>
        <span className={`text-xs px-2 py-1 rounded-full border ${
           stats.zone === 'Equivalence' 
             ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
             : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        }`} style={{ color: zoneColor, borderColor: zoneColor }}>
           {stats.zone}
        </span>
      </h3>
      
      <div className="h-32 w-full mb-4">
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curveData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
               <defs>
                  <linearGradient id="colorY" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2}/>
                     <stop offset="40%" stopColor="#10b981" stopOpacity={0.6}/>
                     <stop offset="60%" stopColor="#10b981" stopOpacity={0.6}/>
                     <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                  </linearGradient>
               </defs>
               <XAxis 
                 dataKey="x" 
                 type="number" 
                 scale="log" 
                 domain={[0.05, 10]} 
                 hide 
               />
               <YAxis hide domain={[0, 110]} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                 itemStyle={{ color: '#94a3b8' }}
                 labelFormatter={() => ''}
                 formatter={(value: any) => [value, 'Theoretical Precip.']}
               />
               <Area 
                 type="monotone" 
                 dataKey="y" 
                 stroke="#94a3b8" 
                 fill="url(#colorY)" 
                 strokeWidth={2}
               />
               <ReferenceDot 
                  x={currentX} 
                  y={stats.precipitation} 
                  r={6} 
                  fill={zoneColor} 
                  stroke="#fff"
                  strokeWidth={2}
               />
            </AreaChart>
         </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
         <StatBox label="Ratio (Ab/Ag)" value={stats.ratio.toFixed(2)} color="text-slate-200" />
         <StatBox label="Precipitation" value={Math.round(stats.precipitation) + '%'} color="text-emerald-400" />
         <StatBox label="Max Cluster" value={stats.maxCluster} color="text-blue-400" />
         <StatBox label="Bridges" value={stats.bridges} color="text-cyan-400" />
         <StatBox label="Ep. Occupancy" value={Math.round(stats.epitopeOccupancy) + '%'} color="text-amber-400" />
         <StatBox label="Avg Complex" value={stats.complexSize.toFixed(1)} color="text-purple-400" />
      </div>
      
      <div className="mt-4 text-xs text-slate-500 text-center leading-relaxed border-t border-slate-700/50 pt-4">
         {stats.zone === 'Prozone' && "Antibody Excess: High occupancy but few bridges. Antibodies saturate epitopes individually."}
         {stats.zone === 'Post-zone' && "Antigen Excess: Not enough antibodies to bridge antigens together. Small soluble complexes."}
         {stats.zone === 'Equivalence' && "Equivalence: Optimal ratio allows formation of large, insoluble cross-linked lattices."}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color }: any) => (
    <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
        <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
        <div className={`text-base font-mono font-bold ${color}`}>{value}</div>
    </div>
);

export default StatsPanel;
