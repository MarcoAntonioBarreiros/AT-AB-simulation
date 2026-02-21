import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  antigenCount: 50,
  antibodyCount: 100,
  antibodyType: 'IgG',
  epitopesPerAntigen: 4,
  affinity: 80,
  dissociation: 8,
  temperature: 30,
  showLinks: true,
  showLabels: false,
  isHapten: false
};

// Physics Constants (from new simulation)
export const AG_RADIUS = 18;
export const FAB_LENGTH = 18;
export const FC_LENGTH_IGG = 20;
export const FC_LENGTH_IGM = 14;
export const TIP_RADIUS = 3.2;
export const CONTACT_RADIUS = 12;

// Colors
export const COLOR_BG = '#0f172a'; // slate-900
export const COLOR_ANTIGEN_BODY = '#ef4444'; // red-500
export const COLOR_ANTIGEN_STROKE = '#b91c1c'; // red-700
export const COLOR_ANTIGEN_PRECIP_BODY = '#991b1b'; // red-800
export const COLOR_ANTIGEN_PRECIP_STROKE = '#7f1d1d'; // red-900

export const COLOR_EPITOPE_FREE = '#fbbf24'; // amber-400
export const COLOR_EPITOPE_BOUND = '#10b981'; // emerald-500

export const COLOR_ANTIBODY_IGG = 'rgba(59, 130, 246, 0.9)'; // blue-500
export const COLOR_ANTIBODY_IGG_DIM = 'rgba(59, 130, 246, 0.4)';

export const COLOR_LATTICE_HULL = [
  [239,68,68],[59,130,246],[16,185,129],[245,158,11],[139,92,246],[236,72,153]
];
