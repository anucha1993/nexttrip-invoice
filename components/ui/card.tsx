import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual density. 'sm' tightens padding for compact, field-dense forms. Defaults to 'md' (unchanged behavior). */
  padding?: 'sm' | 'md';
}

const headerPaddingClasses = {
  sm: 'px-4 py-2.5',
  md: 'px-6 py-4',
};

const contentPaddingClasses = {
  sm: 'px-4 py-3',
  md: 'px-6 py-4',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-xl border border-gray-300 shadow-sm ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className = '', children, padding = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${headerPaddingClasses[padding]} border-b border-gray-300 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className = '', children, padding = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${contentPaddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-t border-gray-200 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
