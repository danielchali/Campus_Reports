export type FormFieldType = 'text' | 'textarea' | 'select' | 'date' | 'email' | 'toggle';

export type FormFieldMapsTo = 'core' | 'details' | 'student_involved';

export interface FormFieldSchema {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  minLength?: number;
  rows?: number;
  mapsTo?: FormFieldMapsTo;
}

export interface FormCategorySchema {
  id: string;
  label: string;
  description: string;
  icon?: string;
  color?: string;
  fields: FormFieldSchema[];
}

export interface ReportFormSchema {
  formType: 'anonymous_report' | 'student_report';
  categories: FormCategorySchema[];
  commonFields: FormFieldSchema[];
}

export interface PortalIntegrationGuide {
  iframeExample: string;
  postMessageEvents: {
    parentToChild: string[];
    childToParent: string[];
  };
  queryParams: string[];
}

export interface PortalConfig {
  enabled: boolean;
  allowedEmbedOrigins: string[];
  embedTitle: string;
  embedSubtitle: string;
  institutionName: string;
  embedUrl?: string;
  integrationGuide?: PortalIntegrationGuide;
}

export interface InstitutionFormConfig {
  institutionId?: string;
  institutionName: string;
  version: number;
  portal: PortalConfig;
  forms?: {
    anonymous_report?: ReportFormSchema;
    student_report?: ReportFormSchema;
  };
  form?: ReportFormSchema;
}

export type InstitutionFormConfigUpdate = Partial<Omit<InstitutionFormConfig, 'portal'>> & {
  portal?: Partial<PortalConfig>;
};
