import React from 'react';

/** Shared class tokens for admin product forms — matches storefront coral/gold palette */
export const formSelectClass =
  'w-full rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface px-3 py-2.5 text-sm text-brand-primary shadow-sm transition-colors hover:border-gray-300 dark:hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent';

export const formTextareaClass =
  'w-full min-h-[112px] rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface px-3 py-2.5 text-sm text-brand-primary shadow-sm transition-colors placeholder:text-brand-secondary/70 hover:border-gray-300 dark:hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent';

export const formInputClass = 'border border-gray-200 dark:border-white/20 shadow-sm';

export const toggleBtnActive =
  'bg-brand-accent text-white shadow-md shadow-brand-accent/20 border border-brand-accent';

export const toggleBtnInactive =
  'bg-white dark:bg-brand-surface text-brand-secondary border border-gray-200 dark:border-white/15 hover:text-brand-primary hover:border-gray-300 dark:hover:border-white/25';

export const chipSelected =
  'bg-brand-accent text-white border-brand-accent shadow-md shadow-brand-accent/25';

export const chipUnselected =
  'bg-white dark:bg-brand-surface text-brand-secondary border-gray-200 dark:border-white/20 hover:border-brand-accent/40 hover:text-brand-primary';

export const sectionCardClass =
  'rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-5 md:p-6 space-y-5';

type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => (
  <section className={`${sectionCardClass} ${className}`}>
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-brand-primary tracking-wide">{title}</h4>
      {description && (
        <p className="text-xs text-brand-secondary leading-relaxed">{description}</p>
      )}
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);

type FormFieldProps = {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export const FormField: React.FC<FormFieldProps> = ({
  label,
  hint,
  required,
  children,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    <label className="block text-sm font-medium text-brand-primary">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-brand-secondary leading-relaxed">{hint}</p>}
  </div>
);

type FormRowProps = {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
};

export const FormRow: React.FC<FormRowProps> = ({ children, cols = 2, className = '' }) => {
  const gridClass =
    cols === 3
      ? 'grid grid-cols-1 md:grid-cols-3 gap-5'
      : cols === 1
        ? 'grid grid-cols-1 gap-5'
        : 'grid grid-cols-1 sm:grid-cols-2 gap-5';
  return <div className={`${gridClass} ${className}`}>{children}</div>;
};

export const togglePillClass = (active: boolean) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? toggleBtnActive : toggleBtnInactive}`;
