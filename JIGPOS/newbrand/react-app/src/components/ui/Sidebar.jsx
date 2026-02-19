export default function Sidebar({ open, onClose, items = [], activeItem, onNavigate, header }) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 bg-jig-slate/70 z-[2000] transition-opacity duration-300
          ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}
        `}
      />

      {/* Drawer */}
      <aside
        className={`
          fixed top-0 left-0 w-[280px] h-screen bg-jig-slate
          border-r-[3px] border-jig-amber z-[2500] flex flex-col
          shadow-[10px_0_50px_rgba(0,0,0,0.3)]
          transition-[left] duration-400 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]
          ${open ? 'left-0' : '-left-[280px]'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200">
          {header || (
            <span className="font-heading text-2xl text-white uppercase">Menu</span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-jig-purple-dark hover:bg-jig-purple/10 transition-colors text-xl"
          >
            &times;
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => {
            const isActive = activeItem === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onClose(); }}
                className={`
                  w-full flex items-center gap-4 px-5 py-4 text-left text-white
                  transition-all duration-300 border-l-[3px]
                  ${
                    isActive
                      ? 'bg-jig-purple/15 border-l-jig-amber font-bold'
                      : 'border-l-transparent hover:bg-jig-purple/10 hover:border-l-jig-amber'
                  }
                `}
              >
                {item.icon && <span className="w-5 text-center text-sm">{item.icon}</span>}
                <span className="text-sm font-body">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
