import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, type = 'text', className = '', ...props },
  ref
) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`
          w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base
          text-gray-900 font-body transition-all duration-300
          focus:outline-none focus:border-jig-amber focus:shadow-[0_0_0_4px_rgba(124,58,237,0.15)]
          placeholder:text-gray-400
          ${error ? 'border-jig-red focus:border-jig-red focus:shadow-[0_0_0_4px_rgba(166,52,41,0.15)]' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-jig-red font-medium">{error}</p>}
    </div>
  );
});

export default Input;
