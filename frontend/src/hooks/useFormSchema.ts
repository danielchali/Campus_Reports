'use client';

import { useEffect, useState } from 'react';
import { getFallbackFormSchema } from '../config/defaultFormSchemas';
import type { InstitutionFormConfig, ReportFormSchema } from '../types/formSchema';
import { fetchFormSchema } from '../utils/formSchemas';

export function useFormSchema(formType: 'anonymous_report' | 'student_report') {
  const [schema, setSchema] = useState<ReportFormSchema>(getFallbackFormSchema(formType));
  const [institutionName, setInstitutionName] = useState('Campus Reports');
  const [portal, setPortal] = useState<InstitutionFormConfig['portal'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const config = await fetchFormSchema(formType);
        if (cancelled) return;
        setSchema(config.form || getFallbackFormSchema(formType));
        setInstitutionName(config.institutionName || 'Campus Reports');
        setPortal(config.portal || null);
      } catch (err) {
        if (cancelled) return;
        setSchema(getFallbackFormSchema(formType));
        setError(err instanceof Error ? err.message : 'Failed to load form schema');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [formType]);

  return { schema, institutionName, portal, loading, error };
}
