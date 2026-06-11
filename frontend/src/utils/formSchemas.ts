import { API_BASE_URL } from '../config/constants';
import type { InstitutionFormConfig, PortalConfig, ReportFormSchema } from '../types/formSchema';

export async function fetchFormSchema(formType: 'anonymous_report' | 'student_report'): Promise<InstitutionFormConfig> {
  const response = await fetch(`${API_BASE_URL}/form-schemas?form=${formType}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load form schema');
  }

  return response.json();
}

export async function fetchPortalConfig(): Promise<PortalConfig> {
  const response = await fetch(`${API_BASE_URL}/form-schemas/portal`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load portal configuration');
  }

  return response.json();
}

export async function updateInstitutionFormConfig(
  token: string,
  payload: Partial<InstitutionFormConfig>,
): Promise<InstitutionFormConfig> {
  const response = await fetch(`${API_BASE_URL}/form-schemas`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update form configuration');
  }

  return data;
}

export function getCategoryById(schema: ReportFormSchema, categoryId: string) {
  return schema.categories.find((category) => category.id === categoryId) || null;
}

export function buildDefaultDetailValues(schema: ReportFormSchema, categoryId: string) {
  const category = getCategoryById(schema, categoryId);
  const values: Record<string, string> = {};
  for (const field of category?.fields || []) {
    values[field.id] = field.defaultValue || (field.type === 'toggle' ? 'false' : '');
  }
  return values;
}
