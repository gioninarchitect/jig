// P21 — POS Shift Manager
// Clock in/out button, break toggle, shift duration timer

import { useState, useEffect } from 'react';

export default function ShiftManager({ shift, onBreak, onClockIn, onClockOut, onToggleBreak }) {
  const [duration, setDuration] = useState('');

  // Update duration every minute
  useEffect(() => {
    if (!shift) { setDuration(''); return; }
    const calc = () => {
      const ms = Date.now() - new Date(shift.startTime || shift.clockIn || shift.createdAt).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setDuration(`${h}h ${m}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [shift]);

  return (
    <div className="flex items-center gap-2">
      {/* Clock In/Out */}
      <button
        onClick={shift ? onClockOut : onClockIn}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          shift ? 'bg-jig-purple text-white' : 'bg-jig-amber text-white'
        }`}
        title={shift ? 'Clock Out' : 'Clock In'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{shift ? 'IN' : 'OUT'}</span>
      </button>

      {/* Duration */}
      {shift && duration && (
        <span className="text-xs text-white/60">{duration}</span>
      )}

      {/* Break */}
      {shift && (
        <button
          onClick={onToggleBreak}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            onBreak ? 'bg-jig-amber text-white' : 'bg-white/15 text-white/70 hover:bg-white/25'
          }`}
          title={onBreak ? 'End Break' : 'Take Break'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {onBreak
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          </svg>
        </button>
      )}
    </div>
  );
}
