const styles = {
  active: 'bg-or-gold text-gray-100',
  pending: 'bg-or-gold text-white',
  approved: 'bg-or-gold text-gray-100',
  rejected: 'bg-origin-red text-gray-100',
  processing: 'bg-or-gold text-white',
  completed: 'bg-or-gold-dark text-gray-100',
  paid: 'bg-or-gold-dark text-gray-100',
  redeemed: 'bg-or-gold-light text-gray-100',
  info: 'bg-info text-white',
  warning: 'bg-warning text-gray-900',
  error: 'bg-error text-white',
  success: 'bg-success text-white',
};

export default function Badge({ status = 'info', children, className = '' }) {
  return (
    <span
      className={`
        inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide
        ${styles[status] || styles.info} ${className}
      `}
    >
      {children}
    </span>
  );
}
