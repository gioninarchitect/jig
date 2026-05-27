export default function Card({ header, footer, children, hoverable = false, className = '' }) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200
        overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
        ${hoverable ? 'hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:border-or-gold' : ''}
        ${className}
      `}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {typeof header === 'string' ? (
            <h3 className="font-heading text-xl text-white uppercase">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div>}
    </div>
  );
}
