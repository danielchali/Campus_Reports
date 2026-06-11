import mongoose from "mongoose";

const formFieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "textarea", "select", "date", "email", "toggle"],
      required: true,
    },
    label: { type: String, required: true },
    placeholder: { type: String, default: "" },
    helpText: { type: String, default: "" },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    defaultValue: { type: String, default: "" },
    minLength: { type: Number, default: 0 },
    rows: { type: Number, default: 4 },
    mapsTo: { type: String, enum: ["core", "details", "student_involved"], default: "details" },
  },
  { _id: false },
);

const formCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "file-text" },
    color: { type: String, default: "slate" },
    fields: { type: [formFieldSchema], default: [] },
  },
  { _id: false },
);

const reportFormSchema = new mongoose.Schema(
  {
    formType: {
      type: String,
      enum: ["anonymous_report", "student_report"],
      required: true,
    },
    categories: { type: [formCategorySchema], default: [] },
    commonFields: { type: [formFieldSchema], default: [] },
  },
  { _id: false },
);

const institutionConfigSchema = new mongoose.Schema(
  {
    institutionId: { type: String, unique: true, required: true, default: "default" },
    institutionName: { type: String, required: true, default: "Campus Reports" },
    version: { type: Number, default: 1 },
    portal: {
      enabled: { type: Boolean, default: true },
      allowedEmbedOrigins: { type: [String], default: [] },
      embedTitle: { type: String, default: "Report an Issue" },
      embedSubtitle: {
        type: String,
        default: "Submit confidentially through your institution portal.",
      },
    },
    forms: {
      anonymous_report: { type: reportFormSchema, default: null },
      student_report: { type: reportFormSchema, default: null },
    },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

const InstitutionConfigModel =
  mongoose.models.InstitutionConfig ||
  mongoose.model("InstitutionConfig", institutionConfigSchema);

export default InstitutionConfigModel;
