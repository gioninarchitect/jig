import { forwardRef } from 'react';

const variants = {
  primary:
    'bg-gradient-to-br from-jig-amber-light via-jig-amber to-jig-amber-dark text-gray-900 shadow-[0_15px_40px_rgba(212,175,55,0.3)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.4)] hover:-translate-y-1 hover:scale-[1.02]',
  secondary:
    'bg-gradient-to-br from-jig-purple-light via-jig-purple to-jig-purple-dark text-white shadow-[0_15px_40px_rgba(58,95,72,0.3)] hover:shadow-[0_20px_50px_rgba(58,95,72,0.4)] hover:-translate-y-1 hover:scale-[1.02]',
  danger:
    'bg-gradient-to-br from-jig-red to-jig-red-dark text-white shadow-[0_15px_40px_rgba(166,52,41,0.3)] hover:shadow-[0_20px_50px_rgba(166,52,41,0.4)] hover:-translate-y-1',
  ghost:
    'bg-transparent border-2 border-jig-purple text-jig-purple hover:bg-jig-purple hover:text-white hover:-translate-y-1',
};

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-body font-bold
        uppercase tracking-wider cursor-pointer transition-all duration-400
        ease-[cubic-bezier(0.175,0.885,0.32,1.275)] relative overflow-hidden
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
