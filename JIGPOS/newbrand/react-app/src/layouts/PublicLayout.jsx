export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-jig-purple via-jig-purple-dark to-jig-slate font-body">
      {/* Brand header */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="w-10 h-10 bg-gradient-to-br from-jig-amber to-jig-amber-dark rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-heading text-lg">D</span>
        </div>
        <div>
          <div className="font-heading text-lg text-white uppercase leading-none">JIG Craft Cannabis</div>
          <div className="font-accent text-[0.65rem] text-white/80 italic tracking-wider">Quality Counts</div>
        </div>
      </div>

      {/* Centered content */}
      <div className="flex items-center justify-center px-4 pb-8" style={{ minHeight: 'calc(100vh - 72px)' }}>
        {children}
      </div>
    </div>
  );
}
