// P27 — Stocktake App
// Dark mobile-first PWA — count sessions, item counting, variance reports, receive stock.
// Camera + OCR (scale weight) + Claude Vision (unit count) — matches vanilla st-camera.js.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { API_URL } from '../../config';

// ─── Theme Constants (vanilla CSS vars) ───────────────────────────
const C = {
  bgDark:    '#1E1E1E',
  bgCard:    '#6D28D9',
  bgInput:   '#7C3AED',
  primary:   '#7C3AED',
  primaryDk: '#6D28D9',
  gold:      '#D97706',
  goldDark:  '#B8922D',
  cream:     '#0A0A0A',
  danger:    '#DC2626',
  success:   '#22c55e',
  border:    '#4A7A5D',
  textPri:   '#ffffff',
  textSec:   '#C5D4CB',
  headerGrad:'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
};

// Base URL for serving uploaded photos (strip /api/v1 from API_URL)
const PHOTO_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

function SvgIcon({ d, size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

// ─── Item type detection (vanilla st-camera.js parity) ───────────
function isItemCountable(item) {
  const cat = (item.product?.category || item.category || '').toLowerCase();
  const tags = item.product?.tags || item.tags || [];
  const pType = (item.product?.productType || item.productType || '').toLowerCase();
  const name = (item.product?.name || item.name || '').toLowerCase();
  const isFlower = cat === 'flower';
  const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack')
    || pType === 'pre-roll' || pType === 'pre-pack'
    || name.includes('pre roll') || name.includes('preroll')
    || name.includes('pre pack') || name.includes('joint');
  return item.isCountable || item.unit === 'units' || !isFlower || isPreRollOrPack;
}

// ─── Category Config ──────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',          label: 'ALL',          icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { key: 'flower',       label: 'FLOWER',       icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { key: 'edibles',      label: 'EDIBLES',      icon: 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546m18 0v2.204a1 1 0 01-1 1H4a1 1 0 01-1-1v-2.204' },
  { key: 'concentrates', label: 'CONCENTRATES', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { key: 'vapes',        label: 'VAPES',        icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636' },
  { key: 'accessories',  label: 'ACCESSORIES',  icon: 'M11.42 15.17l-5.83-3.37a1 1 0 01-.5-.87V6.37a1 1 0 01.5-.87l5.83-3.37a1 1 0 011 0l5.83 3.37a1 1 0 01.5.87v4.56a1 1 0 01-.5.87l-5.83 3.37a1 1 0 01-1 0z' },
];

// ─── Main Component ───────────────────────────────────────────────

export default function StocktakePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('stocktake');
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/stocktake/history');
        const list = res.data?.sessions || res.data?.data || [];
        setSessions(list);
        const active = list.find(s => s.status === 'in_progress');
        if (active) setSession(active);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  async function createSession() {
    try {
      const res = await api.post('/stocktake/session', { type: 'full' });
      const newSession = res.data?.session || res.data;
      setSessions(prev => [newSession, ...prev]);
      setSession(newSession);
      setShowSessionPicker(false);
    } catch { /* handle error */ }
  }

  function selectSession(s) {
    setSession(s);
    setShowSessionPicker(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bgDark }}>
        <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: C.primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-body flex flex-col" style={{ background: C.bgDark, color: C.textPri, paddingBottom: 80 }}>
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-50" style={{ background: C.headerGrad, borderBottom: `3px solid ${C.gold}` }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" size={22} color="white" />
            <span className="font-heading text-xl text-white tracking-wider">STOCK TAKE</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full text-xs" style={{ background: C.bgInput, color: C.textSec }}>
              <SvgIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" size={14} /> {user?.firstName || 'User'}
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setMode('stocktake')}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: mode === 'stocktake' ? C.gold : 'rgba(255,255,255,0.15)',
              color: mode === 'stocktake' ? C.primaryDk : 'white',
            }}
          >
            <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" size={16} />
            Stock Take
          </button>
          <button
            onClick={() => setMode('receive')}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: mode === 'receive' ? C.gold : 'rgba(255,255,255,0.15)',
              color: mode === 'receive' ? C.primaryDk : 'white',
            }}
          >
            <SvgIcon d="M8 7h12l-4 13H4L8 7zm0 0L6 3H3" size={16} />
            Receive Stock
          </button>
        </div>

        {/* Session info bar */}
        {session && (
          <div className="flex gap-4 px-4 pb-2 text-xs" style={{ color: C.textSec }}>
            <span className="flex items-center gap-1">
              <SvgIcon d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" size={12} />
              {session.sessionId || session.name || `#${session._id?.slice(-6)}`}
            </span>
            <span className="flex items-center gap-1">
              <SvgIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" size={12} />
              {session.branch?.name || user?.branch?.name || 'Branch'}
            </span>
          </div>
        )}
      </div>

      {/* ─── Content ───────────────────────────────────────── */}
      {!session ? (
        <SessionPicker
          sessions={sessions}
          onSelect={selectSession}
          onCreate={createSession}
          show={true}
        />
      ) : mode === 'stocktake' ? (
        <StocktakeContent session={session} />
      ) : (
        <ReceiveStockContent />
      )}

      {/* ─── Session Picker Modal ──────────────────────────── */}
      {showSessionPicker && session && (
        <SessionPickerModal
          sessions={sessions}
          onSelect={selectSession}
          onCreate={createSession}
          onClose={() => setShowSessionPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Session Picker (no session selected) ─────────────────────────

function SessionPicker({ sessions, onSelect, onCreate }) {
  const activeSessions = sessions.filter(s => s.status === 'in_progress' || s.status === 'pending');

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <h2 className="font-heading text-xl text-center mb-1" style={{ color: C.gold }}>Stock Take</h2>
        <p className="text-center text-sm mb-6" style={{ color: C.textSec }}>Select or start a stocktake session</p>

        {activeSessions.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold uppercase mb-2" style={{ color: C.textSec }}>Active Sessions</div>
            {activeSessions.map(s => (
              <button
                key={s._id}
                onClick={() => onSelect(s)}
                className="w-full text-left p-3 rounded-lg transition-all"
                style={{ background: C.bgInput, border: '2px solid transparent', color: C.textPri }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <div className="font-bold text-sm">{s.sessionId || s.name || `Session ${s._id?.slice(-6)}`}</div>
                <div className="text-xs mt-1" style={{ color: C.textSec }}>
                  {s.type || 'full'} | {new Date(s.createdAt).toLocaleDateString('en-ZA')}
                  {s.stats?.counted != null && ` | ${s.stats.counted} counted`}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onCreate}
          className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`, color: C.bgDark }}
        >
          <SvgIcon d="M12 4v16m8-8H4" size={16} color={C.bgDark} />
          New Stocktake Session
        </button>
      </div>
    </div>
  );
}

// ─── Session Picker Modal (overlay) ───────────────────────────────

function SessionPickerModal({ sessions, onSelect, onCreate, onClose }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col" style={{ background: C.bgCard, maxHeight: '80vh' }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <span className="font-heading text-lg">Select Session</span>
          <button onClick={onClose} className="text-xl" style={{ color: C.textSec }}>&times;</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {sessions.map(s => (
            <button
              key={s._id}
              onClick={() => onSelect(s)}
              className="w-full text-left p-3 rounded-lg"
              style={{ background: C.bgInput, border: '2px solid transparent', color: C.textPri }}
            >
              <div className="font-bold text-sm">{s.sessionId || s.name || `Session ${s._id?.slice(-6)}`}</div>
              <div className="text-xs mt-1" style={{ color: C.textSec }}>
                {s.type} | {new Date(s.createdAt).toLocaleDateString('en-ZA')} | {s.status}
              </div>
            </button>
          ))}
        </div>
        <div className="p-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCreate} className="w-full py-3 rounded-lg text-sm font-bold" style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`, color: C.bgDark }}>
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stocktake Content (with camera / photo integration) ──────────

function StocktakeContent({ session }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('all'); // all | pending | variance

  // Camera & photo state
  const [cameraTarget, setCameraTarget] = useState(null); // { itemIndex, itemId } | null
  const [photoStates, setPhotoStates] = useState({}); // itemId → { state, photoUrl, detectedValue, ... }

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/stocktake/session/${session._id}`);
        const loadedItems = res.data?.session?.lineItems || res.data?.lineItems || [];
        setItems(loadedItems);

        // Initialise photo states for items that already have photos from previous session visit
        const initial = {};
        loadedItems.forEach(it => {
          if (it.scalePhoto?.url) {
            initial[it._id] = {
              state: 'success', isCountable: false,
              photoUrl: `${PHOTO_BASE}${it.scalePhoto.url}`,
              detectedValue: it.ocrDetectedWeight || null,
              detectedType: 'weight',
              detectedUnit: it.unit || 'g',
            };
          } else if (it.unitPhotos?.length > 0) {
            const last = it.unitPhotos[it.unitPhotos.length - 1];
            initial[it._id] = {
              state: 'success', isCountable: true,
              photoUrl: `${PHOTO_BASE}${last.url}`,
              detectedValue: it.unitCount || last.count || null,
              detectedType: 'count',
            };
          }
        });
        if (Object.keys(initial).length > 0) setPhotoStates(initial);
      } catch { setItems([]); }
      setLoading(false);
    }
    load();
  }, [session._id]);

  // Derived stats
  const counted = items.filter(it => it.status === 'counted' || it.status === 'valid').length;
  const total = items.length;
  const varianceCount = items.filter(it => it.variance && it.variance !== 0).length;
  const validCount = items.filter(it => it.status === 'valid').length;
  const progressPercent = total > 0 ? Math.round((counted / total) * 100) : 0;
  const photoCount = Object.values(photoStates).filter(ps => ps.state === 'success').length;

  // Filter items
  const filtered = items.filter(it => {
    if (search) {
      const s = search.toLowerCase();
      if (!(it.product?.name || it.name || '').toLowerCase().includes(s) && !(it.sku || '').toLowerCase().includes(s)) return false;
    }
    if (category !== 'all') {
      const cat = (it.product?.category || it.category || '').toLowerCase();
      if (!cat.includes(category)) return false;
    }
    if (filter === 'pending' && (it.status === 'counted' || it.status === 'valid')) return false;
    if (filter === 'variance' && (!it.variance || it.variance === 0)) return false;
    return true;
  });

  // Submit manual count
  async function submitCount(itemId, countVal, notes) {
    try {
      const itemIndex = items.findIndex(it => it._id === itemId);
      if (itemIndex === -1) return;
      await api.put(`/stocktake/session/${session._id}/item/${itemIndex}`, { actualQty: Number(countVal), notes });
      setItems(prev => prev.map(it => it._id === itemId
        ? { ...it, actualQty: Number(countVal), status: 'counted', notes, variance: Number(countVal) - (it.systemQuantity || 0) }
        : it
      ));
    } catch { /* handle error */ }
  }

  // ─── Camera handlers ─────────────────────────────────
  function openCamera(itemIndex, itemId) {
    setCameraTarget({ itemIndex, itemId });
  }

  async function handleCapture(blob) {
    if (!cameraTarget) return;
    const { itemIndex, itemId } = cameraTarget;
    const item = items[itemIndex];
    const countable = isItemCountable(item);

    setCameraTarget(null); // close camera modal

    // Set processing state
    setPhotoStates(prev => ({
      ...prev,
      [itemId]: { state: 'processing', isCountable: countable },
    }));

    // Build FormData
    const formData = new FormData();
    formData.append('photo', blob, `${countable ? 'unit' : 'scale'}-${Date.now()}.jpg`);
    if (countable) formData.append('count', '0'); // let Claude Vision detect

    const endpoint = countable
      ? `/stocktake/session/${session._id}/item/${itemIndex}/unit-photo`
      : `/stocktake/session/${session._id}/item/${itemIndex}/photo`;

    try {
      const res = await api.post(endpoint, formData, { timeout: 30000 });
      const data = res.data;

      if (data.success) {
        if (countable) {
          const detectedCount = data.vision?.count || data.totalCount || null;
          const lastPhoto = data.unitPhotos?.[data.unitPhotos.length - 1];
          setPhotoStates(prev => ({
            ...prev,
            [itemId]: {
              state: 'success', isCountable: true,
              photoUrl: lastPhoto?.url ? `${PHOTO_BASE}${lastPhoto.url}` : null,
              detectedValue: detectedCount,
              detectedType: 'count',
            },
          }));
        } else {
          const ocrWeight = data.ocr?.weight || null;
          const ocrUnit = data.ocr?.unit || item.unit || 'g';
          setPhotoStates(prev => ({
            ...prev,
            [itemId]: {
              state: 'success', isCountable: false,
              photoUrl: data.photo?.url ? `${PHOTO_BASE}${data.photo.url}` : null,
              detectedValue: ocrWeight,
              detectedType: 'weight',
              detectedUnit: ocrUnit,
            },
          }));
        }
      } else {
        setPhotoStates(prev => ({
          ...prev,
          [itemId]: { state: 'error', message: data.message || 'Upload failed' },
        }));
      }
    } catch {
      setPhotoStates(prev => ({
        ...prev,
        [itemId]: { state: 'error', message: 'Network error uploading photo' },
      }));
    }
  }

  function handleRetake(itemId) {
    const idx = items.findIndex(it => it._id === itemId);
    if (idx === -1) return;
    setPhotoStates(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    openCamera(idx, itemId);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: C.primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <>
      {/* Progress Bar */}
      <div className="mx-4 mt-4 p-4 rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <div className="flex justify-between text-sm mb-2">
          <span>Progress</span>
          <span>{counted} / {total} items</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: C.bgInput }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${C.primary} 0%, ${C.success} 100%)` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: C.textSec }}>
          <span className="flex items-center gap-1"><SvgIcon d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" size={12} /> Photos: {photoCount}</span>
          <span className="flex items-center gap-1"><SvgIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={12} /> Variance: {varianceCount}</span>
          <span className="flex items-center gap-1"><SvgIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={12} /> Valid: {validCount}</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mt-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textSec }}>
            <SvgIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full py-3 pl-10 pr-4 rounded-xl text-sm"
            style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.textPri }}
          />
        </div>
      </div>

      {/* Category Hierarchy */}
      <div className="px-4 mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              background: category === cat.key
                ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDk} 100%)`
                : C.bgCard,
              border: `1px solid ${category === cat.key ? C.primary : C.border}`,
              color: category === cat.key ? 'white' : C.textSec,
            }}
          >
            <SvgIcon d={cat.icon} size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="px-4 mt-3 space-y-3 pb-4">
        {filtered.map(item => {
          const originalIdx = items.findIndex(it => it._id === item._id);
          return (
            <CountItemCard
              key={item._id}
              item={item}
              itemIndex={originalIdx}
              photoState={photoStates[item._id]}
              onSubmit={submitCount}
              onOpenCamera={openCamera}
              onRetake={handleRetake}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: C.textSec }}>
            <SvgIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={48} />
            <h3 className="mt-3 font-bold">No Items Found</h3>
            <p className="text-xs mt-1">Adjust your filters or search</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-2 px-4 py-3" style={{ background: C.bgCard, borderTop: `1px solid ${C.border}` }}>
        {[
          { key: 'all', label: 'All', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
          { key: 'pending', label: 'Pending', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { key: 'variance', label: 'Variance', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ color: filter === btn.key ? C.primary : C.textSec }}
          >
            <SvgIcon d={btn.icon} size={18} color={filter === btn.key ? C.primary : C.textSec} />
            {btn.label}
          </button>
        ))}
        <button
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-bold"
          style={{ background: C.gold, color: C.primaryDk }}
        >
          <SvgIcon d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={18} color={C.primaryDk} />
          Export
        </button>
      </div>

      {/* Camera Modal */}
      {cameraTarget && (
        <CameraModal
          item={items[cameraTarget.itemIndex]}
          onCapture={handleCapture}
          onClose={() => setCameraTarget(null)}
        />
      )}
    </>
  );
}

// ─── Count Item Card (with camera + photo + accept) ──────────────

function CountItemCard({ item, itemIndex, photoState, onSubmit, onOpenCamera, onRetake }) {
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');

  const isCounted = item.status === 'counted' || item.status === 'valid';
  const variance = isCounted ? (item.counted || 0) - (item.systemQuantity || 0) : null;
  const countable = isItemCountable(item);

  function handleSubmit() {
    if (count === '') return;
    onSubmit(item._id, count, notes);
    setExpanded(false);
  }

  function handleAcceptDetected(value) {
    onSubmit(item._id, value, 'Auto-detected from photo');
    setExpanded(false);
  }

  const borderColor = isCounted
    ? (variance === 0 ? C.success : variance > 0 ? C.gold : C.danger)
    : C.border;

  const hasPhoto = photoState?.state === 'success' && photoState.photoUrl;

  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{ background: C.bgCard, border: `1px solid ${borderColor}` }}>
      {/* Header — always visible */}
      <div className="p-4 flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{item.product?.name || item.name}</span>
            {hasPhoto && (
              <SvgIcon d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" size={14} color={C.gold} />
            )}
          </div>
          <div className="text-xs mt-0.5" style={{ color: C.textSec }}>
            {item.sku || '--'} | {item.product?.category || item.category || '--'}
            {countable ? ' | units' : ' | weight'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isCounted ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{
                background: variance === 0 ? 'rgba(34,197,94,0.2)' : variance > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                color: variance === 0 ? C.success : variance > 0 ? C.gold : C.danger,
              }}
            >
              {variance === 0 ? 'Valid' : 'Variance'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: C.bgInput, color: C.textSec }}>Pending</span>
          )}
          <div className="text-xs" style={{ color: C.textSec }}>Exp: {item.systemQuantity ?? '--'}</div>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="pt-3 space-y-3">

            {/* ─── Camera / Photo Section ─────────────────── */}
            {!isCounted && (
              <PhotoSection
                photoState={photoState}
                countable={countable}
                itemId={item._id}
                itemIndex={itemIndex}
                onOpenCamera={onOpenCamera}
                onRetake={onRetake}
                onAccept={handleAcceptDetected}
              />
            )}

            {/* Already counted — show photo thumbnail if exists */}
            {isCounted && hasPhoto && (
              <div className="rounded-lg overflow-hidden" style={{ background: C.bgInput }}>
                <img src={photoState.photoUrl} alt="Capture" className="w-full h-24 object-cover opacity-70" />
              </div>
            )}

            {/* Weight / Count Input */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: C.textSec }}>Count Quantity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={isCounted ? (item.counted ?? '') : count}
                  onChange={e => setCount(e.target.value)}
                  disabled={isCounted}
                  placeholder="0"
                  className="flex-1 text-center text-xl font-bold py-3 rounded-lg"
                  style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPri }}
                />
                <span className="text-sm" style={{ color: C.textSec, minWidth: 40 }}>{countable ? 'units' : 'g'}</span>
              </div>
            </div>

            {/* Variance display */}
            {(isCounted || count !== '') && (
              <VarianceDisplay
                system={item.systemQuantity || 0}
                counted={isCounted ? (item.counted || 0) : Number(count) || 0}
              />
            )}

            {/* Notes */}
            {!isCounted && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.textSec }}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Reason for variance, condition notes..."
                  className="w-full py-2 px-3 rounded-lg text-sm resize-y"
                  style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPri, minHeight: 50 }}
                />
              </div>
            )}

            {/* Actions */}
            {!isCounted && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => setExpanded(false)} className="flex-1 py-3 rounded-lg text-sm font-bold" style={{ background: C.bgInput, color: C.textPri, border: `1px solid ${C.border}` }}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={count === ''}
                  className="flex-1 py-3 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`, color: C.bgDark }}
                >
                  Confirm Count
                </button>
              </div>
            )}

            {isCounted && item.notes && (
              <div className="text-xs p-2 rounded-lg" style={{ background: C.bgInput, color: C.textSec }}>
                Notes: {item.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Photo Section (camera button / processing / result / accept) ─

function PhotoSection({ photoState, countable, itemId, itemIndex, onOpenCamera, onRetake, onAccept }) {
  // No photo taken yet
  if (!photoState || photoState.state === 'idle') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onOpenCamera(itemIndex, itemId); }}
        className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
        style={{ background: C.bgInput, border: `1px dashed ${C.border}`, color: C.textSec }}
      >
        <SvgIcon d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" size={16} />
        {countable ? 'Take Photo (Count Units)' : 'Take Photo (Read Scale)'}
      </button>
    );
  }

  // Processing (uploading + AI analysis)
  if (photoState.state === 'processing') {
    return (
      <div className="py-6 text-center rounded-lg" style={{ background: C.bgInput }}>
        <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: C.success, borderTopColor: 'transparent' }} />
        <div className="text-sm" style={{ color: C.textSec }}>Uploading & processing...</div>
        <div className="text-xs mt-1" style={{ color: C.textSec }}>
          {photoState.isCountable ? 'Claude Vision counting items...' : 'OCR reading scale weight...'}
        </div>
      </div>
    );
  }

  // Error — tap to retry
  if (photoState.state === 'error') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onOpenCamera(itemIndex, itemId); }}
        className="w-full py-4 rounded-lg text-center"
        style={{ background: C.bgInput, border: `1px dashed ${C.danger}` }}
      >
        <div className="flex justify-center mb-1">
          <SvgIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={20} color={C.danger} />
        </div>
        <div className="text-xs" style={{ color: C.danger }}>{photoState.message || 'Upload failed'}</div>
        <div className="text-xs mt-1" style={{ color: C.textSec }}>Tap to retry</div>
      </button>
    );
  }

  // Success — photo thumbnail + detected value + accept
  if (photoState.state === 'success') {
    return (
      <div className="space-y-3">
        {/* Photo thumbnail with retake */}
        <div className="relative rounded-lg overflow-hidden" style={{ background: C.bgInput }}>
          {photoState.photoUrl && (
            <img src={photoState.photoUrl} alt="Captured" className="w-full h-32 object-cover" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRetake(itemId); }}
            className="absolute top-2 right-2 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
          >
            <SvgIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={12} />
            Retake
          </button>
        </div>

        {/* Detected value — big green accept block */}
        {photoState.detectedValue != null && photoState.detectedValue > 0 && (
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(34,197,94,0.1)', border: `2px solid ${C.success}` }}>
            <div className="text-xs font-bold mb-1 flex items-center justify-center gap-1" style={{ color: C.success }}>
              <SvgIcon d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" size={14} color={C.success} />
              {photoState.detectedType === 'count' ? 'DETECTED UNIT COUNT' : 'OCR DETECTED WEIGHT'}
            </div>
            <div className="font-heading text-4xl mb-3" style={{ color: C.success }}>
              {photoState.detectedValue} {photoState.detectedType === 'count'
                ? (photoState.detectedValue === 1 ? 'unit' : 'units')
                : (photoState.detectedUnit || 'g')}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(photoState.detectedValue); }}
              className="w-full py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: C.success, color: 'white' }}
            >
              <SvgIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color="white" />
              ACCEPT & NEXT ITEM
            </button>
          </div>
        )}

        {/* No detected value — camera worked but AI couldn't determine */}
        {(photoState.detectedValue == null || photoState.detectedValue <= 0) && (
          <div className="rounded-lg p-3 text-center text-xs" style={{ background: C.bgInput, color: C.textSec }}>
            Photo captured — enter count manually below
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Variance Display ─────────────────────────────────────────────

function VarianceDisplay({ system, counted }) {
  const variance = counted - system;
  const isPositive = variance > 0;
  const isNegative = variance < 0;
  const isZero = variance === 0;

  return (
    <div className="flex justify-between items-center p-3 rounded-lg" style={{
      background: isZero ? 'rgba(160,160,176,0.1)' : isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      color: isZero ? C.textSec : isPositive ? C.success : C.danger,
    }}>
      <span className="text-xs font-bold">Variance</span>
      <span className="text-sm font-bold">
        {isPositive ? '+' : ''}{variance} {isZero ? '(Match)' : isPositive ? '(Over)' : '(Short)'}
      </span>
    </div>
  );
}

// ─── Receive Stock Content ────────────────────────────────────────

function ReceiveStockContent() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [receiveItems, setReceiveItems] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchTimeout = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setResults(res.data?.products || res.data?.data || []);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(val), 300);
  }

  function addItem(product) {
    if (receiveItems.find(r => r.product._id === product._id)) return;
    setReceiveItems(prev => [...prev, { product, quantity: '', notes: '' }]);
    setSearch('');
    setResults([]);
  }

  function updateItem(productId, field, value) {
    setReceiveItems(prev => prev.map(r => r.product._id === productId ? { ...r, [field]: value } : r));
  }

  function removeItem(productId) {
    setReceiveItems(prev => prev.filter(r => r.product._id !== productId));
  }

  async function submitReceive() {
    const items = receiveItems.filter(r => r.quantity && Number(r.quantity) > 0);
    if (items.length === 0) return;
    try {
      await api.post('/stocktake/receive', {
        items: items.map(r => ({ productId: r.product._id, quantity: Number(r.quantity), notes: r.notes })),
      });
      setReceiveItems([]);
    } catch { /* handle error */ }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Product search */}
      <div className="p-4 rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <SvgIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={16} />
          Find Product to Receive
        </h3>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textSec }}>
            <SvgIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={14} />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full py-3 pl-10 pr-4 rounded-xl text-sm"
            style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPri }}
          />
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
            {results.map(p => (
              <button
                key={p._id}
                onClick={() => addItem(p)}
                className="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between"
                style={{ background: C.bgInput }}
              >
                <div>
                  <span className="font-bold" style={{ color: C.textPri }}>{p.name}</span>
                  <span className="ml-2" style={{ color: C.textSec }}>{p.sku}</span>
                </div>
                <SvgIcon d="M12 4v16m8-8H4" size={14} color={C.gold} />
              </button>
            ))}
          </div>
        )}
        {searching && <div className="mt-2 text-xs text-center" style={{ color: C.textSec }}>Searching...</div>}
      </div>

      {/* Items to receive */}
      <div className="rounded-xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <div className="p-3 flex items-center justify-between" style={{ background: C.primary, color: 'white' }}>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" size={16} />
            Items to Receive
          </h2>
          <span className="text-xs">{receiveItems.length} items</span>
        </div>

        {receiveItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: C.textSec }}>
            <SvgIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={40} />
            <p className="text-xs mt-2">Search and add products above</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {receiveItems.map(r => (
              <div key={r.product._id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold">{r.product.name}</div>
                    <div className="text-[10px]" style={{ color: C.textSec }}>{r.product.sku}</div>
                  </div>
                  <button onClick={() => removeItem(r.product._id)} style={{ color: C.danger }}>
                    <SvgIcon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={r.quantity}
                    onChange={e => updateItem(r.product._id, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-20 text-center py-2 rounded-lg text-sm font-bold"
                    style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPri }}
                  />
                  <input
                    type="text"
                    value={r.notes}
                    onChange={e => updateItem(r.product._id, 'notes', e.target.value)}
                    placeholder="Notes..."
                    className="flex-1 py-2 px-3 rounded-lg text-xs"
                    style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPri }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {receiveItems.length > 0 && (
          <div className="p-3" style={{ borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={submitReceive}
              className="w-full py-3 rounded-lg text-sm font-bold"
              style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`, color: C.bgDark }}
            >
              Receive {receiveItems.filter(r => r.quantity && Number(r.quantity) > 0).length} Items
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Camera Modal (full-screen rear camera) ──────────────────────

function CameraModal({ item, onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const countable = isItemCountable(item);

  // Start camera on mount, stop on unmount
  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { if (mounted) setReady(true); };
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (mounted) onClose();
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    setCapturing(true);
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      // Stop camera tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      onCapture(blob);
    }, 'image/jpeg', 0.85);
  }

  function handleClose() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Guide overlay frame */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%', maxWidth: 400, aspectRatio: '4/3',
        border: `2px solid rgba(212,175,55,0.6)`, borderRadius: 16,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', bottom: -28, left: 0, right: 0,
          textAlign: 'center', color: C.gold, fontSize: 12, fontWeight: 600,
        }}>
          {countable ? 'Position items in the frame' : 'Position scale display in the frame'}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)', border: 'none',
          color: 'white', fontSize: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        &times;
      </button>

      {/* Product name badge */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 64,
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(0,0,0,0.5)', color: 'white',
        fontSize: 12, fontWeight: 600,
      }}>
        {item.product?.name || item.name}
      </div>

      {/* Mode indicator */}
      <div style={{
        position: 'absolute', top: 56, left: 16,
        padding: '4px 10px', borderRadius: 16,
        background: countable ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.3)',
        color: 'white', fontSize: 10, fontWeight: 700,
      }}>
        {countable ? 'UNIT COUNT (Vision)' : 'SCALE WEIGHT (OCR)'}
      </div>

      {/* Capture button */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={handleCapture}
          disabled={!ready || capturing}
          style={{
            width: 70, height: 70, borderRadius: '50%',
            background: ready ? C.gold : 'rgba(255,255,255,0.3)',
            border: '4px solid white',
            cursor: ready ? 'pointer' : 'default',
            opacity: capturing ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {capturing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <SvgIcon d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" size={28} color="white" />
          )}
        </button>
      </div>
    </div>
  );
}
