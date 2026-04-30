import { useState, useRef } from 'react';
import { Camera, X, Image } from 'lucide-react';

export default function PhotoCapture({ onCapture, label }: { onCapture: (dataUrl: string) => void; label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setStreaming(true); }
    } catch { fileRef.current?.click(); }
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.8);
    setPreview(dataUrl);
    onCapture(dataUrl);
    stopCamera();
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const url = reader.result as string; setPreview(url); onCapture(url); };
    reader.readAsDataURL(file);
  }

  function clear() { setPreview(null); onCapture(''); }

  return (
    <div className="mb-4">
      <label className="block text-sm text-white/50 mb-1.5">{label || 'Photo Proof'}</label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="Captured" className="w-full h-40 object-cover rounded-xl" />
          <button onClick={clear} className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white/80 hover:text-white">
            <X size={14} />
          </button>
        </div>
      ) : streaming ? (
        <div className="relative rounded-xl overflow-hidden">
          <video ref={videoRef} className="w-full h-40 object-cover rounded-xl" playsInline muted />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <button onClick={capture} className="w-14 h-14 rounded-full bg-white/90 border-4 border-primary shadow-lg active:scale-95">
              <div className="w-10 h-10 rounded-full bg-primary mx-auto" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={startCamera} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition min-h-[44px]">
            <Camera size={16} /> Take Photo
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition min-h-[44px]">
            <Image size={16} /> Upload
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
