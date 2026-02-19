// P40 — Reusable FAQ accordion — vanilla-matched green gradient headers
import { useState } from 'react';

export default function FAQAccordion({ items = [] }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-5">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-[10px] border-2 transition-all text-left"
              style={{
                background: isOpen
                  ? 'linear-gradient(135deg, #D97706 0%, #B8922D 100%)'
                  : 'linear-gradient(135deg, #6D28D9, #1E1E1E)',
                borderColor: isOpen ? '#1E1E1E' : '#7C3AED',
                borderRadius: isOpen ? '10px 10px 0 0' : '10px',
              }}
            >
              <span className="text-[1.1rem] font-bold pr-4" style={{ color: isOpen ? '#1E1E1E' : '#0A0A0A' }}>
                {item.q}
              </span>
              <svg
                className="w-5 h-5 shrink-0 transition-transform duration-300"
                style={{ color: isOpen ? '#1E1E1E' : '#0A0A0A', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: isOpen ? '500px' : '0',
                padding: isOpen ? '20px' : '0 20px',
                background: '#fff',
                border: isOpen ? '2px solid #7C3AED' : '2px solid transparent',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
              }}
            >
              {isOpen && (
                <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
