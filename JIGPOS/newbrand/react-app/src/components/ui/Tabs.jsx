export default function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 border-b-2 border-gray-200 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const key = tab.key || tab;
        const label = tab.label || tab;
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`
              px-5 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap
              transition-all duration-300 border-b-3 -mb-[2px] font-body
              ${
                isActive
                  ? 'border-or-gold text-white'
                  : 'border-transparent text-gray-500 hover:text-or-gold hover:border-or-gold/40'
              }
            `}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
