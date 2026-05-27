export default function LoadingSpinner({ size = 'md', label, className = '' }) {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-20 w-20 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizes[size]} border-or-gold border-t-transparent
          rounded-full animate-spin
        `}
      />
      {label && <p className="text-sm text-or-gold-light font-body">{label}</p>}
    </div>
  );
}
