import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../stores/toastStore';
import { useRBAC } from '../../hooks/useRBAC';
import {
  Camera, Loader2, Leaf, Box, Layers, Scale, RotateCcw, ArrowRight, X,
  Package, Truck, Users, CheckCircle, AlertTriangle, ChevronRight,
} from 'lucide-react';
import api from '../../services/api';

type ScanResult = {
  scan: { type: string; identifier: string | null; weight: number | null; weightUnit: string | null; confidence: number; notes: string };
  entity: any;
  matched: boolean;
  photoUrl: string;
};

type WorkflowStep = 'idle' | 'scanning' | 'identified' | 'select-action' | 'weigh' | 'weighing' | 'confirm' | 'done';

const ICONS: Record<string, any> = { plant: Leaf, container: Box, batch: Layers, scale: Scale, unknown: Camera };
const ACTIONS = [
  { id: 'load', label: 'Load', icon: Package, color: 'primary', desc: 'Put product into container' },
  { id: 'unload', label: 'Unload', icon: Package, color: 'amber-500', desc: 'Remove product from container' },
  { id: 'move', label: 'Move Zone', icon: Truck, color: 'blue-500', desc: 'Move container to another room' },
  { id: 'handover', label: 'Handover', icon: Users, color: 'purple-500', desc: 'Transfer to another person' },
];

export default function ScanPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const { hasMinLevel } = useRBAC();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<WorkflowStep>('idle');
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedHandler, setSelectedHandler] = useState('');
  const [scaleWeight, setScaleWeight] = useState<number | null>(null);
  const [manualWeight, setManualWeight] = useState('');
  const [scalePhoto, setScalePhoto] = useState<string | null>(null);

  const { data: facilities } = useQuery({ queryKey: ['facilities'], queryFn: () => api.get('/facilities').then(r => r.data.facilities) });
  const zones = facilities?.[0]?.zones || [];

  // Scan mutation — identify from photo
  const scanMut = useMutation({
    mutationFn: async (blob: Blob) => {
      const form = new FormData();
      form.append('photo', blob, 'scan.jpg');
      const { data } = await api.post('/scan', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data as ScanResult;
    },
    onSuccess: (data) => {
      setScanResult(data);
      if (data.matched) {
        addToast('success', `Found: ${data.scan.type} ${data.scan.identifier}`);
        setStep(data.scan.type === 'container' ? 'select-action' : 'identified');
      } else if (data.scan.type === 'scale') {
        setScaleWeight(data.scan.weight);
        addToast('info', `Scale: ${data.scan.weight}${data.scan.weightUnit}`);
        setStep('confirm');
      } else {
        addToast('warning', 'Could not identify — try again');
        setStep('idle');
      }
    },
    onError: () => { addToast('error', 'Scan failed'); setStep('idle'); },
  });

  // Scale scan mutation — read weight from scale photo
  const scaleMut = useMutation({
    mutationFn: async (blob: Blob) => {
      const form = new FormData();
      form.append('photo', blob, 'scale.jpg');
      const { data } = await api.post('/scan', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data as ScanResult;
    },
    onSuccess: (data) => {
      if (data.scan.weight) {
        setScaleWeight(data.scan.weight);
        setScalePhoto(capturedImage);
        addToast('success', `Scale reads: ${data.scan.weight}${data.scan.weightUnit || 'g'}`);
        setStep('confirm');
      } else {
        addToast('warning', 'Could not read scale — enter weight manually');
        setStep('confirm');
      }
    },
    onError: () => { addToast('warning', 'Scale read failed — enter manually'); setStep('confirm'); },
  });

  // Container action mutation
  const actionMut = useMutation({
    mutationFn: () => {
      const weight = scaleWeight || parseFloat(manualWeight);
      if (!weight || !scanResult?.entity?.id) throw new Error('Missing data');
      const payload: any = { weight, weightUnit: 'g', zoneId: selectedZone || scanResult.entity.currentZone?.id };
      if (selectedAction === 'handover') payload.incomingHandlerId = selectedHandler;
      if (selectedAction === 'move') payload.toZoneId = selectedZone;
      return api.post(`/containers/${scanResult.entity.id}/${selectedAction}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['containers'] });
      addToast('success', `${selectedAction?.toUpperCase()} recorded — ${scaleWeight || manualWeight}g`);
      setStep('done');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Action failed'),
  });

  // Camera controls
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setStreaming(true); }
    } catch { addToast('error', 'Camera access denied'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }, []);

  const capture = useCallback((purpose: 'identify' | 'scale') => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    c.toBlob((blob) => {
      if (!blob) return;
      stopCamera();
      if (purpose === 'identify') { setStep('scanning'); scanMut.mutate(blob); }
      else { setStep('weighing'); scaleMut.mutate(blob); }
    }, 'image/jpeg', 0.85);
  }, [stopCamera, scanMut, scaleMut]);

  const reset = () => {
    setStep('idle'); setScanResult(null); setSelectedAction(null); setSelectedZone('');
    setSelectedHandler(''); setScaleWeight(null); setManualWeight(''); setCapturedImage(null); setScalePhoto(null);
  };

  const finalWeight = scaleWeight || (manualWeight ? parseFloat(manualWeight) : null);
  const lastWeight = scanResult?.entity?.events?.[0]?.weight;
  const variance = lastWeight && finalWeight ? ((lastWeight - finalWeight) / lastWeight * 100) : null;
  const Icon = scanResult?.scan?.type ? ICONS[scanResult.scan.type] || Camera : Camera;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Scan & Weigh</h1>
        {step !== 'idle' && <button onClick={reset} className="text-white/40 hover:text-white flex items-center gap-1 text-sm"><RotateCcw size={14} /> Start Over</button>}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {['Scan Label', 'Action', 'Weigh', 'Confirm'].map((s, i) => {
          const stepIndex = { idle: -1, scanning: 0, identified: 0, 'select-action': 1, weigh: 2, weighing: 2, confirm: 3, done: 4 }[step] ?? -1;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-white/10'}`} />
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Scan the label ── */}
      {(step === 'idle' || step === 'scanning') && (
        <div className="space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
            {!streaming && step === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Camera size={36} className="text-primary" />
                </div>
                <p className="text-white/50 text-sm text-center">Point at the QR label on a container, plant tag, or batch sticker</p>
                <button onClick={startCamera} className="px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold transition flex items-center gap-2">
                  <Camera size={18} /> Scan Label
                </button>
              </div>
            )}
            <video ref={videoRef} className={`w-full h-full object-cover ${streaming ? '' : 'hidden'}`} playsInline muted />
            {capturedImage && !streaming && <img src={capturedImage} alt="" className="w-full h-full object-cover" />}
            {step === 'scanning' && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                <Loader2 size={40} className="text-primary animate-spin" />
                <p className="text-white/70 text-sm">Identifying...</p>
              </div>
            )}
            {streaming && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button onClick={() => capture('identify')} className="w-16 h-16 rounded-full bg-white/90 border-4 border-primary shadow-lg active:scale-95 transition">
                  <div className="w-12 h-12 rounded-full bg-primary mx-auto" />
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      {/* ── Identified — non-container (plant/batch) ── */}
      {step === 'identified' && scanResult?.matched && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Icon size={20} className="text-primary" />
              <span className="text-lg font-bold font-mono text-white">{scanResult.scan.identifier}</span>
              <span className="text-xs text-white/30 ml-auto">{(scanResult.scan.confidence * 100).toFixed(0)}%</span>
            </div>
            {scanResult.entity?.strain && <p className="text-sm text-white/50">{scanResult.entity.strain} — {scanResult.entity.phase || scanResult.entity.status}</p>}
          </div>
          <button onClick={() => navigate(`/${scanResult.scan.type}s/${scanResult.entity.id}`)}
            className="w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition">
            View Details <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── STEP 2: Select action (container only) ── */}
      {step === 'select-action' && scanResult?.entity && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Box size={20} className="text-primary" />
              <div>
                <span className="font-bold font-mono text-white">{scanResult.scan.identifier}</span>
                <span className="text-xs text-white/40 ml-2">{scanResult.entity.containerType} — {scanResult.entity.status}</span>
              </div>
            </div>
            {lastWeight && <p className="text-xs text-white/40 mt-1">Last weight: <span className="font-mono text-white/60">{lastWeight.toFixed(1)}g</span></p>}
          </div>

          <p className="text-sm text-white/50">What are you doing with this container?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACTIONS.map(a => (
              <button key={a.id} onClick={() => { setSelectedAction(a.id); setStep('weigh'); }}
                className={`p-4 rounded-xl border text-left transition active:scale-[0.97] border-white/10 bg-white/5 hover:border-white/20 min-h-[56px] flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2`}>
                <a.icon size={22} className={`text-${a.color} sm:mb-1 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{a.label}</div>
                  <div className="text-xs text-white/40 mt-0.5 hidden sm:block">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {(selectedAction === 'move') && (
            <div>
              <label className="block text-sm text-white/50 mb-1">Destination zone</label>
              <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none">
                <option value="">Select zone</option>
                {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Weigh — photograph the scale ── */}
      {(step === 'weigh' || step === 'weighing') && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-white/50 mb-1">Container: <span className="font-mono text-primary">{scanResult?.scan.identifier}</span></p>
            <p className="text-sm text-white/50">Action: <span className="text-white font-semibold">{selectedAction?.toUpperCase()}</span></p>
          </div>

          <p className="text-sm text-white/60 font-semibold">Now photograph the scale display:</p>

          <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
            {!streaming && step === 'weigh' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Scale size={28} className="text-amber-400" />
                </div>
                <p className="text-white/50 text-sm text-center">Point at the scale display. Hold steady.</p>
                <button onClick={startCamera} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-semibold transition flex items-center gap-2">
                  <Camera size={18} /> Open Camera
                </button>
                <button onClick={() => setStep('confirm')} className="text-white/30 text-sm hover:text-white/60">
                  Or enter weight manually →
                </button>
              </div>
            )}
            <video ref={videoRef} className={`w-full h-full object-cover ${streaming ? '' : 'hidden'}`} playsInline muted />
            {capturedImage && !streaming && step === 'weighing' && <img src={capturedImage} alt="" className="w-full h-full object-cover" />}
            {step === 'weighing' && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                <Loader2 size={40} className="text-amber-400 animate-spin" />
                <p className="text-white/70 text-sm">Reading scale...</p>
              </div>
            )}
            {streaming && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button onClick={() => capture('scale')} className="w-16 h-16 rounded-full bg-white/90 border-4 border-amber-500 shadow-lg active:scale-95 transition">
                  <div className="w-12 h-12 rounded-full bg-amber-500 mx-auto" />
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm weight + submit ── */}
      {step === 'confirm' && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Container</span>
              <span className="font-mono text-primary">{scanResult?.scan.identifier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Action</span>
              <span className="text-white font-semibold">{selectedAction?.toUpperCase()}</span>
            </div>
            {lastWeight && (
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Previous weight</span>
                <span className="font-mono text-white/60">{lastWeight.toFixed(1)}g</span>
              </div>
            )}
          </div>

          {/* Weight display / input */}
          {scaleWeight ? (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center">
              <p className="text-xs text-primary mb-1">Scale reading (AI)</p>
              <p className="text-4xl font-bold font-mono text-white">{scaleWeight.toFixed(1)}<span className="text-lg text-white/40">g</span></p>
              <button onClick={() => { setScaleWeight(null); }} className="text-xs text-white/30 mt-2 hover:text-white/60">Wrong? Enter manually</button>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-white/50 mb-1">Enter weight (grams)</label>
              <input type="number" step="0.1" value={manualWeight} onChange={e => setManualWeight(e.target.value)}
                placeholder="0.0" autoFocus
                className="w-full px-4 py-4 bg-dark border border-white/10 rounded-xl text-white text-center text-3xl font-mono focus:border-primary focus:outline-none" />
            </div>
          )}

          {/* Variance warning */}
          {variance !== null && Math.abs(variance) > 5 && (
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${variance > 15 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <AlertTriangle size={20} className={variance > 15 ? 'text-red-400' : 'text-amber-400'} />
              <div>
                <p className={`text-sm font-semibold ${variance > 15 ? 'text-red-400' : 'text-amber-400'}`}>
                  {variance.toFixed(1)}% weight change detected
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {lastWeight?.toFixed(1)}g → {finalWeight?.toFixed(1)}g.
                  {variance > 15 ? ' This will trigger a CRITICAL anomaly alert to all senior staff.' : ' Within expected range for drying.'}
                </p>
              </div>
            </div>
          )}

          {/* Zone selector for move */}
          {selectedAction === 'move' && !selectedZone && (
            <div>
              <label className="block text-sm text-white/50 mb-1">Destination zone</label>
              <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none">
                <option value="">Select zone</option>
                {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          )}

          {/* Submit */}
          <button onClick={() => actionMut.mutate()} disabled={!finalWeight || actionMut.isPending || (selectedAction === 'move' && !selectedZone)}
            className="w-full py-4 bg-primary hover:bg-primary-light text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-[0.98]">
            {actionMut.isPending ? <Loader2 size={20} className="animate-spin" /> : (
              <><CheckCircle size={20} /> Confirm {selectedAction?.toUpperCase()} — {finalWeight?.toFixed(1)}g</>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 5: Done ── */}
      {step === 'done' && (
        <div className="text-center space-y-6 py-8">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Recorded</h2>
            <p className="text-white/50 mt-1">{scanResult?.scan.identifier} — {selectedAction?.toUpperCase()} — {finalWeight?.toFixed(1)}g</p>
          </div>
          {variance !== null && Math.abs(variance) > 15 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 text-sm font-semibold">Weight variance alert has been sent to all senior staff.</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold transition">
              Scan Next
            </button>
            <button onClick={() => navigate(`/containers/${scanResult?.entity?.id}`)}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl font-semibold hover:bg-white/10 transition">
              View Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
