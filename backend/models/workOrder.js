import mongoose from "mongoose";

const workOrderAttachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true, trim: true },
  filename: { type: String, required: true },
  mimeType: { type: String, default: "" },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

const workOrderUpdateSchema = new mongoose.Schema({
  status: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  createdBy: { type: String, default: "" },
  createdByRole: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const workOrderSchema = new mongoose.Schema({
  work_order_id: { type: String, unique: true, required: true, index: true },
  source_report_id: { type: String, required: true, unique: true, index: true },
  source_tracking_code: { type: String, default: "" },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  issue_type: { type: String, default: "Other", trim: true },
  priority: {
    type: String,
    enum: ["Low", "Normal", "High", "Urgent safety risk"],
    default: "Normal",
  },
  affected_asset: { type: String, default: "", trim: true },
  access_instructions: { type: String, default: "", trim: true },
  status: {
    type: String,
    enum: ["Open", "Assigned", "In Progress", "Completed", "Cancelled"],
    default: "Open",
  },
  assigned_to: { type: String, default: "", trim: true },
  requested_by_name: { type: String, default: "", trim: true },
  requesting_department: { type: String, default: "", trim: true },
  created_by: { type: String, default: "" },
  created_by_role: { type: String, default: "" },
  attachments: { type: [workOrderAttachmentSchema], default: [] },
  updates: { type: [workOrderUpdateSchema], default: [] },
  signatures: {
    partC: { type: String, default: "" },
    partD: { type: String, default: "" },
    partE: { type: String, default: "" },
  },
  job_card: {
    part_b_notes: { type: [String], default: ["", ""] },
    part_c_approved_by: { type: String, default: "" },
    part_c_date: { type: String, default: "" },
    part_d_name: { type: String, default: "" },
    part_d_date: { type: String, default: "" },
    part_e_name: { type: String, default: "" },
    part_e_date: { type: String, default: "" },
    part_e_work_done: { type: String, default: "" },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const workOrderSequenceSchema = new mongoose.Schema({
  year: { type: String, required: true, unique: true, index: true },
  value: { type: Number, required: true, default: 0, min: 0 },
});

const WorkOrderModel =
  mongoose.models.WorkOrder || mongoose.model("WorkOrder", workOrderSchema);

export const WorkOrderSequenceModel =
  mongoose.models.WorkOrderSequence ||
  mongoose.model("WorkOrderSequence", workOrderSequenceSchema);

export default WorkOrderModel;
