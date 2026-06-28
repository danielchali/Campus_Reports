'use client';

import { AlertTriangle, Megaphone, ShieldAlert, Wrench } from '@/components/icons';
import type { FormCategorySchema } from '../../types/formSchema';

const ICONS = {
  'alert-triangle': AlertTriangle,
  'shield-alert': ShieldAlert,
  wrench: Wrench,
  megaphone: Megaphone,
};

const COLOR_CLASSES: Record<string, string> = {
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

type SchemaCategoryPickerProps = {
  categories: FormCategorySchema[];
  value: string;
  onChange: (categoryId: string) => void;
  lockedCategory?: string | null;
};

export default function SchemaCategoryPicker({
  categories,
  value,
  onChange,
  lockedCategory = null,
}: SchemaCategoryPickerProps) {
  if (lockedCategory) {
    const locked = categories.find((category) => category.id === lockedCategory);
    if (!locked) return null;
    const Icon = ICONS[locked.icon as keyof typeof ICONS] || AlertTriangle;
    return (
      <div className="rounded-2xl border border-kmuGreen/30 bg-kmuGreen/5 dark:bg-kmuGreen/10 p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${COLOR_CLASSES[locked.color || 'slate']}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{locked.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{locked.description}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-kmuGreen"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {categories.find((category) => category.id === value)?.description}
        </p>
      </div>

      <div className="hidden md:grid gap-3 lg:gap-4 md:grid-cols-3">
        {categories.map((category) => {
          const Icon = ICONS[category.icon as keyof typeof ICONS] || AlertTriangle;
          const isSelected = value === category.id;
          return (
            <label
              key={category.id}
              className={`group flex flex-col gap-2.5 p-4 lg:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-kmuGreen bg-kmuGreen/5 dark:bg-kmuGreen/10 ring-4 ring-kmuGreen/10'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="schema-category"
                value={category.id}
                checked={isSelected}
                onChange={() => onChange(category.id)}
                className="sr-only"
              />
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                  COLOR_CLASSES[category.color || 'slate']
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-base text-slate-900 dark:text-white">{category.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {category.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </>
  );
}
