export default function Header({ title, user, onMenuClick, onNotificationClick, branchSelector, className = '' }) {
  return (
    <header
      className={`
        bg-white border-b-2 border-or-gold px-4 sm:px-6 py-3 flex items-center justify-between
        sticky top-0 z-[500] ${className}
      `}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white hover:bg-or-gold/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        {title && <h1 className="font-heading text-2xl text-white uppercase">{title}</h1>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {branchSelector}

        {onNotificationClick && (
          <button
            onClick={onNotificationClick}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white hover:bg-or-gold/10 transition-colors relative"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-or-gold flex items-center justify-center text-gray-100 text-xs font-bold uppercase">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white leading-tight">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
