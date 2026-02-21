import React, { useRef, useEffect, useCallback } from 'react';
import { Entity, Antigen, Antibody, SimulationConfig, SimulationStats, Arm } from '../types';
import { 
  AG_RADIUS, FAB_LENGTH, FC_LENGTH_IGG, FC_LENGTH_IGM, TIP_RADIUS, CONTACT_RADIUS,
  COLOR_ANTIGEN_BODY, COLOR_ANTIGEN_STROKE, COLOR_ANTIGEN_PRECIP_BODY, COLOR_ANTIGEN_PRECIP_STROKE,
  COLOR_EPITOPE_FREE, COLOR_EPITOPE_BOUND, COLOR_ANTIBODY_IGG, COLOR_ANTIBODY_IGG_DIM, COLOR_LATTICE_HULL
} from '../constants';

interface SimulationCanvasProps {
  config: SimulationConfig;
  isRunning: boolean;
  onStatsUpdate: (stats: SimulationStats) => void;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ config, isRunning, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const requestRef = useRef<number>();
  const lastConfigRef = useRef<SimulationConfig>(config);
  const frameCountRef = useRef<number>(0);
  
  // Cluster state refs
  const clusterMapRef = useRef<Map<number, number>>(new Map());
  const clusterSizesRef = useRef<Map<number, number>>(new Map());

  // Helper: Rotate vector
  const rot = (x: number, y: number, a: number) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [x*c - y*s, x*s + y*c];
  };

  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // --- PARTICLE CREATION ---
  const mkAg = (x: number, y: number, k: number, id: number): Antigen => {
    const ang = [...Array(k).keys()].map(i => i/k * Math.PI * 2 + rand(-0.12, 0.12));
    const nv = 5 + Math.floor(Math.random() * 4);
    const verts = [];
    for(let i=0; i<nv; i++) {
        const a = i/nv * Math.PI * 2;
        const r = AG_RADIUS * (0.82 + rand(0, 0.36));
        verts.push({a, r});
    }
    return {
      id, kind: 'Ag', x, y, vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15),
      angle: 0, radius: AG_RADIUS,
      epitopes: ang.map(a => ({ ang: a, occ: false, abId: -1 })),
      verts, precipitated: false, cluster: -1
    };
  };

  const mkAb = (x: number, y: number, t: 'IgG' | 'IgM', id: number): Antibody => {
    const fc = t === 'IgG' ? FC_LENGTH_IGG : FC_LENGTH_IGM;
    let armAngles: number[] = [];
    if (t === 'IgG') {
        armAngles = [-0.55, 0.55];
    } else {
        for(let i=0; i<5; i++) {
            const base = i/5 * Math.PI * 2;
            armAngles.push(base - 0.65, base + 0.65);
        }
    }
    return {
        id, kind: 'Ab', abType: t, fcLen: fc, x, y,
        vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), angle: rand(0, Math.PI * 2),
        arms: armAngles.map(ang => ({ ang, bound: false, target: null })),
        radius: 10 // approximate for collision
    };
  };

  const initEntities = useCallback((width: number, height: number) => {
    const newEntities: Entity[] = [];
    let idCounter = 0;
    const margin = 35;

    // Linear scaling logic from the improved code
    // Cap counts to prevent performance issues while maintaining ratio
    const scale = 1.0; // React version can handle a bit more, but let's stick to safe limits
    const nAg = Math.min(200, Math.round(config.antigenCount * scale));
    const nAb = Math.min(200, Math.round(config.antibodyCount * scale));
    const epCount = config.isHapten ? 1 : config.epitopesPerAntigen;

    for(let i=0; i<nAg; i++) {
        newEntities.push(mkAg(rand(margin, width-margin), rand(margin, height-margin), epCount, idCounter++));
    }
    for(let i=0; i<nAb; i++) {
        newEntities.push(mkAb(rand(margin, width-margin), rand(margin, height-margin), config.antibodyType, idCounter++));
    }

    entitiesRef.current = newEntities;
  }, [config]);

  // Handle Config Changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prev = lastConfigRef.current;
    const needsReset = 
      prev.antigenCount !== config.antigenCount ||
      prev.antibodyCount !== config.antibodyCount ||
      prev.antibodyType !== config.antibodyType ||
      prev.epitopesPerAntigen !== config.epitopesPerAntigen ||
      prev.isHapten !== config.isHapten;

    if (needsReset) {
      initEntities(canvas.width, canvas.height);
    }
    lastConfigRef.current = config;
  }, [config, initEntities]);


  // --- PHYSICS ENGINE ---
  
  const posFab = (ab: Antibody, idx: number) => {
    const arm = ab.arms[idx];
    if (ab.abType === 'IgM') {
        const [dx, dy] = rot(0, -(ab.fcLen + FAB_LENGTH), ab.angle + arm.ang);
        return { x: ab.x + dx, y: ab.y + dy };
    }
    // IgG
    const [fcx, fcy] = rot(0, -ab.fcLen, ab.angle);
    const [dx, dy] = rot(0, -FAB_LENGTH, ab.angle + arm.ang);
    return { x: ab.x + fcx + dx, y: ab.y + fcy + dy };
  };

  const posEp = (ag: Antigen, i: number) => {
    const e = ag.epitopes[i];
    // +3.5 matches the visual offset in draw
    return { 
        x: ag.x + Math.cos(e.ang) * (ag.radius + 3.5), 
        y: ag.y + Math.sin(e.ang) * (ag.radius + 3.5) 
    };
  };

  const updatePhysics = (width: number, height: number) => {
    const entities = entitiesRef.current;
    const jitter = config.temperature > 0 ? 0.6 : 0.18;
    const maxV = config.temperature > 0 ? 1.3 : 0.8;

    // 1. Integrate & Wall Bounce
    const margin = 25;
    entities.forEach(p => {
        p.vx += rand(-jitter, jitter) * 0.1;
        p.vy += rand(-jitter, jitter) * 0.1;
        p.vx *= 0.982; p.vy *= 0.982;

        p.vx = clamp(p.vx, -maxV, maxV);
        p.vy = clamp(p.vy, -maxV, maxV);
        
        p.x += p.vx; p.y += p.vy;
        if (p.kind === 'Ab') p.angle += rand(-0.025, 0.025);

        if (p.x < margin || p.x > width - margin) p.vx *= -0.7;
        if (p.y < margin || p.y > height - margin) p.vy *= -0.7;
        p.x = clamp(p.x, margin, width - margin);
        p.y = clamp(p.y, margin, height - margin);
    });

    // 2. Repulsion
    const repR = AG_RADIUS * 1.8; // Increased repulsion radius
    const repK = 0.05; // Stronger repulsion
    for(let i=0; i<entities.length; i++) {
        const a = entities[i];
        for(let j=i+1; j<entities.length; j++) {
            const b = entities[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) + 1e-6;
            if (d < repR) {
                const f = repK * (repR - d) / repR;
                const ux = dx/d, uy = dy/d;
                a.vx -= f*ux; a.vy -= f*uy;
                b.vx += f*ux; b.vy += f*uy;
            }
        }
    }

    // 3. Spring Constraints (Keep bound Ags at reasonable distance)
    const agMap = new Map(entities.filter(p => p.kind === 'Ag').map(p => [p.id, p as Antigen]));
    const abs = entities.filter(p => p.kind === 'Ab') as Antibody[];
    
    abs.forEach(ab => {
        const boundAgIds = [...new Set(ab.arms.filter(f => f.bound && f.target).map(f => f.target!.agId))];
        const desired = (ab.fcLen + FAB_LENGTH) * 1.4;
        
        for(let i=0; i<boundAgIds.length; i++) {
            for(let j=i+1; j<boundAgIds.length; j++) {
                const A = agMap.get(boundAgIds[i]);
                const B = agMap.get(boundAgIds[j]);
                if (!A || !B) continue;
                
                const dx = B.x - A.x;
                const dy = B.y - A.y;
                const d = Math.hypot(dx, dy) + 1e-6;
                const ux = dx/d, uy = dy/d;
                const f = 0.02 * (d - desired); // Stiffer springs
                
                A.vx += f*ux; A.vy += f*uy;
                B.vx -= f*ux; B.vy -= f*uy;
            }
        }
    });

    // 4. Try Bind
    const affinity = config.affinity / 100;
    const ags = entities.filter(p => p.kind === 'Ag') as Antigen[];
    
    abs.forEach(ab => {
        ab.arms.forEach((arm, ai) => {
            if (arm.bound) return;
            
            const tip = posFab(ab, ai);
            let best: { ag: Antigen, ei: number } | null = null;
            let bestD2 = CONTACT_RADIUS * CONTACT_RADIUS;

            for(const ag of ags) {
                ag.epitopes.forEach((ep, ei) => {
                    if (ep.occ) return; // Already occupied - Key for Prozone!
                    const epos = posEp(ag, ei);
                    const dx = epos.x - tip.x;
                    const dy = epos.y - tip.y;
                    const d2 = dx*dx + dy*dy;
                    if (d2 < bestD2) {
                        bestD2 = d2;
                        best = { ag, ei };
                    }
                });
            }

            if (best) {
                // Probabilistic binding based on affinity
                // In prozone (high Ab), competition is high.
                if (Math.random() < affinity * 0.5) { // Reduced base binding rate to allow more mixing
                    best.ag.epitopes[best.ei].occ = true;
                    best.ag.epitopes[best.ei].abId = ab.id;
                    arm.bound = true;
                    arm.target = { agId: best.ag.id, epIdx: best.ei };
                }
            }
        });
    });

    // 5. Try Dissociate
    const kdBase = config.dissociation / 100;
    if (kdBase > 0) {
        abs.forEach(ab => {
            ab.arms.forEach(arm => {
                if (!arm.bound || !arm.target) return;
                
                // Avidity Bonus: If both arms are bound, dissociation is much lower
                const boundArms = ab.arms.filter(a => a.bound).length;
                const avidityFactor = boundArms > 1 ? 0.1 : 1.0;
                
                if (Math.random() < kdBase * 0.05 * avidityFactor) {
                    const ag = agMap.get(arm.target.agId);
                    if (ag) {
                        const ep = ag.epitopes[arm.target.epIdx];
                        if (ep) { ep.occ = false; ep.abId = -1; }
                    }
                    arm.bound = false;
                    arm.target = null;
                }
            });
        });
    }

    // 6. Apply Constraints (Inverse Kinematics-ish)
    abs.forEach(ab => {
        const binds = ab.arms
            .map((arm, i) => arm.bound && arm.target ? { i, ag: agMap.get(arm.target.agId), ep: arm.target.epIdx } : null)
            .filter(b => b && b.ag) as { i: number, ag: Antigen, ep: number }[];
        
        if (!binds.length) return;

        for(let k=0; k<5; k++) {
            let gx=0, gy=0, ga=0;
            for(const b of binds) {
                const epPos = posEp(b.ag, b.ep);
                const tipPos = posFab(ab, b.i);
                const dx = tipPos.x - epPos.x;
                const dy = tipPos.y - epPos.y;
                gx += dx; gy += dy;
                
                const armAng = ab.angle + ab.arms[b.i].ang + Math.PI/2;
                const [ux, uy] = rot(0, -(ab.fcLen + FAB_LENGTH), armAng);
                ga += dx*ux + dy*uy;
            }
            const eta = 0.4;
            ab.x -= eta * gx / binds.length;
            ab.y -= eta * gy / binds.length;
            ab.angle -= clamp(eta * ga / (binds.length * 80), -0.2, 0.2);
        }

        // Pull Ag toward Ab
        for(const b of binds) {
            const epPos = posEp(b.ag, b.ep);
            const tipPos = posFab(ab, b.i);
            const dx = tipPos.x - epPos.x;
            const dy = tipPos.y - epPos.y;
            b.ag.x += dx * 0.08;
            b.ag.y += dy * 0.08;
        }
    });
  };

  // --- CLUSTER DETECTION ---
  const detectClusters = () => {
    const entities = entitiesRef.current;
    const ags = entities.filter(p => p.kind === 'Ag') as Antigen[];
    const abs = entities.filter(p => p.kind === 'Ab') as Antibody[];

    const parent = new Map<number, number>();
    const rnk = new Map<number, number>();
    
    ags.forEach(ag => { parent.set(ag.id, ag.id); rnk.set(ag.id, 0); });

    const find = (x: number): number => {
        let curr = x;
        while (parent.get(curr) !== curr) {
            const p = parent.get(curr)!;
            parent.set(curr, parent.get(p)!);
            curr = parent.get(curr)!;
        }
        return curr;
    };

    const union = (a: number, b: number) => {
        let rootA = find(a);
        let rootB = find(b);
        if (rootA === rootB) return;
        if ((rnk.get(rootA) || 0) < (rnk.get(rootB) || 0)) {
            [rootA, rootB] = [rootB, rootA];
        }
        parent.set(rootB, rootA);
        if (rnk.get(rootA) === rnk.get(rootB)) {
            rnk.set(rootA, (rnk.get(rootA) || 0) + 1);
        }
    };

    abs.forEach(ab => {
        const agIds = [...new Set(ab.arms.filter(f => f.bound && f.target).map(f => f.target!.agId))];
        for(let i=1; i<agIds.length; i++) {
            union(agIds[0], agIds[i]);
        }
    });

    clusterMapRef.current.clear();
    clusterSizesRef.current.clear();

    ags.forEach(ag => {
        const root = find(ag.id);
        clusterMapRef.current.set(ag.id, root);
        clusterSizesRef.current.set(root, (clusterSizesRef.current.get(root) || 0) + 1);
    });

    ags.forEach(ag => {
        const root = clusterMapRef.current.get(ag.id)!;
        ag.cluster = root;
        ag.precipitated = (clusterSizesRef.current.get(root) || 1) >= 4;
    });
  };

  // --- STATS ---
  const calculateStats = () => {
    const entities = entitiesRef.current;
    const ags = entities.filter(p => p.kind === 'Ag') as Antigen[];
    const abs = entities.filter(p => p.kind === 'Ab') as Antibody[];

    let totalEp = 0, occEp = 0;
    ags.forEach(ag => {
        totalEp += ag.epitopes.length;
        occEp += ag.epitopes.filter(e => e.occ).length;
    });
    const epPct = totalEp > 0 ? (occEp / totalEp) * 100 : 0;

    let bridges = 0;
    abs.forEach(ab => {
        const set = new Set(ab.arms.filter(f => f.bound && f.target).map(f => f.target!.agId));
        if (set.size >= 2) bridges++;
    });

    let numClusters = 0, maxClust = 0, precipAg = 0;
    clusterSizesRef.current.forEach(size => {
        if (size >= 2) {
            numClusters++;
            maxClust = Math.max(maxClust, size);
        }
        if (size >= 5) precipAg += size;
    });

    const precipScore = ags.length > 0 ? (precipAg / ags.length) * 100 : 0;

    // Zone Calculation
    const totalSites = abs.length * (config.antibodyType === 'IgG' ? 2 : 10);
    const ratio = totalEp > 0 ? totalSites / totalEp : 0;
    
    let zone: 'Prozone' | 'Equivalence' | 'Post-zone' = 'Equivalence';
    const logRatio = Math.log10(ratio || 1e-9);
    if (logRatio > 0.22) zone = 'Prozone';
    else if (logRatio < -0.22) zone = 'Post-zone';

    onStatsUpdate({
        ratio,
        zone,
        complexSize: maxClust, // Using max cluster size as proxy for complex size interest
        precipitation: precipScore,
        bridges,
        maxCluster: maxClust,
        epitopeOccupancy: epPct
    });
  };

  // --- DRAW ---
  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    const entities = entitiesRef.current;
    const ags = entities.filter(p => p.kind === 'Ag') as Antigen[];
    const abs = entities.filter(p => p.kind === 'Ab') as Antibody[];
    const agMap = new Map(ags.map(p => [p.id, p]));

    // 1. Draw Lattice Hulls
    if (config.showLinks) {
        const clGroups = new Map<number, Antigen[]>();
        ags.forEach(ag => {
            const root = clusterMapRef.current.get(ag.id);
            if (root === undefined) return;
            const size = clusterSizesRef.current.get(root) || 1;
            if (size < 2) return;
            if (!clGroups.has(root)) clGroups.set(root, []);
            clGroups.get(root)!.push(ag);
        });

        let ci = 0;
        clGroups.forEach((group, root) => {
            if (group.length < 2) return;
            const isPrecip = group.length >= 3;

            let cx = 0, cy = 0;
            group.forEach(ag => { cx += ag.x; cy += ag.y; });
            cx /= group.length;
            cy /= group.length;
            
            let maxR = 0;
            group.forEach(ag => {
                maxR = Math.max(maxR, Math.hypot(ag.x - cx, ag.y - cy));
            });

            ctx.beginPath();
            ctx.arc(cx, cy, maxR + AG_RADIUS + 14, 0, Math.PI * 2);
            const c = COLOR_LATTICE_HULL[ci % COLOR_LATTICE_HULL.length];
            const alpha = isPrecip ? 0.12 : 0.06;
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
            ctx.fill();

            if (isPrecip) {
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ci++;
        });

        // Bridge Curves
        abs.forEach(ab => {
            const agIds = [...new Set(ab.arms.filter(f => f.bound && f.target).map(f => f.target!.agId))];
            if (agIds.length < 2) return;
            for(let i=0; i<agIds.length; i++) {
                for(let j=i+1; j<agIds.length; j++) {
                    const A = agMap.get(agIds[i]);
                    const B = agMap.get(agIds[j]);
                    if (!A || !B) continue;
                    ctx.beginPath();
                    ctx.moveTo(A.x, A.y);
                    ctx.quadraticCurveTo(ab.x, ab.y, B.x, B.y);
                    ctx.strokeStyle = 'rgba(255,92,106,0.35)';
                    ctx.lineWidth = 1.8;
                    ctx.stroke();
                }
            }
        });

        // Bound Arm Lines
        abs.forEach(ab => {
            ab.arms.forEach((arm, ai) => {
                if (!arm.bound || !arm.target) return;
                const ag = agMap.get(arm.target.agId);
                if (!ag) return;
                const tip = posFab(ab, ai);
                const ep = posEp(ag, arm.target.epIdx);
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(ep.x, ep.y);
                ctx.strokeStyle = 'rgba(255,200,68,0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        });
    }

    // 2. Draw Antigens
    ags.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.closePath();

        const isPrecip = p.precipitated && config.showLinks;
        ctx.fillStyle = isPrecip ? COLOR_ANTIGEN_PRECIP_BODY : COLOR_ANTIGEN_BODY;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = isPrecip ? COLOR_ANTIGEN_PRECIP_STROKE : COLOR_ANTIGEN_STROKE;
        ctx.stroke();

        // Epitopes
        p.epitopes.forEach(e => {
            const ex = Math.cos(e.ang) * (p.radius - 2); // Slightly inside
            const ey = Math.sin(e.ang) * (p.radius - 2);
            ctx.beginPath();
            ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
            if (e.occ) {
                ctx.fillStyle = COLOR_EPITOPE_BOUND;
                ctx.shadowColor = COLOR_EPITOPE_BOUND;
                ctx.shadowBlur = 5;
            } else {
                ctx.fillStyle = COLOR_EPITOPE_FREE;
                ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    });

    // 3. Draw Antibodies
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    abs.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        const col = COLOR_ANTIBODY_IGG;
        const colDim = COLOR_ANTIBODY_IGG_DIM;

        if (p.abType === 'IgG') {
            // Fc Stem
            ctx.beginPath();
            ctx.moveTo(-1.5, 0); ctx.lineTo(-1.5, -p.fcLen);
            ctx.moveTo(1.5, 0); ctx.lineTo(1.5, -p.fcLen);
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
            
            // Fc Base
            ctx.beginPath(); ctx.arc(0, 2, 3, 0, Math.PI*2); ctx.fillStyle = col; ctx.fill();
            
            // Hinge
            ctx.beginPath(); ctx.arc(0, -p.fcLen, 2, 0, Math.PI*2); ctx.fillStyle = 'rgba(107,238,170,0.4)'; ctx.fill();

            // Arms
            ctx.translate(0, -p.fcLen);
            p.arms.forEach(arm => {
                ctx.save();
                ctx.rotate(arm.ang);
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, -FAB_LENGTH);
                ctx.strokeStyle = arm.bound ? col : colDim;
                ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.arc(0, -FAB_LENGTH, TIP_RADIUS, 0, Math.PI*2);
                ctx.fillStyle = arm.bound ? COLOR_EPITOPE_BOUND : '#ffffff';
                if (arm.bound) { ctx.shadowColor = COLOR_EPITOPE_BOUND; ctx.shadowBlur = 4; }
                ctx.fill(); ctx.shadowBlur = 0;
                ctx.restore();
            });
        } else {
            // IgM
            ctx.beginPath(); ctx.arc(0,0, 4.5, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.beginPath(); ctx.arc(0,0, 1.8, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();

            for(let si=0; si<5; si++) {
                const base = si/5 * Math.PI*2;
                ctx.save(); ctx.rotate(base);
                ctx.beginPath(); ctx.moveTo(-1,0); ctx.lineTo(-1, -p.fcLen);
                ctx.moveTo(1,0); ctx.lineTo(1, -p.fcLen);
                ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.restore();
            }
            p.arms.forEach(arm => {
                ctx.save(); ctx.rotate(arm.ang);
                ctx.beginPath(); ctx.moveTo(0, -p.fcLen+1); ctx.lineTo(0, -(p.fcLen + FAB_LENGTH));
                ctx.strokeStyle = arm.bound ? col : colDim;
                ctx.lineWidth = 1.5; ctx.stroke();
                
                ctx.beginPath(); ctx.arc(0, -(p.fcLen + FAB_LENGTH), TIP_RADIUS * 0.8, 0, Math.PI*2);
                ctx.fillStyle = arm.bound ? COLOR_EPITOPE_BOUND : '#ffffff';
                if (arm.bound) { ctx.shadowColor = COLOR_EPITOPE_BOUND; ctx.shadowBlur = 3; }
                ctx.fill(); ctx.shadowBlur = 0;
                ctx.restore();
            });
        }
        ctx.restore();
    });
  };

  const animate = useCallback(() => {
    frameCountRef.current++;
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    if (isRunning) {
      updatePhysics(canvasRef.current.width, canvasRef.current.height);
      detectClusters();
    }
    draw(ctx, canvasRef.current.width, canvasRef.current.height);
    
    if (isRunning && frameCountRef.current % 5 === 0) {
        calculateStats();
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isRunning, config]); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initEntities(canvas.width, canvas.height);
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [initEntities, animate]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 relative">
       <canvas 
         ref={canvasRef} 
         width={1000} 
         height={600}
         className="w-full h-full object-cover block"
       />
       <div className="absolute bottom-4 left-4 bg-slate-800/80 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs text-slate-300 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 rounded-full bg-red-500 border border-red-700"></div>
             <span>Antigen</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 rounded-full bg-blue-500"></div>
             <span>Antibody ({config.antibodyType})</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-4 bg-red-500/10 border border-red-500/30 rounded border-dashed"></div>
             <span>Lattice (Precipitate)</span>
          </div>
       </div>
    </div>
  );
};

export default SimulationCanvas;
