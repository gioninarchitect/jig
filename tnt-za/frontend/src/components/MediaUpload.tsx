import { useRef, useState } from 'react';
import { Camera, Video, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useToastStore } from '../stores/toastStore';

const isVideo = (url: string) => /\.(mp4|mov|webm|m4v|3gp)$/i.test(url);

// Reusable photo + short-video capture/upload for cultivation proof.
// `value` is an array of /uploads/media URLs; `onChange` gets the updated array.
// On a phone the buttons open the camera directly (capture attribute).
export default function MediaUpload({
  value = [], onChange, max = 6, label = 'Photo / video proof',
}: { value?: string[]; onChange: (urls: string[]) => void; max?: number; label?: string }) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const upload = async (file?: File | null) => {
    if (!file) return;
    if (value.length >= max) { addToast('error', `Max ${max} files`); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/media/upload', fd);
      if (r.data?.url) onChange([...value, r.data.url]);
      else addToast('error', 'Upload failed');
    } catch (e: any) {
      addToast('error', e.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
      if (photoRef.current) photoRef.current.value = '';
      if (videoRef.current) videoRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/15 bg-black">
            {isVideo(url)
              ? <video src={url} className="w-full h-full object-cover" muted playsInline />
              : <img src={url} className="w-full h-full object-cover" alt="" />}
            {isVideo(url) && <Video size={12} className="absolute bottom-0.5 left-0.5 text-white drop-shadow" />}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-0 right-0 bg-black/70 text-white rounded-bl-lg p-0.5"><X size={11} /></button>
          </div>
        ))}
        {value.length < max && (
          <>
            <button type="button" onClick={() => photoRef.current?.click()} disabled={busy}
              className="w-16 h-16 rounded-lg border border-dashed border-white/25 flex flex-col items-center justify-center gap-0.5 text-white/50 hover:border-primary hover:text-primary transition disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              <span className="text-[9px]">Photo</span>
            </button>
            <button type="button" onClick={() => videoRef.current?.click()} disabled={busy}
              className="w-16 h-16 rounded-lg border border-dashed border-white/25 flex flex-col items-center justify-center gap-0.5 text-white/50 hover:border-primary hover:text-primary transition disabled:opacity-50">
              <Video size={16} />
              <span className="text-[9px]">Video</span>
            </button>
          </>
        )}
      </div>
      <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={e => upload(e.target.files?.[0])} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={e => upload(e.target.files?.[0])} />
    </div>
  );
}
