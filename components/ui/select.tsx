import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: ReactNode;
  /** Visual density. 'sm' is used for compact, field-dense forms. Defaults to 'md' (unchanged behavior). */
  uiSize?: 'sm' | 'md';
}

const selectSizeClasses = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2',
};

const selectLabelSizeClasses = {
  sm: 'text-xs mb-0.5',
  md: 'text-sm mb-1',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, children, uiSize = 'md', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={`block font-medium text-gray-700 ${selectLabelSizeClasses[uiSize]}`}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${selectSizeClasses[uiSize]} ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
