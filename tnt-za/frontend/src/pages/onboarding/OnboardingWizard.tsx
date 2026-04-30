import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import {
  Leaf, Building2, FileText, Map, FlaskConical, Wrench, Users, BookOpen, Shield,
  ChevronRight, ChevronLeft, Check, Sparkles, MapPin, Plus, X, Loader2,
} from 'lucide-react';
import api from '../../services/api';

// ── Scenario cards for Step 0 ──
const SCENARIOS = [
  { id: 'INDOOR_CULTIVATOR', icon: '🌱', label: 'Indoor Cultivator', desc: 'Section 22C licensed indoor grow', color: '#C9A84C' },
  { id: 'OUTDOOR_HEMP', icon: '🌿', label: 'Outdoor / Hemp', desc: 'DALRRD hemp permit or outdoor grow', color: '#6B8E23' },
  { id: 'GMP_MANUFACTURER', icon: '🏭', label: 'Manufacturer', desc: 'GMP processing or extraction facility', color: '#4169E1' },
  { id: 'RESEARCH', icon: '🔬', label: 'Research', desc: 'University or research permit', color: '#9B59B6' },
];

const QUICK_STRAINS = ['Durban Poison', 'Swazi Gold', 'Malawi Gold', 'Power Plant', 'Rooibaard', 'White Widow', 'Northern Lights', 'Amnesia Haze'];

const STEPS = [
  { icon: Sparkles, label: 'Welcome' },
  { icon: Building2, label: 'Facility' },
  { icon: FileText, label: 'Licenses' },
  { icon: Map, label: 'Zones' },
  { icon: Leaf, label: 'Strains' },
  { icon: Wrench, label: 'Equipment' },
  { icon: Users, label: 'Team' },
  { icon: BookOpen, label: 'SOPs' },
  { icon: Shield, label: 'Partners' },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState('INDOOR_CULTIVATOR');

  // Form state
  const [facility, setFacility] = useState({ name: '', address: '', gpsLat: 0, gpsLng: 0, growType: 'indoor' });
  const [licenses, setLicenses] = useState({ licenseNumber: '', licenseExpiry: '', permitNumber: '', permitExpiry: '', gmpCertNumber: '', quotaAllocated: 200 });
  const [useZoneTemplate, setUseZoneTemplate] = useState(true);
  const [customZones, setCustomZones] = useState<{
    name: string; zoneType: string; capacity: number;
    hasEnvMonitor?: boolean;
    targetTempMin?: number; targetTempMax?: number;
    targetHumidMin?: number; targetHumidMax?: number;
    lightCycleOn?: number; lightCycleOff?: number;
    accessLevel?: string;
    _expanded?: boolean;
  }[]>([]);
  const [strains, setStrains] = useState<{ name: string; species: string; chemoType: string }[]>([]);
  const [equipment, setEquipment] = useState<{ name: string; lastCalibrated: string; intervalDays: number }[]>([]);
  const [team, setTeam] = useState<{ name: string; email: string; role: string }[]>([]);
  const [useTemplateSOPs, setUseTemplateSOPs] = useState(true);
  const [security, setSecurity] = useState({ sapsStation: '', sapsContact: '', wasteCompany: '', labPartner: '' });

  // API mutations
  const saveFacility = useMutation({ mutationFn: (d: any) => api.post('/onboarding/facility', d) });
  const saveLicenses = useMutation({ mutationFn: (d: any) => api.post('/onboarding/licenses', d) });
  const saveZones = useMutation({ mutationFn: (d: any) => api.post('/onboarding/zones', d) });
  const saveStrains = useMutation({ mutationFn: (d: any) => api.post('/onboarding/strains', d) });
  const saveEquipment = useMutation({ mutationFn: (d: any) => api.post('/onboarding/equipment', d) });
  const saveTeam = useMutation({ mutationFn: (d: any) => api.post('/onboarding/team', d) });
  const saveSOPs = useMutation({ mutationFn: (d: any) => api.post('/onboarding/sops', d) });
  const saveSecurity = useMutation({ mutationFn: (d: any) => api.post('/onboarding/security', d) });
  const complete = useMutation({ mutationFn: () => api.post('/onboarding/complete') });

  const loading = saveFacility.isPending || saveLicenses.isPending || saveZones.isPending || saveStrains.isPending || saveEquipment.isPending || saveTeam.isPending || saveSOPs.isPending || saveSecurity.isPending || complete.isPending;

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setFacility(f => ({ ...f, gpsLat: pos.coords.latitude, gpsLng: pos.coords.longitude })),
      () => addToast('warning', 'Could not get location'),
    );
  }

  async function handleNext() {
    try {
      if (step === 1) await saveFacility.mutateAsync({ ...facility, scenario });
      else if (step === 2) await saveLicenses.mutateAsync(licenses);
      else if (step === 3) await saveZones.mutateAsync({
        useTemplate: useZoneTemplate,
        scenario,
        zones: customZones.map(({ _expanded, ...rest }) => rest),
      });
      else if (step === 4 && strains.length > 0) await saveStrains.mutateAsync({ strains });
      else if (step === 5 && equipment.length > 0) await saveEquipment.mutateAsync({ equipment });
      else if (step === 6 && team.length > 0) await saveTeam.mutateAsync({ members: team });
      else if (step === 7) await saveSOPs.mutateAsync({ useTemplates: useTemplateSOPs });
      else if (step === 8) {
        await saveSecurity.mutateAsync(security);
        await complete.mutateAsync();
        addToast('success', 'Facility setup complete!');
        navigate('/dashboard');
        return;
      }
      setStep(s => s + 1);
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to save');
    }
  }

  const canSkip = step >= 4 && step <= 8; // Steps 4-8 are optional

  return (
    <div className="min-h-screen bg-dark">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-white/5 z-50">
        <div className="h-full bg-primary transition-all duration-500 rounded-r-full" style={{ width: `${(step / 8) * 100}%` }} />
      </div>

      {/* Step indicator */}
      {step > 0 && (
        <div className="fixed top-4 left-0 right-0 flex justify-center gap-2.5 z-40">
          {STEPS.slice(1).map((s, i) => (
            <div key={i} className={`h-2.5 rounded-full transition-all ${i + 1 <= step ? 'bg-primary' : 'bg-white/10'} ${i + 1 === step ? 'w-8' : 'w-2.5'}`} />
          ))}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-12 pb-24">

        {/* ── STEP 0: Welcome + Scenario ── */}
        {step === 0 && (
          <div className="space-y-6 animate-[fadeUp_0.4s_ease]">
            <div className="text-center pt-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Leaf size={32} className="text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to TnT-ZA</h1>
              <p className="text-white/50">Let's set up your facility in under 15 minutes</p>
              <p className="text-white/30 text-sm mt-2">Hi {user?.name} — what best describes your operation?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => setScenario(s.id)}
                  className={`p-5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                    scenario === s.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                  <span className="text-3xl block mb-3">{s.icon}</span>
                  <span className="text-sm font-semibold text-white block">{s.label}</span>
                  <span className="text-xs text-white/40 block mt-1">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Facility ── */}
        {step === 1 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <Building2 size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Where is your grow?</h2>
            </div>
            <Input label="Facility name" placeholder="e.g. ILCO Farm Potchefstroom" value={facility.name} onChange={v => setFacility(f => ({ ...f, name: v }))} />
            <Input label="Address" placeholder="Street, City, Province" value={facility.address} onChange={v => setFacility(f => ({ ...f, address: v }))} />
            <button onClick={useMyLocation} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition active:scale-[0.98]">
              <MapPin size={16} /> Use My Location
            </button>
            {facility.gpsLat !== 0 && <p className="text-xs text-primary text-center">GPS: {facility.gpsLat.toFixed(4)}, {facility.gpsLng.toFixed(4)}</p>}
            <div className="flex gap-2">
              {['indoor', 'greenhouse', 'outdoor'].map(t => (
                <button key={t} onClick={() => setFacility(f => ({ ...f, growType: t }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold capitalize transition active:scale-[0.98] ${facility.growType === t ? 'bg-primary text-white' : 'bg-white/5 border border-white/10 text-white/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Licenses ── */}
        {step === 2 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <FileText size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Your permits & licenses</h2>
            </div>
            <Input label="Section 22C license number" placeholder="SAHPRA-22C-XXXX-XXXX" value={licenses.licenseNumber} onChange={v => setLicenses(l => ({ ...l, licenseNumber: v }))} />
            <Input label="License expiry" type="date" value={licenses.licenseExpiry} onChange={v => setLicenses(l => ({ ...l, licenseExpiry: v }))} />
            <Input label="Section 22A permit (optional)" placeholder="SAHPRA-22A-XXXX-XXXX" value={licenses.permitNumber} onChange={v => setLicenses(l => ({ ...l, permitNumber: v }))} />
            <Input label="INCB annual plant quota" type="number" placeholder="200" value={String(licenses.quotaAllocated)} onChange={v => setLicenses(l => ({ ...l, quotaAllocated: parseInt(v) || 0 }))} />
            <p className="text-xs text-white/30 text-center">This is the max plants SAHPRA allows you annually. Plant registration blocks at 100%.</p>
          </div>
        )}

        {/* ── STEP 3: Zones ── */}
        {step === 3 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <Map size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Set up your rooms</h2>
            </div>
            <button onClick={() => setUseZoneTemplate(true)}
              className={`w-full p-4 rounded-2xl border text-left transition active:scale-[0.98] ${useZoneTemplate ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
              <span className="text-sm font-semibold text-white block">Use Standard Layout</span>
              <span className="text-xs text-white/40 block mt-1">Pre-configured zones for {SCENARIOS.find(s => s.id === scenario)?.label || 'your setup'}</span>
            </button>
            <button onClick={() => setUseZoneTemplate(false)}
              className={`w-full p-4 rounded-2xl border text-left transition active:scale-[0.98] ${!useZoneTemplate ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
              <span className="text-sm font-semibold text-white block">Custom Zones</span>
              <span className="text-xs text-white/40 block mt-1">Define your own zone names and types</span>
            </button>
            {useZoneTemplate && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <p className="text-xs text-white/40 mb-2">These rooms will be created:</p>
                {({
                  INDOOR_CULTIVATOR: ['Propagation Room', 'Grow Room', 'Drying Room', 'Trim Station', 'Curing Vault', 'Storage'],
                  OUTDOOR_HEMP: ['Seedbed', 'Field A', 'Field B', 'Drying Barn', 'Storage Shed'],
                  GMP_MANUFACTURER: ['Receiving Bay', 'Processing Lab', 'Packaging', 'Quarantine', 'Cold Storage'],
                  RESEARCH: ['Growth Chamber', 'Research Lab', 'Storage'],
                } as Record<string, string[]>)[scenario]?.map((z: string) => (
                  <div key={z} className="flex items-center gap-2 text-sm text-white/70">
                    <Check size={14} className="text-primary" /> {z}
                  </div>
                ))}
                <p className="text-[11px] text-white/30 pt-2 border-t border-white/5 mt-2">
                  Each template zone comes with sensible defaults for temp/humidity, light cycle, and access level.
                  You can tune any of them later under Facilities → Zones.
                </p>
              </div>
            )}
            {!useZoneTemplate && (
              <div className="space-y-3">
                {customZones.map((z, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center">
                      <input
                        value={z.name}
                        onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                        placeholder="Room name"
                        className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none"
                      />
                      <select
                        value={z.zoneType}
                        onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, zoneType: e.target.value } : c))}
                        className="px-2 py-2 bg-dark border border-white/10 rounded-lg text-white text-xs">
                        {['PROPAGATION', 'GROW', 'DRY', 'TRIM', 'CURE', 'PROCESS', 'PACK', 'STORAGE', 'QUARANTINE'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        type="number" min={0}
                        value={z.capacity}
                        onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, capacity: parseInt(e.target.value) || 0 } : c))}
                        placeholder="Cap"
                        className="w-20 px-2 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm"
                      />
                      <button onClick={() => setCustomZones(cs => cs.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400 p-2">
                        <X size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, _expanded: !c._expanded } : c))}
                      className="text-[11px] text-primary/80 hover:text-primary flex items-center gap-1">
                      <ChevronRight size={12} className={`transition ${z._expanded ? 'rotate-90' : ''}`} />
                      Advanced — temp / humidity / light / access
                    </button>
                    {z._expanded && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <label className="text-[11px] text-white/40">Temp range (°C)
                          <div className="flex gap-1.5 mt-1">
                            <input type="number" placeholder="min" value={z.targetTempMin ?? ''}
                              onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, targetTempMin: e.target.value ? Number(e.target.value) : undefined } : c))}
                              className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs" />
                            <input type="number" placeholder="max" value={z.targetTempMax ?? ''}
                              onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, targetTempMax: e.target.value ? Number(e.target.value) : undefined } : c))}
                              className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs" />
                          </div>
                        </label>
                        <label className="text-[11px] text-white/40">Humidity range (%)
                          <div className="flex gap-1.5 mt-1">
                            <input type="number" placeholder="min" value={z.targetHumidMin ?? ''}
                              onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, targetHumidMin: e.target.value ? Number(e.target.value) : undefined } : c))}
                              className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs" />
                            <input type="number" placeholder="max" value={z.targetHumidMax ?? ''}
                              onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, targetHumidMax: e.target.value ? Number(e.target.value) : undefined } : c))}
                              className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs" />
                          </div>
                        </label>
                        <label className="text-[11px] text-white/40">Light cycle (hrs on / off)
                          <div className="flex gap-1.5 mt-1">
                            <input type="number" placeholder="on" value={z.lightCycleOn ?? ''}
                              onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, lightCycleOn: e.target.value ? Number(e.target.value) : undefined } : c))}
                              className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs" />
                            <input type="number" placeholder="off" value={z.lightCycleOff ?? ''}
                              onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, lightCycleOff: e.target.value ? Number(e.target.value) : undefined } : c))}
                              className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs" />
                          </div>
                        </label>
                        <label className="text-[11px] text-white/40">Access level
                          <select value={z.accessLevel ?? ''}
                            onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, accessLevel: e.target.value || undefined } : c))}
                            className="w-full px-2 py-1.5 bg-dark border border-white/10 rounded text-white text-xs mt-1">
                            <option value="">—</option>
                            <option value="open">open</option>
                            <option value="controlled">controlled</option>
                            <option value="restricted">restricted</option>
                          </select>
                        </label>
                        <label className="col-span-2 flex items-center gap-2 text-[11px] text-white/50">
                          <input type="checkbox" checked={!!z.hasEnvMonitor}
                            onChange={e => setCustomZones(cs => cs.map((c, j) => j === i ? { ...c, hasEnvMonitor: e.target.checked } : c))} />
                          Has environmental monitor (auto-logs temp/humidity)
                        </label>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setCustomZones(cs => [...cs, { name: '', zoneType: 'GROW', capacity: 100 }])}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-xs text-white/50 hover:border-primary hover:text-primary transition flex items-center justify-center gap-2">
                  <Plus size={14} /> Add zone
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Strains ── */}
        {step === 4 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <Leaf size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">What do you grow?</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_STRAINS.map(s => {
                const added = strains.some(st => st.name === s);
                return (
                  <button key={s} onClick={() => !added && setStrains(st => [...st, { name: s, species: 'HYBRID', chemoType: 'THC_DOMINANT' }])}
                    className={`px-3 py-2 rounded-full text-sm transition active:scale-[0.95] ${added ? 'bg-primary text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:border-primary'}`}>
                    {added && <Check size={12} className="inline mr-1" />}{s}
                  </button>
                );
              })}
            </div>
            {strains.length > 0 && (
              <div className="space-y-2">
                {strains.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <span className="text-sm text-white font-medium">{s.name}</span>
                    <button onClick={() => setStrains(st => st.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Equipment ── */}
        {step === 5 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <Wrench size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Register your scales</h2>
              <p className="text-sm text-white/40 mt-1">Weight tracking needs calibrated scales</p>
            </div>
            {equipment.map((e, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">{e.name || 'New Scale'}</span>
                  <button onClick={() => setEquipment(eq => eq.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400"><X size={16} /></button>
                </div>
                <input placeholder="Scale name (e.g. Mettler Toledo XS205)" value={e.name}
                  onChange={ev => { const arr = [...equipment]; arr[i].name = ev.target.value; setEquipment(arr); }}
                  className="w-full px-4 py-2.5 bg-dark border border-white/10 rounded-lg text-white text-sm" />
                <input type="date" value={e.lastCalibrated}
                  onChange={ev => { const arr = [...equipment]; arr[i].lastCalibrated = ev.target.value; setEquipment(arr); }}
                  className="w-full px-4 py-2.5 bg-dark border border-white/10 rounded-lg text-white text-sm" />
              </div>
            ))}
            <button onClick={() => setEquipment(e => [...e, { name: '', lastCalibrated: '', intervalDays: 30 }])}
              className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/40 text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition">
              <Plus size={16} /> Add a Scale
            </button>
          </div>
        )}

        {/* ── STEP 6: Team ── */}
        {step === 6 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <Users size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Invite your team</h2>
              <p className="text-sm text-white/40 mt-1">They'll get a login PIN by email</p>
            </div>
            {team.map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-white/40">{m.role || 'Role'}</span><button onClick={() => setTeam(t => t.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400"><X size={16} /></button></div>
                <input placeholder="Name" value={m.name} onChange={ev => { const a = [...team]; a[i].name = ev.target.value; setTeam(a); }}
                  className="w-full px-4 py-2.5 bg-dark border border-white/10 rounded-lg text-white text-sm" />
                <input placeholder="email@example.com" type="email" value={m.email} onChange={ev => { const a = [...team]; a[i].email = ev.target.value; setTeam(a); }}
                  className="w-full px-4 py-2.5 bg-dark border border-white/10 rounded-lg text-white text-sm" />
                <div className="flex gap-2 flex-wrap">
                  {['HEAD_OF_CULTIVATION', 'CULTIVATOR', 'PROCESSING_MANAGER', 'FACILITY_SUPERVISOR', 'QA_INSPECTOR', 'MAINTENANCE_MANAGER', 'LAB_TECH', 'IRRIGATION_TECH', 'SECURITY_OFFICER', 'TRIMMER', 'HOUSEKEEPING', 'LAUNDRY', 'GENERAL_WORKER', 'VIEWER'].map(r => (
                    <button key={r} onClick={() => { const a = [...team]; a[i].role = r; setTeam(a); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${m.role === r ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setTeam(t => [...t, { name: '', email: '', role: 'CULTIVATOR' }])}
              className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/40 text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition">
              <Plus size={16} /> Invite Team Member
            </button>
          </div>
        )}

        {/* ── STEP 7: SOPs ── */}
        {step === 7 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <BookOpen size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Standard Operating Procedures</h2>
            </div>
            <button onClick={() => setUseTemplateSOPs(true)}
              className={`w-full p-5 rounded-2xl border text-left transition active:scale-[0.98] ${useTemplateSOPs ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Check size={16} className={useTemplateSOPs ? 'text-primary' : 'text-white/20'} />
                <span className="text-sm font-semibold text-white">Use ILCO Standard SOPs</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Recommended</span>
              </div>
              <span className="text-xs text-white/40 block">5 templates based on SAHPRA GMP requirements: Harvesting, Container Handling, Drying, Lab Sampling, Destruction</span>
            </button>
            <button onClick={() => setUseTemplateSOPs(false)}
              className={`w-full p-5 rounded-2xl border text-left transition active:scale-[0.98] ${!useTemplateSOPs ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
              <span className="text-sm font-semibold text-white block">I'll create my own later</span>
              <span className="text-xs text-white/40 block mt-1">You can add SOPs anytime from the QMS page</span>
            </button>
          </div>
        )}

        {/* ── STEP 8: Security Partners ── */}
        {step === 8 && (
          <div className="space-y-5 animate-[fadeUp_0.4s_ease]">
            <div className="text-center">
              <Shield size={28} className="text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Your compliance partners</h2>
              <p className="text-sm text-white/40 mt-1">Optional — add later if you prefer</p>
            </div>
            <Input label="Local SAPS station" placeholder="e.g. Potchefstroom Central" value={security.sapsStation} onChange={v => setSecurity(s => ({ ...s, sapsStation: v }))} />
            <Input label="SAPS contact officer" placeholder="Cpt. J. Botha" value={security.sapsContact} onChange={v => setSecurity(s => ({ ...s, sapsContact: v }))} />
            <Input label="Lab testing partner" placeholder="e.g. CAT Scientific" value={security.labPartner} onChange={v => setSecurity(s => ({ ...s, labPartner: v }))} />
            <Input label="Waste management company" placeholder="Optional" value={security.wasteCompany} onChange={v => setSecurity(s => ({ ...s, wasteCompany: v }))} />
          </div>
        )}

      </div>

      {/* ── Bottom nav ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-dark/95 backdrop-blur border-t border-white/10 px-4 py-3 flex items-center gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="p-3 bg-white/5 rounded-xl text-white/50 hover:text-white transition">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1" />
        {canSkip && (
          <button onClick={() => setStep(s => s + 1)} className="px-4 py-3 text-white/30 text-sm hover:text-white/60 transition">
            Skip
          </button>
        )}
        <button onClick={handleNext} disabled={loading || (step === 1 && !facility.name)}
          className="px-8 py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center gap-2 transition disabled:opacity-40 active:scale-[0.98]">
          {loading ? <Loader2 size={18} className="animate-spin" /> : (
            <>{step === 8 ? 'Finish Setup' : step === 0 ? "Let's Go" : 'Next'} <ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Reusable input ──
function Input({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-white/50 mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-primary focus:outline-none transition text-base" />
    </div>
  );
}
