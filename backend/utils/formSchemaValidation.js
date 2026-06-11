import { getDefaultFormSchema } from "../data/defaultFormSchemas.js";

function getCategorySchema(formSchema, categoryId) {
  if (!formSchema?.categories) return null;
  return formSchema.categories.find((category) => category.id === categoryId) || null;
}

function normalizeFieldValue(field, value) {
  if (field.type === "toggle") {
    return value === true || value === "true" ? "true" : "false";
  }
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function validateField(field, value) {
  const normalized = normalizeFieldValue(field, value);

  if (field.required && !normalized) {
    return `${field.label} is required.`;
  }

  if (field.type === "email" && normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return `${field.label} must be a valid email address.`;
  }

  if (field.type === "textarea" && field.minLength && normalized.length > 0 && normalized.length < field.minLength) {
    return `${field.label} must be at least ${field.minLength} characters.`;
  }

  if (field.type === "select" && normalized && field.options?.length && !field.options.includes(normalized)) {
    return `${field.label} has an invalid option.`;
  }

  return null;
}

export function resolveFormSchema(institutionConfig, formType) {
  const stored = institutionConfig?.forms?.[formType];
  if (stored?.categories?.length) {
    return stored;
  }
  return getDefaultFormSchema(formType);
}

export function getAllowedCategoryIds(institutionConfig, formType) {
  const schema = resolveFormSchema(institutionConfig, formType);
  return schema?.categories?.map((category) => category.id) || [];
}

export function validateReportSubmission({
  institutionConfig,
  formType,
  category,
  coreValues = {},
  detailValues = {},
}) {
  const formSchema = resolveFormSchema(institutionConfig, formType);
  if (!formSchema) {
    return { valid: false, error: "Unknown form type." };
  }

  const categorySchema = getCategorySchema(formSchema, category);
  if (!categorySchema) {
    return { valid: false, error: "Invalid report category." };
  }

  const errors = [];

  for (const field of formSchema.commonFields || []) {
    const error = validateField(field, coreValues[field.id]);
    if (error) errors.push(error);
  }

  const validatedDetails = {};
  for (const field of categorySchema.fields || []) {
    const rawValue = detailValues[field.id] ?? field.defaultValue ?? "";
    const error = validateField(field, rawValue);
    if (error) errors.push(error);
    if (field.mapsTo === "student_involved") {
      continue;
    }
    const normalized = normalizeFieldValue(field, rawValue);
    if (normalized || field.required) {
      validatedDetails[field.id] = normalized;
    }
  }

  if (errors.length) {
    return { valid: false, error: errors[0], errors };
  }

  const studentInvolvedField = categorySchema.fields?.find(
    (field) => field.mapsTo === "student_involved",
  );
  const studentInvolved =
    studentInvolvedField &&
    normalizeFieldValue(studentInvolvedField, detailValues[studentInvolvedField.id]) === "true";

  return {
    valid: true,
    details: validatedDetails,
    studentInvolved: Boolean(studentInvolved),
  };
}

export function buildPortalConfig(institutionConfig) {
  const envOrigins = (process.env.PORTAL_EMBED_ORIGINS || "")
    .split(/[\s,]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);

  const configOrigins = institutionConfig?.portal?.allowedEmbedOrigins || [];
  const allowedEmbedOrigins = [...new Set([...envOrigins, ...configOrigins])];

  return {
    enabled: institutionConfig?.portal?.enabled !== false,
    allowedEmbedOrigins,
    embedTitle: institutionConfig?.portal?.embedTitle || "Report an Issue",
    embedSubtitle:
      institutionConfig?.portal?.embedSubtitle ||
      "Submit confidentially through your institution portal.",
    institutionName: institutionConfig?.institutionName || "Campus Reports",
  };
}
