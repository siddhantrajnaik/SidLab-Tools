import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', action }) => (
  <div className={`bg-white rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden print:border-none print:shadow-none ${className}`}>
    {(title || action) && (
      <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center print:bg-white print:px-0 print:border-b-2 print:border-slate-800">
        {title && <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>}
        {action && <div className="print:hidden">{action}</div>}
      </div>
    )}
    <div className="p-8 print:p-0 print:mt-4">{children}</div>
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  unit?: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, unit, rightElement, className = '', ...props }) => (
  <div className={`flex flex-col space-y-2 ${className}`}>
    <label className="text-sm font-semibold text-slate-900 print:text-slate-900 ml-1">{label}</label>
    <div className="relative rounded-2xl shadow-sm group flex">
      <input
        type="number"
        step="any"
        className={`block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-4 text-slate-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 sm:text-sm transition-all duration-200 ease-in-out print:border-none print:shadow-none print:p-0 print:font-bold print:text-lg ${rightElement ? 'pr-20 rounded-r-none border-r-0' : 'pr-12'}`}
        {...props}
      />
      {rightElement ? (
         <div className="bg-slate-50 border-y border-r border-slate-200 rounded-r-2xl flex items-center px-2">
            {rightElement}
         </div>
      ) : unit && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <span className="text-slate-400 font-medium sm:text-sm print:text-slate-900">{unit}</span>
        </div>
      )}
    </div>
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export const Select: React.FC<SelectProps> = ({ label, className = '', children, ...props }) => (
    <div className={`flex flex-col space-y-2 ${className}`}>
        {label && <label className="text-sm font-semibold text-slate-900 ml-1">{label}</label>}
        <div className="relative">
            <select 
                className="block w-full appearance-none rounded-2xl border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-slate-900 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 sm:text-sm transition-all"
                {...props}
            >
                {children}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
        </div>
    </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', icon, className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 border border-transparent",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-transparent",
    outline: "bg-white text-slate-900 hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent shadow-none",
    pink: "bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-500/30 border border-transparent"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-4 text-base"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon && <span className={`mr-2 -ml-1 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`}>{icon}</span>}
      {children}
    </button>
  );
};

export const PageHeader: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between print:mb-6 px-1">
    <div>
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl tracking-tight print:text-4xl">{title}</h1>
      {description && <p className="mt-3 text-lg text-slate-500 print:text-slate-800 font-medium">{description}</p>}
    </div>
    {action && <div className="mt-6 sm:mt-0 print:hidden">{action}</div>}
  </div>
);