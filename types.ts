export type AntibodyType = 'IgG' | 'IgM';

export interface Vector {
  x: number;
  y: number;
}

export interface Arm {
  ang: number;
  bound: boolean;
  target: { agId: number; epIdx: number } | null;
}

export interface Epitope {
  ang: number;
  occ: boolean;
  abId: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // Rotation in radians
  // We don't strictly need angularVelocity if we use the new simple random rotation logic, 
  // but keeping it doesn't hurt. The new logic uses direct rotation updates.
}

export interface Antigen extends Particle {
  kind: 'Ag';
  radius: number;
  epitopes: Epitope[];
  verts: { a: number; r: number }[]; // Irregular shape vertices
  precipitated: boolean;
  cluster: number;
}

export interface Antibody extends Particle {
  kind: 'Ab';
  abType: AntibodyType;
  fcLen: number;
  arms: Arm[];
}

export type Entity = Antigen | Antibody;

export interface SimulationConfig {
  antigenCount: number;
  antibodyCount: number;
  antibodyType: AntibodyType;
  epitopesPerAntigen: number;
  affinity: number; // 0 to 100 (kon)
  dissociation: number; // 0 to 50 (koff)
  temperature: number; // Thermal agitation
  showLinks: boolean;
  showLabels: boolean;
  isHapten: boolean; // Monovalent antigen mode
}

export interface SimulationStats {
  ratio: number; // Ab/Ag ratio
  zone: 'Prozone' | 'Equivalence' | 'Post-zone';
  complexSize: number; // Average size of complexes
  precipitation: number; // Score 0-100
  bridges: number;
  maxCluster: number;
  epitopeOccupancy: number;
}
