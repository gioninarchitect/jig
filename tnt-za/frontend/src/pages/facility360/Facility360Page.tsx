import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '../../components/Skeleton';
import {
  Building2, ChevronRight, Dna, Crown, Scissors, Sprout, Grid3X3,
  Layers, Leaf, Box, FlaskConical, Truck, Package, Droplets,
} from 'lucide-react';
import api from '../../services/api';

// Drilldown levels
type Level = 'facility' | 'strains' | 'mothers' | 'clones' | 'greenhouses' | 'bays' | 'batches' | 'plants';

const LEVEL_CONFIG: Record<Level, { title: string; icon: any; color: string }> = {
  facility: { title: 'Facility', icon: Building2, color: 'text-primary' },
  strains: { title: 'Strains', icon: Dna, color: 'text-purple-400' },
  mothers: { title: 'Mother Plants', icon: Crown, color: 'text-amber-400' },
  clones: { title: 'Clone Trays', icon: Scissors, color: 'text-emerald-400' },
  greenhouses: { title: 'Greenhouses', icon: Grid3X3, color: 'text-green-400' },
  bays: { title: 'Bays', icon: Sprout, color: 'text-green-300' },
  batches: { title: 'Batches', icon: Layers, color: 'text-blue-400' },
  plants: { title: 'Plants', icon: Leaf, color: 'text-green-400' },
};

export default function Facility360Page() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level>('facility');
  const [breadcrumb, setBreadcrumb] = useState<{ level: Level; label: string; id?: string }[]>([{ level: 'facility', label: 'Origin' }]);
  const [selectedStrain, setSelectedStrain] = useState('');
  const [selectedGH, setSelectedGH] = useState('');

  // Data queries
  const { data: facilities } = useQuery({ queryKey: ['facilities'], queryFn: () => api.get('/facilities').then(r => r.data.facilities) });
  const { data: strainAnalytics } = useQuery({ queryKey: ['strain-analytics'], queryFn: () => api.get('/strains/analytics').then(r => r.data.analytics), enabled: level === 'facility' || level === 'strains' });
  const { data: mothers } = useQuery({ queryKey: ['mothers'], queryFn: () => api.get('/baygrid/mothers').then(r => r.data.mothers), enabled: level === 'mothers' });
  const { data: cloneTrays } = useQuery({ queryKey: ['clone-trays'], queryFn: () => api.get('/baygrid/clone-trays').then(r => r.data.trays), enabled: level === 'clones' });
  const { data: greenhouses } = useQuery({ queryKey: ['greenhouses'], queryFn: () => api.get('/baygrid/greenhouses').then(r => r.data.greenhouses), enabled: level === 'greenhouses' || level === 'bays' });
  const { data: batches } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then(r => r.data.batches), enabled: level === 'batches' });
  const { data: plants } = useQuery({ queryKey: ['plants-all'], queryFn: () => api.get('/plants?limit=200').then(r => r.data.plants), enabled: level === 'plants' });
  const { data: mortalityStats } = useQuery({ queryKey: ['mortality-stats'], queryFn: () => api.get('/mortality/stats').then(r => r.data.stats) });

  function drillDown(newLevel: Level, label: string, id?: string) {
    setBreadcrumb(b => [...b, { level: newLevel, label, id }]);
    setLevel(newLevel);
  }

  function goBack(toIndex: number) {
    const newBreadcrumb = breadcrumb.slice(0, toIndex + 1);
    setBreadcrumb(newBreadcrumb);
    setLevel(newBreadcrumb[newBreadcrumb.length - 1].level);
  }

  const facility = facilities?.[0];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {breadcrumb.map((b, i) => {
          const cfg = LEVEL_CONFIG[b.level];
          const Icon = cfg.icon;
          const isLast = i === breadcrumb.length - 1;
          return (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              {i > 0 && <ChevronRight size={12} className="text-white/15" />}
              <button onClick={() => !isLast && goBack(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition min-h-[32px] ${isLast ? 'bg-primary/15 text-primary' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                <Icon size={12} />
                {b.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* ═══ FACILITY LEVEL ═══ */}
      {level === 'facility' && (
        <div className="space-y-4">
          {/* Facility header */}
          {facility && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"><Building2 size={24} className="text-primary" /></div>
                <div>
                  <h1 className="text-xl font-bold text-white">{facility.name}</h1>
                  <p className="text-xs text-white/40">{facility.location}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold font-mono text-white">{facility._count?.plants ?? 0}</div>
                  <div className="text-[10px] text-white/25">Plants</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold font-mono text-white">{facility._count?.batches ?? 0}</div>
                  <div className="text-[10px] text-white/25">Batches</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold font-mono text-white">{strainAnalytics?.length || 0}</div>
                  <div className="text-[10px] text-white/25">Strains</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${mortalityStats?.totalDeaths > 0 ? 'bg-red-500/5' : 'bg-white/[0.03]'}`}>
                  <div className={`text-xl font-bold font-mono ${mortalityStats?.totalDeaths > 0 ? 'text-red-400' : 'text-white'}`}>{mortalityStats?.cloneMortalityRate || 0}%</div>
                  <div className="text-[10px] text-white/25">Mortality</div>
                </div>
              </div>
            </div>
          )}

          {/* Drilldown cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => drillDown('strains', 'Strains')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0"><Dna size={20} className="text-purple-400" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Strains</div><div className="text-xs text-white/30">{strainAnalytics?.length || 0} registered — analytics + performance</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>

            <button onClick={() => drillDown('mothers', 'Mothers')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0"><Crown size={20} className="text-amber-400" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Mother Plants</div><div className="text-xs text-white/30">Registry + clone matrix</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>

            <button onClick={() => drillDown('clones', 'Clones')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Scissors size={20} className="text-emerald-400" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Clone Trays</div><div className="text-xs text-white/30">Rooting progress + mortality</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>

            <button onClick={() => drillDown('greenhouses', 'Greenhouses')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0"><Grid3X3 size={20} className="text-green-400" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Greenhouses & Bays</div><div className="text-xs text-white/30">BayGrid — transplant → veg → flower</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>

            <button onClick={() => drillDown('batches', 'Batches')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0"><Layers size={20} className="text-blue-400" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Batches</div><div className="text-xs text-white/30">Harvest → Process → Lab → COA → Release</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>

            <button onClick={() => drillDown('plants', 'Plants')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0"><Leaf size={20} className="text-green-400" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Individual Plants</div><div className="text-xs text-white/30">All plants — ZA-XXXXXX — phase + weight + lineage</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>

            <button onClick={() => navigate('/assets')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-white/50" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-white">Assets & Equipment</div><div className="text-xs text-white/30">Equipment, sensors, consumables</div></div>
              <ChevronRight size={16} className="text-white/15" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STRAINS LEVEL ═══ */}
      {level === 'strains' && (
        <div className="space-y-3">
          {!strainAnalytics?.length ? <p className="text-white/40 text-center py-8">No strains registered</p> : strainAnalytics.map((s: any) => (
            <button key={s.id} onClick={() => { setSelectedStrain(s.name); drillDown('mothers', s.name); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Dna size={16} className="text-purple-400" />
                  <span className="text-base font-bold text-white">{s.name}</span>
                  <span className="text-xs text-white/25">{s.species}</span>
                </div>
                <ChevronRight size={14} className="text-white/15" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><div className="text-lg font-bold font-mono text-white">{s.totalPlants}</div><div className="text-[10px] text-white/20">Plants</div></div>
                <div><div className="text-lg font-bold font-mono text-white">{s.motherCount}</div><div className="text-[10px] text-white/20">Mothers</div></div>
                <div><div className={`text-lg font-bold font-mono ${s.rootingRate >= 80 ? 'text-green-400' : 'text-amber-400'}`}>{s.rootingRate}%</div><div className="text-[10px] text-white/20">Rooting</div></div>
                <div><div className="text-lg font-bold font-mono text-purple-400">{s.avgThc || '—'}%</div><div className="text-[10px] text-white/20">THC</div></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══ MOTHERS LEVEL ═══ */}
      {level === 'mothers' && (
        <div className="space-y-3">
          {!mothers?.length ? <p className="text-white/40 text-center py-8">No mother plants</p> :
            mothers.filter((m: any) => !selectedStrain || m.strain === selectedStrain).map((m: any) => (
            <button key={m.id} onClick={() => drillDown('clones', m.identifier)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-amber-400" />
                  <span className="font-bold font-mono text-white">{m.identifier}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{m.status}</span>
                </div>
                <ChevronRight size={14} className="text-white/15" />
              </div>
              <div className="text-sm text-white/50 mb-2">{m.strain} {m.breeder ? `— ${m.breeder}` : ''}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-bold font-mono text-white">{m.totalClones}</div><div className="text-[10px] text-white/20">Total Clones</div></div>
                <div><div className="text-lg font-bold font-mono text-primary">{m.activeClones}</div><div className="text-[10px] text-white/20">Active</div></div>
                <div><div className="text-lg font-bold font-mono text-white">{m.cloneTrays?.length || 0}</div><div className="text-[10px] text-white/20">Trays</div></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══ CLONES LEVEL ═══ */}
      {level === 'clones' && (
        <div className="space-y-3">
          {!cloneTrays?.length ? <p className="text-white/40 text-center py-8">No clone trays</p> :
            cloneTrays.map((ct: any) => {
            const daysSince = Math.floor((Date.now() - new Date(ct.cloneDate).getTime()) / 86400000);
            const progress = Math.min(100, (daysSince / ct.rootingDays) * 100);
            const mortalityPct = ct.totalCuttings > 0 ? Math.round((ct.mortality / ct.totalCuttings) * 100) : 0;
            return (
              <div key={ct.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Scissors size={16} className="text-emerald-400" />
                    <span className="font-bold font-mono text-primary">{ct.trayNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ct.status === 'ROOTED' ? 'bg-green-500/20 text-green-400' : ct.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{ct.status}</span>
                  </div>
                  <span className="text-xs text-white/20">Day {daysSince}</span>
                </div>
                <div className="text-xs text-white/40 mb-2">{ct.strain} — Mother: {ct.motherPlant?.identifier || '?'}</div>
                <div className="grid grid-cols-4 gap-2 text-center mb-2">
                  <div><div className="text-base font-bold font-mono text-white">{ct.totalCuttings}</div><div className="text-[9px] text-white/20">Cuttings</div></div>
                  <div><div className="text-base font-bold font-mono text-green-400">{ct.rooted}</div><div className="text-[9px] text-white/20">Rooted</div></div>
                  <div><div className={`text-base font-bold font-mono ${ct.mortality > 0 ? 'text-red-400' : 'text-white'}`}>{ct.mortality}</div><div className="text-[9px] text-white/20">Dead</div></div>
                  <div><div className={`text-base font-bold font-mono ${mortalityPct > 20 ? 'text-red-400' : 'text-white/50'}`}>{mortalityPct}%</div><div className="text-[9px] text-white/20">Mortality</div></div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${ct.status === 'ROOTED' ? 'bg-green-500' : ct.status === 'FAILED' ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ GREENHOUSES LEVEL ═══ */}
      {level === 'greenhouses' && (
        <div className="space-y-3">
          {!greenhouses?.length ? <p className="text-white/40 text-center py-8">No greenhouses</p> :
            greenhouses.map((gh: any) => {
            const activeBays = gh.bays?.filter((b: any) => b.status !== 'EMPTY').length || 0;
            const totalBays = gh.bays?.length || 0;
            return (
              <button key={gh.id} onClick={() => { setSelectedGH(gh.id); drillDown('bays', gh.name); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Grid3X3 size={16} className="text-green-400" />
                    <span className="text-base font-bold text-white">{gh.name}</span>
                    <span className="text-xs text-white/25">{gh.type}</span>
                  </div>
                  <ChevronRight size={14} className="text-white/15" />
                </div>
                <div className="flex gap-1 mb-2">
                  {gh.bays?.map((bay: any) => (
                    <div key={bay.id} className={`h-8 flex-1 rounded ${bay.status === 'EMPTY' ? 'border border-dashed border-white/10' : 'bg-green-500'}`}
                      title={`${bay.name}: ${bay.currentStrain || 'Empty'}`} />
                  ))}
                </div>
                <div className="text-xs text-white/30">{activeBays}/{totalBays} bays active</div>
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ BAYS LEVEL ═══ */}
      {level === 'bays' && (
        <div className="space-y-3">
          {greenhouses?.filter((gh: any) => gh.id === selectedGH).map((gh: any) =>
            gh.bays?.map((bay: any) => {
              const isEmpty = bay.status === 'EMPTY';
              return (
                <button key={bay.id} onClick={() => !isEmpty && navigate(`/baygrid`)}
                  className={`w-full text-left bg-white/5 border rounded-xl p-4 transition ${isEmpty ? 'border-white/5' : 'border-white/10 hover:bg-white/[0.07] active:scale-[0.98] cursor-pointer'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sprout size={16} className={isEmpty ? 'text-white/20' : 'text-green-400'} />
                      <span className="text-sm font-bold text-white">{bay.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isEmpty ? 'bg-white/5 text-white/20' : 'bg-green-500/20 text-green-400'}`}>{bay.status}</span>
                    </div>
                    {!isEmpty && <ChevronRight size={14} className="text-white/15" />}
                  </div>
                  {!isEmpty && (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center mb-2">
                        <div><div className="text-base font-bold text-white">{bay.currentStrain || '—'}</div><div className="text-[9px] text-white/20">Strain</div></div>
                        <div><div className="text-base font-bold font-mono text-white">{bay._count?.allocations || 0}/{bay.capacity}</div><div className="text-[9px] text-white/20">Plants</div></div>
                        <div><div className="text-base font-bold font-mono text-primary">{bay.daysInPhase || 0}d</div><div className="text-[9px] text-white/20">{bay.currentPhase || 'Phase'}</div></div>
                      </div>
                      {bay.allocations && bay.allocations.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5">
                          {bay.allocations.slice(0, 8).map((a: any) => (
                            <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono">
                              L{a.lineNumber}P{a.position}
                            </span>
                          ))}
                          {bay.allocations.length > 8 && <span className="text-[10px] text-white/20">+{bay.allocations.length - 8}</span>}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ═══ BATCHES LEVEL ═══ */}
      {level === 'batches' && (
        <div className="space-y-3">
          {!batches?.length ? <p className="text-white/40 text-center py-8">No batches</p> :
            batches.map((b: any) => (
            <button key={b.id} onClick={() => navigate(`/batches/${b.id}`)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-blue-400" />
                  <span className="font-bold font-mono text-primary">{b.batchNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'RELEASED' ? 'bg-green-500/20 text-green-400' : b.status === 'QUARANTINED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{b.status}</span>
                </div>
                <ChevronRight size={14} className="text-white/15" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-base font-bold text-white">{b.strain}</div><div className="text-[9px] text-white/20">Strain</div></div>
                <div><div className="text-base font-bold font-mono text-white">{b.totalWeight?.toFixed(0) || 0}g</div><div className="text-[9px] text-white/20">Weight</div></div>
                <div><div className="text-base font-bold font-mono text-white">{b._count?.labResults || 0}/8</div><div className="text-[9px] text-white/20">Tests</div></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══ PLANTS LEVEL — Individual plants ═══ */}
      {level === 'plants' && (
        <div className="space-y-2">
          {!plants?.length ? <p className="text-white/40 text-center py-8">No plants registered</p> :
            plants.map((pl: any) => {
              const PHASE_COLORS: Record<string, string> = {
                SEEDLING: 'bg-green-500/20 text-green-400', VEGETATIVE: 'bg-green-500/20 text-green-300',
                FLOWERING: 'bg-purple-500/20 text-purple-400', HARVESTED: 'bg-amber-500/20 text-amber-400',
                DRYING: 'bg-yellow-500/20 text-yellow-400', CURING: 'bg-orange-500/20 text-orange-400',
                PROCESSING: 'bg-blue-500/20 text-blue-400', PACKAGED: 'bg-primary/20 text-primary',
              };
              const weights = pl.weightsJson ? (typeof pl.weightsJson === 'string' ? JSON.parse(pl.weightsJson) : pl.weightsJson) : {};
              const lastWeight = Object.values(weights).pop() as number | undefined;
              return (
                <button key={pl.id} onClick={() => navigate(`/plants/${pl.id}`)}
                  className={`w-full bg-white/5 border rounded-xl p-4 text-left hover:bg-white/[0.07] transition active:scale-[0.98] ${pl.status === 'FLAGGED' ? 'border-red-500/20' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Leaf size={14} className="text-green-400" />
                      <span className="font-bold font-mono text-primary text-sm">{pl.identifier}</span>
                      {pl.status === 'FLAGGED' && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">FLAGGED</span>}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${PHASE_COLORS[pl.phase] || 'bg-white/10 text-white/40'}`}>{pl.phase}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{pl.strain}</span>
                    {lastWeight && <span className="font-mono">{lastWeight}g</span>}
                    {pl.motherPlant && <span>Mother: {pl.motherPlant.identifier}</span>}
                    <span className="ml-auto text-white/15">{new Date(pl.createdAt).toLocaleDateString('en-ZA')}</span>
                  </div>
                </button>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
