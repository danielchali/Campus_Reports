"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FilePenLine,
  Paperclip,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton } from "../../components/PageSkeleton";
import { getProfile } from "../../utils/api";
import {
  createStudentReport,
  type StudentReportCategory,
} from "../../utils/studentReports";

type ReporterProfile = {
  name?: string;
  username?: string;
  role?: string;
  studentProfile?: {
    accommodation?: {
      roomNumber?: string;
    };
    addressInfo?: {
      province?: string;
      town?: string;
      address?: string;
    };
  } | null;
};

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildLocationFromProfile(profile: ReporterProfile | null) {
  const roomNumber = profile?.studentProfile?.accommodation?.roomNumber?.trim();
  const addressInfo = profile?.studentProfile?.addressInfo;
  const addressParts = [
    addressInfo?.address,
    addressInfo?.town,
    addressInfo?.province,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  if (roomNumber && addressParts.length > 0) {
    return `Room ${roomNumber}, ${addressParts.join(", ")}`;
  }

  if (roomNumber) {
    return `Room ${roomNumber}`;
  }

  return addressParts.join(", ");
}

const categoryOptions: Array<{
  value: StudentReportCategory;
  label: string;
  description: string;
}> = [
  {
    value: "disciplinary_case",
    label: "Disciplinary Case",
    description:
      "Misconduct, harassment, theft, intimidation, violence, or other behavior that needs formal review.",
  },
  {
    value: "maintenance_issue",
    label: "Maintenance Issue",
    description:
      "Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.",
  },
];

export default function MakeReportPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [category, setCategory] =
    useState<StudentReportCategory>("disciplinary_case");
  const [anonymous, setAnonymous] = useState(false);
  const [peopleInvolved, setPeopleInvolved] = useState("");
  const [witnesses, setWitnesses] = useState("");
  const [riskLevel, setRiskLevel] = useState("Medium");
  const [securityAction, setSecurityAction] = useState("");
  const [studentInvolved, setStudentInvolved] = useState(false);
  const [issueType, setIssueType] = useState("Electrical");
  const [priority, setPriority] = useState("Normal");
  const [affectedAsset, setAffectedAsset] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoFillNotice, setAutoFillNotice] = useState("");
  const [profileDefaultLocation, setProfileDefaultLocation] = useState("");

  const isMaintenanceRequest = category === "maintenance_issue";
  const showStudentInvolvedToggle =
    user?.role === "general_user" && !isMaintenanceRequest;
  const reportInvolvesStudent =
    user?.role === "student" || (!isMaintenanceRequest && studentInvolved);

  useEffect(() => {
    if (!user || (user.role !== "student" && user.role !== "general_user")) {
      return;
    }

    let cancelled = false;
    const today = getTodayDateInputValue();

    setIncidentDate((current) => current || today);

    async function autoFillReporterInfo() {
      try {
        const profile = (await getProfile()) as ReporterProfile;
        if (cancelled) return;

        const defaultLocation = buildLocationFromProfile(profile);
        setProfileDefaultLocation(defaultLocation);
        if (defaultLocation) {
          setLocation((current) => current || defaultLocation);
          setAutoFillNotice(
            "We pre-filled your incident date and saved profile location. You can edit them before submitting.",
          );
        } else {
          setAutoFillNotice(
            "We pre-filled today's date. Add the exact campus location before submitting.",
          );
        }
      } catch {
        if (!cancelled) {
          setAutoFillNotice(
            "We pre-filled today's date. Add the exact campus location before submitting.",
          );
        }
      }
    }

    autoFillReporterInfo();

    return () => {
      cancelled = true;
    };
  }, [user]);

  function addAttachments(files: FileList | null) {
    if (!files) return;
    const nextFiles = [...attachments, ...Array.from(files)].slice(0, 5);
    setAttachments(nextFiles);
  }

  function removeAttachment(index: number) {
    setAttachments((current) =>
      current.filter((_file, fileIndex) => fileIndex !== index),
    );
  }

  if (typeof window !== "undefined") {
    if (!authLoading && !token) {
      router.replace("/login");
    }
    if (!token) {
      return <PageSkeleton />;
    }

    if (!user || (user.role !== "student" && user.role !== "general_user")) {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!user) {
        throw new Error("You must be logged in to submit a report.");
      }

      const report = await createStudentReport(
        {
          title,
          description,
          category,
          anonymous,
          location,
          incidentDate,
          details: isMaintenanceRequest
            ? {
                issueType,
                priority,
                affectedAsset,
                accessInstructions,
              }
            : {
                peopleInvolved,
                witnesses,
                riskLevel,
                securityAction,
                studentInvolved: reportInvolvesStudent ? "true" : "false",
              },
          attachments,
          studentInvolved: reportInvolvesStudent,
        },
        {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      );

      setSuccess("Your report has been submitted successfully.");
      setTrackingCode(report.trackingCode);
      setShowSuccessModal(true);
      setTitle("");
      setDescription("");
      setLocation(profileDefaultLocation);
      setIncidentDate(getTodayDateInputValue());
      setAnonymous(false);
      setCategory("disciplinary_case");
      setPeopleInvolved("");
      setWitnesses("");
      setRiskLevel("Medium");
      setSecurityAction("");
      setStudentInvolved(false);
      setIssueType("Electrical");
      setPriority("Normal");
      setAffectedAsset("");
      setAccessInstructions("");
      setAttachments([]);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-800 p-4 md:p-8 shadow">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-4">
          <div className="rounded-lg md:rounded-2xl bg-kmuGreen/10 p-2 md:p-3 text-kmuGreen flex-shrink-0">
            <FilePenLine size={22} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-kmuGreen">
              Make a Report
            </h1>
            <p className="mt-2 md:mt-3 text-gray-600 dark:text-gray-400 text-sm md:text-lg">
              Submit a concern, choose the type of issue, and decide whether the
              report should be handled anonymously.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg md:rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 md:p-4 text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2 md:gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm md:text-base">{error}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-800 p-4 md:p-8 shadow space-y-6 md:space-y-8"
      >
        <div>
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
            Reporting Form
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">
            Provide enough detail for follow-up and review. You can still track
            anonymous submissions from your account.
          </p>
          {autoFillNotice && (
            <p className="mt-3 rounded-lg bg-kmuGreen/10 px-3 py-2 text-xs md:text-sm text-kmuGreen dark:text-emerald-300">
              {autoFillNotice}
            </p>
          )}
        </div>

        {/* Mobile dropdown */}
        <div className="md:hidden">
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as StudentReportCategory)
            }
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-kmuGreen"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {categoryOptions.find((o) => o.value === category)?.description}
          </p>
        </div>

        {/* Desktop cards */}
        <div className="hidden md:grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
          {categoryOptions.map((option) => (
            <label
              key={option.value}
              className={`rounded-lg md:rounded-2xl border p-3 md:p-5 cursor-pointer transition ${
                category === option.value
                  ? "border-kmuGreen bg-kmuGreen/5"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <input
                  type="radio"
                  name="reportCategory"
                  value={option.value}
                  checked={category === option.value}
                  onChange={() => setCategory(option.value)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    {option.value === "disciplinary_case" ? (
                      <ShieldAlert size={16} />
                    ) : (
                      <Wrench size={16} />
                    )}
                    {option.label}
                  </div>
                  <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="title"
              className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
            >
              Report Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the issue"
              className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="location"
              className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Hostel, classroom, lab, walkway, or building"
              className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="incidentDate"
            className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
          >
            Date of Incident or Observation
          </label>
          <input
            id="incidentDate"
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
            required
          />
        </div>

        {isMaintenanceRequest ? (
          <div className="rounded-lg md:rounded-2xl border border-blue-100 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 md:p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Wrench size={18} />
              <h3 className="font-semibold text-sm md:text-base">
                Maintenance Request Details
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="issueType"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Maintenance Issue Type
                </label>
                <select
                  id="issueType"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                >
                  <option>Electrical</option>
                  <option>Plumbing</option>
                  <option>Furniture or fittings</option>
                  <option>Cleaning or sanitation</option>
                  <option>IT or classroom equipment</option>
                  <option>Building safety hazard</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="priority"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent safety risk</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="affectedAsset"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Affected Room, Fixture, or Asset
                </label>
                <input
                  id="affectedAsset"
                  type="text"
                  value={affectedAsset}
                  onChange={(e) => setAffectedAsset(e.target.value)}
                  placeholder="e.g. Room B12 projector, leaking sink, broken door lock"
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="accessInstructions"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Access or Timing Notes
                </label>
                <input
                  id="accessInstructions"
                  type="text"
                  value={accessInstructions}
                  onChange={(e) => setAccessInstructions(e.target.value)}
                  placeholder="When staff can access the area or who can unlock it"
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg md:rounded-2xl border border-red-100 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20 p-3 md:p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <ShieldAlert size={18} />
              <h3 className="font-semibold text-sm md:text-base">
                Disciplinary / Security Details
              </h3>
            </div>
            {showStudentInvolvedToggle && (
              <div className="rounded-xl border border-red-200 bg-white/80 p-3 dark:border-red-900/50 dark:bg-gray-800/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                      Is a learner/student involved?
                    </h4>
                    <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      Turn this on for learner malpractice, misconduct, or any
                      incident that should be reviewed by the Dean of Students.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStudentInvolved((current) => !current)}
                    className={`relative inline-flex h-7 md:h-8 w-12 md:w-14 items-center rounded-full transition flex-shrink-0 ${
                      studentInvolved
                        ? "bg-kmuGreen"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    aria-pressed={studentInvolved}
                    aria-label="Toggle learner/student involved"
                  >
                    <span
                      className={`inline-block h-5 md:h-6 w-5 md:w-6 transform rounded-full bg-white transition ${
                        studentInvolved
                          ? "translate-x-6 md:translate-x-7"
                          : "translate-x-0.5 md:translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="peopleInvolved"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  People Involved
                </label>
                <input
                  id="peopleInvolved"
                  type="text"
                  value={peopleInvolved}
                  onChange={(e) => setPeopleInvolved(e.target.value)}
                  placeholder="Names, descriptions, student IDs, or unknown"
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="witnesses"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Witnesses
                </label>
                <input
                  id="witnesses"
                  type="text"
                  value={witnesses}
                  onChange={(e) => setWitnesses(e.target.value)}
                  placeholder="Any witnesses or people who can verify the incident"
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="riskLevel"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Safety / Security Risk Level
                </label>
                <select
                  id="riskLevel"
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Immediate threat</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="securityAction"
                  className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
                >
                  Immediate Action Already Taken
                </label>
                <input
                  id="securityAction"
                  type="text"
                  value={securityAction}
                  onChange={(e) => setSecurityAction(e.target.value)}
                  placeholder="Security notified, separated parties, first aid, none, etc."
                  className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="description"
            className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base"
          >
            Full Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Explain what happened, who or what was involved, and why this needs attention."
            className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
            required
          />
        </div>

        <div className="rounded-lg md:rounded-2xl border border-gray-200 dark:border-gray-700 p-3 md:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Paperclip size={18} className="mt-0.5 text-kmuGreen" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                Evidence / Supporting Files
              </h3>
              <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Attach photos, videos, PDFs, screenshots, or other files that
                help explain the report. You can upload up to 5 files, 10 MB
                each.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg md:rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 px-3 md:px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-kmuGreen">
              <Paperclip size={16} />
              Upload evidence files
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addAttachments(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg md:rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 px-3 md:px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-kmuGreen">
              <Camera size={16} />
              Capture photo evidence
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  addAttachments(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2 text-xs md:text-sm text-gray-700 dark:text-gray-200"
                >
                  <span className="truncate">
                    {file.name} ({Math.ceil(file.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-600"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg md:rounded-2xl border border-gray-200 dark:border-gray-700 p-3 md:p-5">
          <div className="flex items-start justify-between gap-3 md:gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                Anonymous Report
              </h3>
              <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Turn this on if you want the report handled as anonymous. You
                will still be able to track it from your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAnonymous((current) => !current)}
              className={`relative inline-flex h-7 md:h-8 w-12 md:w-14 items-center rounded-full transition flex-shrink-0 ${
                anonymous ? "bg-kmuGreen" : "bg-gray-300 dark:bg-gray-600"
              }`}
              aria-pressed={anonymous}
              aria-label="Toggle anonymous report"
            >
              <span
                className={`inline-block h-5 md:h-6 w-5 md:w-6 transform rounded-full bg-white transition ${
                  anonymous
                    ? "translate-x-6 md:translate-x-7"
                    : "translate-x-0.5 md:translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg md:rounded-xl bg-kmuGreen px-4 md:px-6 py-2 md:py-3 text-sm md:text-base text-white font-semibold hover:bg-kmuOrange transition disabled:opacity-60 w-full sm:w-auto"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/my-reports")}
            className="rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition w-full sm:w-auto"
          >
            Go to My Reports
          </button>
        </div>
      </form>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Report Submitted
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {success}
                </p>
                {trackingCode && (
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                    Tracking code:{" "}
                    <span className="font-semibold">{trackingCode}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-xl bg-kmuGreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-kmuOrange transition"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/my-reports");
                }}
                className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-300 transition dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Go to My Reports
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
