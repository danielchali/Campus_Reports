'use client';

import type { FormFieldSchema } from '../../types/formSchema';

type SchemaFormFieldsProps = {
  fields: FormFieldSchema[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  compact?: boolean;
  idPrefix?: string;
};

const baseInputClassName =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors';

export default function SchemaFormFields({
  fields,
  values,
  onChange,
  compact = false,
  idPrefix = 'schema',
}: SchemaFormFieldsProps) {
  if (!fields.length) return null;

  const inputClassName = `${baseInputClassName} ${compact ? 'px-3 py-2' : 'px-4 py-3'}`;

  return (
    <div className={`grid ${compact ? 'gap-3 md:grid-cols-2' : 'gap-4 md:grid-cols-2 lg:grid-cols-3'}`}>
      {fields.map((field) => {
        const fieldId = `${idPrefix}-${field.id}`;
        const value = values[field.id] ?? field.defaultValue ?? '';

        if (field.type === 'toggle') {
          const enabled = value === 'true';
          return (
            <div key={field.id} className={`${compact ? 'md:col-span-2 p-3' : 'md:col-span-2 p-4'} rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label htmlFor={fieldId} className="font-semibold text-sm text-slate-900 dark:text-white">
                    {field.label}
                  </label>
                  {field.helpText && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{field.helpText}</p>
                  )}
                </div>
                <button
                  id={fieldId}
                  type="button"
                  onClick={() => onChange(field.id, enabled ? 'false' : 'true')}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                    enabled ? 'bg-kmuGreen' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  aria-pressed={enabled}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                      enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={field.id}
            className={`space-y-1.5 ${field.type === 'textarea' ? (compact ? 'md:col-span-2' : 'md:col-span-2 lg:col-span-3') : ''}`}
          >
            <label htmlFor={fieldId} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-rose-500"> *</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={fieldId}
                rows={field.rows || 4}
                required={field.required}
                value={value}
                onChange={(event) => onChange(field.id, event.target.value)}
                placeholder={field.placeholder}
                className={`${inputClassName} resize-none`}
              />
            ) : field.type === 'select' ? (
              <select
                id={fieldId}
                required={field.required}
                value={value}
                onChange={(event) => onChange(field.id, event.target.value)}
                className={inputClassName}
              >
                {(field.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={fieldId}
                type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                required={field.required}
                value={value}
                onChange={(event) => onChange(field.id, event.target.value)}
                placeholder={field.placeholder}
                max={field.type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
                className={inputClassName}
              />
            )}

            {field.helpText && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.helpText}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
