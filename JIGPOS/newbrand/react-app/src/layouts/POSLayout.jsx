export default function POSLayout({ header, children }) {
  return (
    <div className="h-screen flex flex-col font-body overflow-hidden" style={{ background: '#1a1a2e' }}>
      {/* Header — Odyssey dark navy with gold border */}
      {header && (
        <div
          className="flex-shrink-0 text-white px-4 py-2.5 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            borderBottom: '3px solid #D97706',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {header}
        </div>
      )}

      {/* Full-screen content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
