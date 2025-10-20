import { cn } from '../../utils/helpers';

const Input = ({ 
  label, 
  error, 
  helperText,
  className,
  containerClassName,
  ...props 
}) => {
  return (
    <div className={cn('mb-4', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-dark-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all',
          error ? 'border-red-500 focus:ring-red-500' : 'border-dark-300 focus:border-primary',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-dark-500">{helperText}</p>}
    </div>
  );
};

export default Input;
