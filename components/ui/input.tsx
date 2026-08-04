import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Visual density. 'sm' is used for compact, field-dense forms. Defaults to 'md' (unchanged behavior). */
  uiSize?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2',
};

const labelSizeClasses = {
  sm: 'text-xs mb-0.5',
  md: 'text-sm mb-1',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, uiSize = 'md', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={`block font-medium text-gray-700 ${labelSizeClasses[uiSize]}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${sizeClasses[uiSize]} ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
