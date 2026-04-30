import { useOfflineStore } from '../stores/offlineStore';
import { WifiOff, RefreshCw, Cloud } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, queue, syncing, syncQueue } = useOfflineStore();

  if (isOnline && queue.length === 0) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[70] flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold ${isOnline ? 'bg-amber-500/90 text-black' : 'bg-red-600/90 text-white'}`}>
      {!isOnline && (
        <>
          <WifiOff size={14} />
          <span>You're offline — changes will sync when connected</span>
          {queue.length > 0 && <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full">{queue.length} queued</span>}
        </>
      )}
      {isOnline && queue.length > 0 && (
        <>
          <Cloud size={14} />
          <span>{syncing ? 'Syncing...' : `${queue.length} action${queue.length > 1 ? 's' : ''} to sync`}</span>
          {!syncing && (
            <button onClick={syncQueue} className="ml-2 px-2 py-0.5 bg-black/20 rounded flex items-center gap-1 hover:bg-black/30">
              <RefreshCw size={10} /> Sync Now
            </button>
          )}
        </>
      )}
    </div>
  );
}
