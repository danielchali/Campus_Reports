"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../(protected)/ProtectedRoute";
import { API_BASE_URL, OFFENSE_TYPES, SEVERITY_LEVELS } from "../../../config/constants";
import { authHeaders } from "../../../utils/api";
import SmartStudentSearch from "../../../components/SmartStudentSearch";
import SmartStaffSearch from "../../../components/SmartStaffSearch";
import QuickCaseTemplates from "../../../components/QuickCaseTemplates";
import RecentStudents from "../../../components/RecentStudents";
import RecentStaff from "../../../components/RecentStaff";
import SignatureField from "../../../components/SignatureField";

interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  department?: string;
  program?: string;
  year?: string;
  gender?: string;
}

interface Staff {
  _id: string;
  staffId: string;
  fullName: string;
  department?: string;
  position?: string;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type CaseType = "single_student" | "multiple_student" | "single_staff" | "multiple_staff";

type PersonParticulars = {
  name: string;
  residentialAddress: string;
  sinPhone: string;
  yearOfStudy: string;
  programOfStudy: string;
  sexAge: string;
  nationalityTribe: string;
  village: string;
  chief: string;
  district: string;
};

type StudentCaseProcessState = {
  occurrenceCover: {
    investigatingOfficer: string;
    occurrenceBookNumber: string;
    reportedAt: string;
    complainant: PersonParticulars;
    accusedPeople: PersonParticulars[];
    offence: string;
    occurrenceDetails: string;
    propertyDamageValue: string;
    propertyRecoveredValue: string;
    disciplinaryDisposal: string;
  };
  summon: {
    fullNames: string;
    sex: string;
    age: string;
    sin: string;
    programOfStudy: string;
    yearOfStudy: string;
    residentialAddress: string;
    phoneNo: string;
    reportTime: string;
    reportDate: string;
    appointment: string;
    signature: string;
  };
  statementPad: {
    statementRole: string;
    fullName: string;
    sexAge: string;
    sinNo: string;
    occupationProg: string;
    phoneNo: string;
    tribe: string;
    village: string;
    chief: string;
    district: string;
    residentialAddress: string;
    businessAddress: string;
    takenDate: string;
    takenTime: string;
    recallTime: string;
    statementText: string;
    signature: string;
    signedDate: string;
    signedTime: string;
  };
  warnAndCaution: {
    fullNames: string;
    sex: string;
    tribe: string;
    age: string;
    residentialAddress: string;
    village: string;
    chief: string;
    district: string;
    programOfStudy: string;
    occupation: string;
    sin: string;
    phoneNo: string;
    takenDate: string;
    takenTime: string;
    place: string;
    caseName: string;
    offenceDate: string;
    offenceTime: string;
    offencePlace: string;
    signature: string;
    signedDate: string;
    signedTime: string;
  };
};

const createBlankPerson = (): PersonParticulars => ({
  name: "",
  residentialAddress: "",
  sinPhone: "",
  yearOfStudy: "",
  programOfStudy: "",
  sexAge: "",
  nationalityTribe: "",
  village: "",
  chief: "",
  district: "",
});

const createInitialStudentCaseProcess = (): StudentCaseProcessState => ({
  occurrenceCover: {
    investigatingOfficer: "",
    occurrenceBookNumber: "",
    reportedAt: "",
    complainant: createBlankPerson(),
    accusedPeople: [],
    offence: "",
    occurrenceDetails: "",
    propertyDamageValue: "",
    propertyRecoveredValue: "",
    disciplinaryDisposal: "",
  },
  summon: {
    fullNames: "",
    sex: "",
    age: "",
    sin: "",
    programOfStudy: "",
    yearOfStudy: "",
    residentialAddress: "",
    phoneNo: "",
    reportTime: "",
    reportDate: "",
    appointment: "",
    signature: "",
  },
  statementPad: {
    statementRole: "Complainant",
    fullName: "",
    sexAge: "",
    sinNo: "",
    occupationProg: "",
    phoneNo: "",
    tribe: "",
    village: "",
    chief: "",
    district: "",
    residentialAddress: "",
    businessAddress: "",
    takenDate: "",
    takenTime: "",
    recallTime: "",
    statementText: "",
    signature: "",
    signedDate: "",
    signedTime: "",
  },
  warnAndCaution: {
    fullNames: "",
    sex: "",
    tribe: "",
    age: "",
    residentialAddress: "",
    village: "",
    chief: "",
    district: "",
    programOfStudy: "",
    occupation: "",
    sin: "",
    phoneNo: "",
    takenDate: "",
    takenTime: "",
    place: "",
    caseName: "",
    offenceDate: "",
    offenceTime: "",
    offencePlace: "",
    signature: "",
    signedDate: "",
    signedTime: "",
  },
});

const STUDENT_CASE_STEPS = [
  {
    title: "Occurrence Docket Cover",
    subtitle: "Capture the investigating officer, complainant, accused, and incident overview.",
  },
  {
    title: "Call Out",
    subtitle: "Prepare the summon details for the accused student.",
  },
  {
    title: "Statement Pad",
    subtitle: "Record the complainant or witness statement in the required format.",
  },
  {
    title: "Warn and Caution",
    subtitle: "Document the final caution statement before creating the case.",
  },
] as const;

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
      />
    </div>
  );
}

export default function NewCasePage() {
  const router = useRouter();
  const [caseType, setCaseType] = useState<CaseType>("single_student");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [accusedStudents, setAccusedStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedStaffMembers, setSelectedStaffMembers] = useState<Staff[]>([]);
  const [studentId, setStudentId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [offenseType, setOffenseType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [sanctions, setSanctions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [offenseTypeDescription, setOffenseTypeDescription] = useState("");
  const [studentCaseStep, setStudentCaseStep] = useState(0);
  const [studentCaseProcess, setStudentCaseProcess] = useState<StudentCaseProcessState>(createInitialStudentCaseProcess);
  const activeStudentStep = STUDENT_CASE_STEPS[studentCaseStep];
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [statementAudioFile, setStatementAudioFile] = useState<File | null>(null);
  const [statementAudioUrl, setStatementAudioUrl] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const getOffenseTypeDescription = (value: string) => {
    const offense = OFFENSE_TYPES.find((item) => item.value === value);
    return offense ? offense.description : "";
  };

  const resetStudentCaseProcess = () => {
    setStudentCaseProcess(createInitialStudentCaseProcess());
    setStudentCaseStep(0);
  };

  const clearStatementAudio = () => {
    if (statementAudioUrl) {
      URL.revokeObjectURL(statementAudioUrl);
    }
    setStatementAudioFile(null);
    setStatementAudioUrl("");
  };

  const buildAccusedPerson = (student: Student): PersonParticulars => ({
    name: student.fullName || "",
    residentialAddress: "",
    sinPhone: student.studentId || "",
    yearOfStudy: student.year || "",
    programOfStudy: student.program || student.department || "",
    sexAge: student.gender || "",
    nationalityTribe: "",
    village: "",
    chief: "",
    district: "",
  });

  const syncPrimaryAccusedDetails = (student: Student) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      occurrenceCover: {
        ...prev.occurrenceCover,
        accusedPeople: prev.occurrenceCover.accusedPeople.length > 0
          ? prev.occurrenceCover.accusedPeople.map((person, index) => (
              index === 0
                ? {
                    ...person,
                    ...buildAccusedPerson(student),
                    residentialAddress: person.residentialAddress,
                    nationalityTribe: person.nationalityTribe,
                    village: person.village,
                    chief: person.chief,
                    district: person.district,
                  }
                : person
            ))
          : [buildAccusedPerson(student)],
      },
      summon: {
        ...prev.summon,
        fullNames: student.fullName || "",
        sex: student.gender || "",
        sin: student.studentId || "",
        programOfStudy: student.program || student.department || "",
        yearOfStudy: student.year || "",
      },
      warnAndCaution: {
        ...prev.warnAndCaution,
        fullNames: student.fullName || "",
        sex: student.gender || "",
        programOfStudy: student.program || student.department || "",
        sin: student.studentId || "",
        occupation: student.program || student.department || "",
      },
    }));
  };

  const handleOffenseTypeChange = (value: string) => {
    setOffenseType(value);
    setOffenseTypeDescription(getOffenseTypeDescription(value));
    setStudentCaseProcess((prev) => ({
      ...prev,
      occurrenceCover: {
        ...prev.occurrenceCover,
        offence: value,
      },
      warnAndCaution: {
        ...prev.warnAndCaution,
        caseName: value,
      },
    }));
  };

  const handleTemplateSelect = (template: any) => {
    setOffenseType(template.offenseType);
    setOffenseTypeDescription(getOffenseTypeDescription(template.offenseType));
    setSeverity(template.severity);
    setDescription(template.description);
    setSanctions(template.sanctions);
    setStudentCaseProcess((prev) => ({
      ...prev,
      occurrenceCover: {
        ...prev.occurrenceCover,
        offence: template.offenseType,
      },
      warnAndCaution: {
        ...prev.warnAndCaution,
        caseName: template.offenseType,
      },
    }));
  };

  const appendSpeechToStatement = (transcript: string) => {
    if (!transcript.trim()) {
      return;
    }

    setStudentCaseProcess((prev) => {
      const existing = prev.statementPad.statementText.trim();
      const nextText = existing ? `${existing}\n${transcript.trim()}` : transcript.trim();

      return {
        ...prev,
        statementPad: {
          ...prev.statementPad,
          statementText: nextText,
        },
      };
    });
  };

  const startAudioRecording = async () => {
    if (isRecordingAudio) {
      return true;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `statement-audio-${Date.now()}.${extension}`, { type: mimeType });
        handleStatementAudioFile(file);
        setIsRecordingAudio(false);
        mediaRecorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setError(null);
      return true;
    } catch (recordingError: any) {
      setError(recordingError?.message || "Unable to start audio recording.");
      setIsRecordingAudio(false);
      return false;
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleSpeechToText = async () => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null;

    if (!SpeechRecognitionCtor) {
      setError("Speech-to-text is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      stopAudioRecording();
      return;
    }

    const audioStarted = await startAudioRecording();
    if (!audioStarted) {
      return;
    }

    const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || "";
        }
      }

      if (finalTranscript) {
        appendSpeechToStatement(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      stopAudioRecording();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudioRecording();
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const uploadStatementAudioEvidence = async (caseRecordId: string) => {
    if (!statementAudioFile) {
      return;
    }

    const formData = new FormData();
    formData.append("file", statementAudioFile);
    formData.append("caseId", caseRecordId);

    const response = await fetch(`${API_BASE_URL}/evidence`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  };

  const handleStatementAudioFile = (file: File | null) => {
    if (!file) {
      return;
    }

    const supportedMimeTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
      "audio/aac",
      "audio/wav",
      "audio/x-wav",
      "audio/opus",
    ];

    const lowerName = file.name.toLowerCase();
    const supportedExtensions = [".webm", ".ogg", ".opus", ".mp3", ".m4a", ".aac", ".wav"];
    const extensionOk = supportedExtensions.some((extension) => lowerName.endsWith(extension));

    if (!(supportedMimeTypes.includes(file.type) || extensionOk)) {
      setError("Unsupported audio format. Use a small voice-note style file such as .ogg, .opus, .m4a, .mp3, .webm, or .wav.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Audio file is too large. Please keep it under 10MB.");
      return;
    }

    clearStatementAudio();
    setStatementAudioFile(file);
    setStatementAudioUrl(URL.createObjectURL(file));
    setError(null);
  };

  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      stopAudioRecording();
      return;
    }
    await startAudioRecording();
  };

  const handleSmartStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStudentId(student.studentId);
    setAccusedStudents([student]);
    syncPrimaryAccusedDetails(student);
  };

  const handleAddAccusedStudent = (student: Student) => {
    setAccusedStudents((prev) => {
      if (prev.some((item) => item.studentId === student.studentId)) {
        return prev;
      }

      const next = [...prev, student];
      if (next.length === 1) {
        setSelectedStudent(student);
        setStudentId(student.studentId);
        syncPrimaryAccusedDetails(student);
      } else {
        setStudentCaseProcess((current) => ({
          ...current,
          occurrenceCover: {
            ...current.occurrenceCover,
            accusedPeople: [...current.occurrenceCover.accusedPeople, buildAccusedPerson(student)],
          },
        }));
      }

      return next;
    });
  };

  const removeAccusedStudent = (studentIdToRemove: string) => {
    setAccusedStudents((prev) => {
      const next = prev.filter((item) => item.studentId !== studentIdToRemove);

      setStudentCaseProcess((current) => ({
        ...current,
        occurrenceCover: {
          ...current.occurrenceCover,
          accusedPeople: current.occurrenceCover.accusedPeople.filter((_, index) => prev[index]?.studentId !== studentIdToRemove),
        },
      }));

      if (next.length === 0) {
        setSelectedStudent(null);
        setStudentId("");
      } else {
        setSelectedStudent(next[0]);
        setStudentId(next[0].studentId);
        syncPrimaryAccusedDetails(next[0]);
      }

      return next;
    });
  };

  const handleSmartStudentSelectMultiple = (student: Student) => {
    if (!selectedStudents.some((item) => item.studentId === student.studentId)) {
      setSelectedStudents((prev) => [...prev, student]);
    }
  };

  const removeSelectedStudentSmart = (value: string) => {
    setSelectedStudents((prev) => prev.filter((item) => item.studentId !== value));
  };

  const handleSmartStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff);
    setStaffId(staff.staffId);
  };

  const handleSmartStaffSelectMultiple = (staff: Staff) => {
    if (!selectedStaffMembers.some((item) => item.staffId === staff.staffId)) {
      setSelectedStaffMembers((prev) => [...prev, staff]);
    }
  };

  const removeSelectedStaffSmart = (value: string) => {
    setSelectedStaffMembers((prev) => prev.filter((item) => item.staffId !== value));
  };

  const updateOccurrenceField = (field: keyof StudentCaseProcessState["occurrenceCover"], value: string) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      occurrenceCover: {
        ...prev.occurrenceCover,
        [field]: value,
      },
    }));
  };

  const updateOccurrencePersonField = (field: keyof PersonParticulars, value: string) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      occurrenceCover: {
        ...prev.occurrenceCover,
        complainant: {
          ...prev.occurrenceCover.complainant,
          [field]: value,
        },
      },
    }));
  };

  const updateAccusedPersonField = (index: number, field: keyof PersonParticulars, value: string) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      occurrenceCover: {
        ...prev.occurrenceCover,
        accusedPeople: prev.occurrenceCover.accusedPeople.map((person, personIndex) => (
          personIndex === index
            ? {
                ...person,
                [field]: value,
              }
            : person
        )),
      },
    }));
  };

  const updateSummonField = (field: keyof StudentCaseProcessState["summon"], value: string) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      summon: {
        ...prev.summon,
        [field]: value,
      },
    }));
  };

  const updateStatementField = (field: keyof StudentCaseProcessState["statementPad"], value: string) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      statementPad: {
        ...prev.statementPad,
        [field]: value,
      },
    }));
  };

  const updateWarnField = (field: keyof StudentCaseProcessState["warnAndCaution"], value: string) => {
    setStudentCaseProcess((prev) => ({
      ...prev,
      warnAndCaution: {
        ...prev.warnAndCaution,
        [field]: value,
      },
    }));
  };

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null;

    setIsSpeechSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      if (statementAudioUrl) {
        URL.revokeObjectURL(statementAudioUrl);
      }
    };
  }, [statementAudioUrl]);

  const validateStep = (step: number) => {
    if (step === 0) {
      if (accusedStudents.length === 0) return "Please add at least one accused student for this case.";
      if (!studentCaseProcess.occurrenceCover.investigatingOfficer.trim()) return "Investigating officer is required.";
      if (!studentCaseProcess.occurrenceCover.occurrenceBookNumber.trim()) return "Occurrence book number is required.";
      if (!studentCaseProcess.occurrenceCover.reportedAt.trim()) return "Date and time reported is required.";
      if (!studentCaseProcess.occurrenceCover.complainant.name.trim()) return "Complainant name is required.";
      if (!incidentDate) return "Incident date is required.";
      if (!offenseType) return "Offense type is required.";
      if (!severity) return "Severity is required.";
      if (!description.trim()) return "Description is required.";
      return null;
    }

    if (step === 1) {
      if (!studentCaseProcess.summon.fullNames.trim()) return "Summon full names are required.";
      if (!studentCaseProcess.summon.reportTime.trim()) return "Summon report time is required.";
      if (!studentCaseProcess.summon.reportDate.trim()) return "Summon day and date are required.";
      return null;
    }

    if (step === 2) {
      if (!studentCaseProcess.statementPad.fullName.trim()) return "Statement full name is required.";
      if (!studentCaseProcess.statementPad.takenDate.trim()) return "Statement taken date is required.";
      if (!studentCaseProcess.statementPad.takenTime.trim()) return "Statement taken time is required.";
      if (!studentCaseProcess.statementPad.statementText.trim()) return "Statement text is required.";
      return null;
    }

    if (!studentCaseProcess.warnAndCaution.fullNames.trim()) return "Warn and caution full names are required.";
    if (!studentCaseProcess.warnAndCaution.takenDate.trim()) return "Warn and caution date is required.";
    if (!studentCaseProcess.warnAndCaution.takenTime.trim()) return "Warn and caution time is required.";
    if (!studentCaseProcess.warnAndCaution.place.trim()) return "Warn and caution place is required.";
    if (!studentCaseProcess.warnAndCaution.caseName.trim()) return "Case being investigated is required.";
    return null;
  };

  const handleStudentStepNext = () => {
    const validationError = validateStep(studentCaseStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStudentCaseStep((prev) => Math.min(prev + 1, STUDENT_CASE_STEPS.length - 1));
  };

  const handleStudentStepBack = () => {
    setError(null);
    setStudentCaseStep((prev) => Math.max(prev - 1, 0));
  };

  const resetAll = () => {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setStudentId("");
    setStaffId("");
    setSelectedStudent(null);
    setAccusedStudents([]);
    setSelectedStudents([]);
    setSelectedStaff(null);
    setSelectedStaffMembers([]);
    setIncidentDate("");
    setOffenseType("");
    setSeverity("");
    setDescription("");
    setSanctions("");
    setOffenseTypeDescription("");
    clearStatementAudio();
    resetStudentCaseProcess();
    setCaseType("single_student");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (caseType === "single_student") {
        const validationError = validateStep(studentCaseStep);
        if (validationError) {
          throw new Error(validationError);
        }
      }

      const requestBody: any = {
        incident_date: incidentDate,
        offense_type: offenseType,
        severity,
        description,
        sanctions,
      };

      if (caseType === "single_student") {
        if (accusedStudents.length === 0) {
          throw new Error("Please select at least one accused student");
        }
        if (accusedStudents.length === 1) {
          requestBody.student_id = accusedStudents[0].studentId;
        } else {
          requestBody.student_ids = accusedStudents.map((student) => student.studentId);
        }
        requestBody.student_case_process = studentCaseProcess;
      } else if (caseType === "multiple_student") {
        if (selectedStudents.length === 0) {
          throw new Error("Please select at least one student");
        }
        requestBody.student_ids = selectedStudents.map((student) => student.studentId);
      } else if (caseType === "single_staff") {
        if (!staffId) {
          throw new Error("Please select a staff member");
        }
        requestBody.staff_id = staffId;
      } else if (selectedStaffMembers.length === 0) {
        throw new Error("Please select at least one staff member");
      } else {
        requestBody.staff_ids = selectedStaffMembers.map((member) => member.staffId);
      }

      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const createdCase = await res.json();

      if (caseType === "single_student" && statementAudioFile && createdCase?._id) {
        await uploadStatementAudioEvidence(createdCase._id);
      }

      if (caseType === "single_student") {
        setSuccess("Student case created with the 4-step KMU process.");
      } else if (caseType === "multiple_student") {
        setSuccess(`Case created successfully for ${selectedStudents.length} student(s).`);
      } else if (caseType === "single_staff") {
        setSuccess("Case created successfully for staff member.");
      } else {
        setSuccess(`Case created successfully for ${selectedStaffMembers.length} staff member(s).`);
      }

      resetAll();
    } catch (err: any) {
      setError(err?.message || "Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  const renderSelectedStudentCard = () => (
    selectedStudent ? (
      <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-green-800 dark:text-green-200">{selectedStudent.fullName}</div>
            <div className="text-sm text-green-600 dark:text-green-300">
              ID: {selectedStudent.studentId} • {selectedStudent.program || selectedStudent.department || "N/A"} • Year {selectedStudent.year || "N/A"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStudent(null);
              setStudentId("");
              resetStudentCaseProcess();
            }}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            ×
          </button>
        </div>
      </div>
    ) : null
  );

  const renderStudentWizardStep = () => {
    if (studentCaseStep === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-md mb-2 font-medium text-kmuGreen">Accused Students</h3>
            <SmartStudentSearch
              onStudentSelect={handleAddAccusedStudent}
              placeholder="Search and add accused students..."
              className="w-full"
            />
            {accusedStudents.length > 0 && (
              <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <div className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
                  Added accused students ({accusedStudents.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {accusedStudents.map((student, index) => (
                    <span key={student.studentId} className="inline-flex items-center gap-1 rounded bg-kmuGreen px-2 py-1 text-sm text-white">
                      {student.fullName}{index === 0 ? " (primary)" : ""}
                      <button
                        type="button"
                        onClick={() => removeAccusedStudent(student.studentId)}
                        className="ml-1 rounded-full hover:bg-red-500"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="mb-4 font-semibold text-kmuOrange">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT OCCURRENCE DOCKET COVER</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Investigating Officer"
                value={studentCaseProcess.occurrenceCover.investigatingOfficer}
                onChange={(value) => updateOccurrenceField("investigatingOfficer", value)}
              />
              <Field
                label="Occurrence Book Number"
                value={studentCaseProcess.occurrenceCover.occurrenceBookNumber}
                onChange={(value) => updateOccurrenceField("occurrenceBookNumber", value)}
              />
              <Field
                label="Date & Time Reported"
                value={studentCaseProcess.occurrenceCover.reportedAt}
                onChange={(value) => updateOccurrenceField("reportedAt", value)}
                type="datetime-local"
              />
              <Field
                label="Incident Date"
                value={incidentDate}
                onChange={setIncidentDate}
                type="date"
              />
              <div>
                <label className="mb-1 block text-sm font-medium">Offense Type</label>
                <select
                  value={offenseType}
                  onChange={(e) => handleOffenseTypeChange(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select offense type...</option>
                  {OFFENSE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select severity...</option>
                  {SEVERITY_LEVELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {offenseTypeDescription && (
              <p className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {offenseTypeDescription}
              </p>
            )}

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h5 className="font-semibold">Particulars of the Complainant</h5>
                <Field label="Name" value={studentCaseProcess.occurrenceCover.complainant.name} onChange={(value) => updateOccurrencePersonField("name", value)} />
                <Field label="Residential Address" value={studentCaseProcess.occurrenceCover.complainant.residentialAddress} onChange={(value) => updateOccurrencePersonField("residentialAddress", value)} />
                <Field label="SIN/Phone No" value={studentCaseProcess.occurrenceCover.complainant.sinPhone} onChange={(value) => updateOccurrencePersonField("sinPhone", value)} />
                <Field label="Year of Study" value={studentCaseProcess.occurrenceCover.complainant.yearOfStudy} onChange={(value) => updateOccurrencePersonField("yearOfStudy", value)} />
                <Field label="Program of Study" value={studentCaseProcess.occurrenceCover.complainant.programOfStudy} onChange={(value) => updateOccurrencePersonField("programOfStudy", value)} />
                <Field label="Sex/Age" value={studentCaseProcess.occurrenceCover.complainant.sexAge} onChange={(value) => updateOccurrencePersonField("sexAge", value)} />
                <Field label="Nationality/Tribe" value={studentCaseProcess.occurrenceCover.complainant.nationalityTribe} onChange={(value) => updateOccurrencePersonField("nationalityTribe", value)} />
                <Field label="Village" value={studentCaseProcess.occurrenceCover.complainant.village} onChange={(value) => updateOccurrencePersonField("village", value)} />
                <Field label="Chief" value={studentCaseProcess.occurrenceCover.complainant.chief} onChange={(value) => updateOccurrencePersonField("chief", value)} />
                <Field label="District" value={studentCaseProcess.occurrenceCover.complainant.district} onChange={(value) => updateOccurrencePersonField("district", value)} />
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold">Particulars of the Accused</h5>
                {studentCaseProcess.occurrenceCover.accusedPeople.length === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    Add at least one accused student to populate this section.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentCaseProcess.occurrenceCover.accusedPeople.map((accused, index) => (
                      <div key={`${accused.sinPhone}-${index}`} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-3 text-sm font-semibold text-kmuGreen">Accused {index + 1}</div>
                        <div className="space-y-3">
                          <Field label="Name" value={accused.name} onChange={(value) => updateAccusedPersonField(index, "name", value)} />
                          <Field label="Residential Address" value={accused.residentialAddress} onChange={(value) => updateAccusedPersonField(index, "residentialAddress", value)} />
                          <Field label="SIN/Phone No" value={accused.sinPhone} onChange={(value) => updateAccusedPersonField(index, "sinPhone", value)} />
                          <Field label="Year of Study" value={accused.yearOfStudy} onChange={(value) => updateAccusedPersonField(index, "yearOfStudy", value)} />
                          <Field label="Program of Study" value={accused.programOfStudy} onChange={(value) => updateAccusedPersonField(index, "programOfStudy", value)} />
                          <Field label="Sex/Age" value={accused.sexAge} onChange={(value) => updateAccusedPersonField(index, "sexAge", value)} />
                          <Field label="Nationality/Tribe" value={accused.nationalityTribe} onChange={(value) => updateAccusedPersonField(index, "nationalityTribe", value)} />
                          <Field label="Village" value={accused.village} onChange={(value) => updateAccusedPersonField(index, "village", value)} />
                          <Field label="Chief" value={accused.chief} onChange={(value) => updateAccusedPersonField(index, "chief", value)} />
                          <Field label="District" value={accused.district} onChange={(value) => updateAccusedPersonField(index, "district", value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <TextAreaField label="Date, Time and Place of Occurrence" value={studentCaseProcess.occurrenceCover.occurrenceDetails} onChange={(value) => updateOccurrenceField("occurrenceDetails", value)} rows={3} />
              <TextAreaField label="Case Description" value={description} onChange={setDescription} placeholder="Provide a detailed description of the incident..." rows={4} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Value of Damaged or Stolen Property" value={studentCaseProcess.occurrenceCover.propertyDamageValue} onChange={(value) => updateOccurrenceField("propertyDamageValue", value)} />
                <Field label="Value of Property Recovered" value={studentCaseProcess.occurrenceCover.propertyRecoveredValue} onChange={(value) => updateOccurrenceField("propertyRecoveredValue", value)} />
              </div>
              <TextAreaField label="Manner and Date of Disposal by the Disciplinary Committee" value={studentCaseProcess.occurrenceCover.disciplinaryDisposal} onChange={(value) => updateOccurrenceField("disciplinaryDisposal", value)} rows={3} />
              <Field label="Sanctions (Optional)" value={sanctions} onChange={setSanctions} placeholder="Any sanctions or disciplinary measures applied" />
            </div>
          </div>
        </div>
      );
    }

    if (studentCaseStep === 1) {
      return (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h4 className="mb-4 font-semibold text-kmuOrange">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT CALL OUT</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Names" value={studentCaseProcess.summon.fullNames} onChange={(value) => updateSummonField("fullNames", value)} />
            <Field label="SIN" value={studentCaseProcess.summon.sin} onChange={(value) => updateSummonField("sin", value)} />
            <Field label="Sex" value={studentCaseProcess.summon.sex} onChange={(value) => updateSummonField("sex", value)} />
            <Field label="Age" value={studentCaseProcess.summon.age} onChange={(value) => updateSummonField("age", value)} />
            <Field label="Program of Study" value={studentCaseProcess.summon.programOfStudy} onChange={(value) => updateSummonField("programOfStudy", value)} />
            <Field label="Year of Study" value={studentCaseProcess.summon.yearOfStudy} onChange={(value) => updateSummonField("yearOfStudy", value)} />
            <Field label="Residential Address" value={studentCaseProcess.summon.residentialAddress} onChange={(value) => updateSummonField("residentialAddress", value)} />
            <Field label="Phone No" value={studentCaseProcess.summon.phoneNo} onChange={(value) => updateSummonField("phoneNo", value)} />
            <Field label="Report Time" value={studentCaseProcess.summon.reportTime} onChange={(value) => updateSummonField("reportTime", value)} type="time" />
            <Field label="Day & Date" value={studentCaseProcess.summon.reportDate} onChange={(value) => updateSummonField("reportDate", value)} type="date" />
            <Field label="Appointment" value={studentCaseProcess.summon.appointment} onChange={(value) => updateSummonField("appointment", value)} />
          </div>
          <div className="mt-4">
            <SignatureField
              label="Signature"
              value={studentCaseProcess.summon.signature}
              onChange={(value) => updateSummonField("signature", value)}
              helperText="Draw the call out acknowledgement signature."
            />
          </div>
        </div>
      );
    }

    if (studentCaseStep === 2) {
      return (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h4 className="mb-4 font-semibold text-kmuOrange">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT STATEMENT PAD</h4>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Statement Type</label>
            <select
              value={studentCaseProcess.statementPad.statementRole}
              onChange={(e) => updateStatementField("statementRole", e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="Complainant">Complainant</option>
              <option value="Witness">Witness</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Name" value={studentCaseProcess.statementPad.fullName} onChange={(value) => updateStatementField("fullName", value)} />
            <Field label="Sex/Age" value={studentCaseProcess.statementPad.sexAge} onChange={(value) => updateStatementField("sexAge", value)} />
            <Field label="SIN No" value={studentCaseProcess.statementPad.sinNo} onChange={(value) => updateStatementField("sinNo", value)} />
            <Field label="Occupation/Prog" value={studentCaseProcess.statementPad.occupationProg} onChange={(value) => updateStatementField("occupationProg", value)} />
            <Field label="Phone No" value={studentCaseProcess.statementPad.phoneNo} onChange={(value) => updateStatementField("phoneNo", value)} />
            <Field label="Tribe" value={studentCaseProcess.statementPad.tribe} onChange={(value) => updateStatementField("tribe", value)} />
            <Field label="Village" value={studentCaseProcess.statementPad.village} onChange={(value) => updateStatementField("village", value)} />
            <Field label="Chief" value={studentCaseProcess.statementPad.chief} onChange={(value) => updateStatementField("chief", value)} />
            <Field label="District" value={studentCaseProcess.statementPad.district} onChange={(value) => updateStatementField("district", value)} />
            <Field label="Residential Address" value={studentCaseProcess.statementPad.residentialAddress} onChange={(value) => updateStatementField("residentialAddress", value)} />
            <Field label="Business Address" value={studentCaseProcess.statementPad.businessAddress} onChange={(value) => updateStatementField("businessAddress", value)} />
            <Field label="Taken On (Date)" value={studentCaseProcess.statementPad.takenDate} onChange={(value) => updateStatementField("takenDate", value)} type="date" />
            <Field label="Taken At (Time)" value={studentCaseProcess.statementPad.takenTime} onChange={(value) => updateStatementField("takenTime", value)} type="time" />
            <Field label="I Recall It Was Around" value={studentCaseProcess.statementPad.recallTime} onChange={(value) => updateStatementField("recallTime", value)} type="time" />
            <Field label="Signed Date" value={studentCaseProcess.statementPad.signedDate} onChange={(value) => updateStatementField("signedDate", value)} type="date" />
            <Field label="Signed Time" value={studentCaseProcess.statementPad.signedTime} onChange={(value) => updateStatementField("signedTime", value)} type="time" />
          </div>
          <div className="mt-4">
            <SignatureField
              label="Signature"
              value={studentCaseProcess.statementPad.signature}
              onChange={(value) => updateStatementField("signature", value)}
              helperText="Draw the complainant or witness signature."
            />
          </div>
          <div className="mt-4">
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h5 className="font-semibold text-kmuGreen">Statement Capture Tools</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Use browser speech-to-text to draft faster while recording the original audio at the same time.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeechToText}
                    disabled={!isSpeechSupported}
                    className="rounded border border-kmuGreen px-3 py-2 text-sm font-medium text-kmuGreen disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isListening ? "Stop Dictation + Audio" : "Start Dictation + Audio"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleAudioRecording}
                    className={`rounded px-3 py-2 text-sm font-medium text-white ${isRecordingAudio ? "bg-red-600 hover:bg-red-700" : "bg-kmuOrange hover:bg-kmuOrange/90"}`}
                  >
                    {isRecordingAudio ? "Stop Audio Only" : "Record Audio Only"}
                  </button>
                </div>
              </div>

              {!isSpeechSupported && (
                <p className="mt-3 text-xs text-orange-600 dark:text-orange-300">
                  Built-in speech-to-text is not available in this browser.
                </p>
              )}

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium">Attach Audio File</label>
                <input
                  type="file"
                  accept=".ogg,.opus,.m4a,.mp3,.webm,.wav,audio/ogg,audio/opus,audio/mp4,audio/mpeg,audio/webm,audio/wav"
                  onChange={(e) => handleStatementAudioFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 dark:text-gray-300"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Keep it small, under 10MB. WhatsApp-style voice notes such as `.ogg`, `.opus`, `.m4a`, and `.mp3` are supported.
                </p>
              </div>

              {statementAudioFile && (
                <div className="mt-4 rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{statementAudioFile.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(statementAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearStatementAudio}
                      className="text-sm font-medium text-red-600 underline"
                    >
                      Remove audio
                    </button>
                  </div>
                  {statementAudioUrl && (
                    <audio controls className="mt-3 w-full">
                      <source src={statementAudioUrl} />
                    </audio>
                  )}
                </div>
              )}
            </div>

            <TextAreaField
              label="Statement"
              value={studentCaseProcess.statementPad.statementText}
              onChange={(value) => updateStatementField("statementText", value)}
              rows={8}
              placeholder="I do recall very well that it was around..."
            />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="mb-4 font-semibold text-kmuOrange">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT WARN AND CAUTION</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full Names" value={studentCaseProcess.warnAndCaution.fullNames} onChange={(value) => updateWarnField("fullNames", value)} />
          <Field label="Sex" value={studentCaseProcess.warnAndCaution.sex} onChange={(value) => updateWarnField("sex", value)} />
          <Field label="Tribe" value={studentCaseProcess.warnAndCaution.tribe} onChange={(value) => updateWarnField("tribe", value)} />
          <Field label="Age" value={studentCaseProcess.warnAndCaution.age} onChange={(value) => updateWarnField("age", value)} />
          <Field label="Residential Address" value={studentCaseProcess.warnAndCaution.residentialAddress} onChange={(value) => updateWarnField("residentialAddress", value)} />
          <Field label="Village" value={studentCaseProcess.warnAndCaution.village} onChange={(value) => updateWarnField("village", value)} />
          <Field label="Chief" value={studentCaseProcess.warnAndCaution.chief} onChange={(value) => updateWarnField("chief", value)} />
          <Field label="District" value={studentCaseProcess.warnAndCaution.district} onChange={(value) => updateWarnField("district", value)} />
          <Field label="Program of Study" value={studentCaseProcess.warnAndCaution.programOfStudy} onChange={(value) => updateWarnField("programOfStudy", value)} />
          <Field label="Occupation" value={studentCaseProcess.warnAndCaution.occupation} onChange={(value) => updateWarnField("occupation", value)} />
          <Field label="SIN" value={studentCaseProcess.warnAndCaution.sin} onChange={(value) => updateWarnField("sin", value)} />
          <Field label="Phone No" value={studentCaseProcess.warnAndCaution.phoneNo} onChange={(value) => updateWarnField("phoneNo", value)} />
          <Field label="Taken On (Date)" value={studentCaseProcess.warnAndCaution.takenDate} onChange={(value) => updateWarnField("takenDate", value)} type="date" />
          <Field label="At (Time)" value={studentCaseProcess.warnAndCaution.takenTime} onChange={(value) => updateWarnField("takenTime", value)} type="time" />
          <Field label="At (Place)" value={studentCaseProcess.warnAndCaution.place} onChange={(value) => updateWarnField("place", value)} />
          <Field label="Case of" value={studentCaseProcess.warnAndCaution.caseName} onChange={(value) => updateWarnField("caseName", value)} />
          <Field label="Offence Date" value={studentCaseProcess.warnAndCaution.offenceDate} onChange={(value) => updateWarnField("offenceDate", value)} type="date" />
          <Field label="Offence Time" value={studentCaseProcess.warnAndCaution.offenceTime} onChange={(value) => updateWarnField("offenceTime", value)} type="time" />
          <Field label="Offence Place" value={studentCaseProcess.warnAndCaution.offencePlace} onChange={(value) => updateWarnField("offencePlace", value)} />
          <Field label="Signed Date" value={studentCaseProcess.warnAndCaution.signedDate} onChange={(value) => updateWarnField("signedDate", value)} type="date" />
          <Field label="Signed Time" value={studentCaseProcess.warnAndCaution.signedTime} onChange={(value) => updateWarnField("signedTime", value)} type="time" />
        </div>
        <div className="mt-4">
          <SignatureField
            label="Signature"
            value={studentCaseProcess.warnAndCaution.signature}
            onChange={(value) => updateWarnField("signature", value)}
            helperText="Draw the warned and cautioned student's signature."
          />
        </div>
      </div>
    );
  };

  const renderGenericSelection = () => {
    if (caseType === "multiple_student") {
      return (
        <div>
          <h3 className="text-md mb-2 font-medium text-kmuGreen">Select Students</h3>
          <SmartStudentSearch onStudentSelect={handleSmartStudentSelectMultiple} placeholder="Search and add students..." className="w-full" />
          {selectedStudents.length > 0 && (
            <div className="mt-2 rounded bg-gray-50 p-3 dark:bg-gray-700">
              <h4 className="mb-2 text-sm font-medium">Selected Students ({selectedStudents.length})</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <span key={student.studentId} className="inline-flex items-center gap-1 rounded bg-kmuGreen px-2 py-1 text-sm text-white">
                    {student.fullName}
                    <button type="button" onClick={() => removeSelectedStudentSmart(student.studentId)} className="ml-1 rounded-full hover:bg-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (caseType === "single_staff") {
      return (
        <div>
          <h3 className="text-md mb-2 font-medium text-kmuGreen">Select Staff Member</h3>
          <SmartStaffSearch onStaffSelect={handleSmartStaffSelect} placeholder="Search by name or staff ID..." className="w-full" />
          {selectedStaff && (
            <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">{selectedStaff.fullName}</div>
                  <div className="text-sm text-green-600 dark:text-green-300">
                    ID: {selectedStaff.staffId} • {selectedStaff.department || "N/A"} • {selectedStaff.position || "N/A"}
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedStaff(null); setStaffId(""); }} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200">
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (caseType === "multiple_staff") {
      return (
        <div>
          <h3 className="text-md mb-2 font-medium text-kmuGreen">Select Staff Members</h3>
          <SmartStaffSearch onStaffSelect={handleSmartStaffSelectMultiple} placeholder="Search and add staff members..." className="w-full" />
          {selectedStaffMembers.length > 0 && (
            <div className="mt-2 rounded bg-gray-50 p-3 dark:bg-gray-700">
              <h4 className="mb-2 text-sm font-medium">Selected Staff Members ({selectedStaffMembers.length})</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStaffMembers.map((staff) => (
                  <span key={staff.staffId} className="inline-flex items-center gap-1 rounded bg-kmuGreen px-2 py-1 text-sm text-white">
                    {staff.fullName}
                    <button type="button" onClick={() => removeSelectedStaffSmart(staff.staffId)} className="ml-1 rounded-full hover:bg-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <ProtectedRoute>
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-kmuGreen">Create New Case</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-1">
            <QuickCaseTemplates onTemplateSelect={handleTemplateSelect} className="w-full" />
            {caseType === "single_student" || caseType === "multiple_student" ? (
              <RecentStudents onStudentSelect={caseType === "single_student" ? handleAddAccusedStudent : handleSmartStudentSelectMultiple} maxItems={5} className="w-full" />
            ) : (
              <RecentStaff onStaffSelect={caseType === "single_staff" ? handleSmartStaffSelect : handleSmartStaffSelectMultiple} maxItems={5} className="w-full" />
            )}
          </div>

          <div className="md:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-kmuOrange">Case Type</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Student Cases</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex items-center rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
                        <input
                          type="radio"
                          name="caseType"
                          value="single_student"
                          checked={caseType === "single_student"}
                          onChange={() => {
                            setCaseType("single_student");
                            setSelectedStudents([]);
                            setSelectedStaff(null);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Single Student
                      </label>
                      <label className="flex items-center rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
                        <input
                          type="radio"
                          name="caseType"
                          value="multiple_student"
                          checked={caseType === "multiple_student"}
                          onChange={() => {
                            setCaseType("multiple_student");
                            setSelectedStudent(null);
                            setStudentId("");
                            resetStudentCaseProcess();
                            setSelectedStaff(null);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Multiple Students
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Staff Cases</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex items-center rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
                        <input
                          type="radio"
                          name="caseType"
                          value="single_staff"
                          checked={caseType === "single_staff"}
                          onChange={() => {
                            setCaseType("single_staff");
                            setSelectedStudent(null);
                            setStudentId("");
                            resetStudentCaseProcess();
                            setSelectedStudents([]);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Single Staff
                      </label>
                      <label className="flex items-center rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
                        <input
                          type="radio"
                          name="caseType"
                          value="multiple_staff"
                          checked={caseType === "multiple_staff"}
                          onChange={() => {
                            setCaseType("multiple_staff");
                            setSelectedStudent(null);
                            setStudentId("");
                            resetStudentCaseProcess();
                            setSelectedStudents([]);
                            setSelectedStaff(null);
                            setStaffId("");
                          }}
                          className="mr-2"
                        />
                        Multiple Staff
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {caseType === "single_student" ? (
                  <>
                    <div className="rounded-lg border border-kmuGreen/20 bg-kmuGreen/5 p-4 text-sm text-gray-700 dark:border-kmuGreen/30 dark:bg-kmuGreen/10 dark:text-gray-200">
                      Student case creation now follows the KMU four-step process: occurrence docket cover, call out, statement pad, and warn and caution.
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {STUDENT_CASE_STEPS.map((step, index) => {
                        const isActive = index === studentCaseStep;
                        const isCompleted = index < studentCaseStep;

                        return (
                          <button
                            key={step.title}
                            type="button"
                            onClick={() => setStudentCaseStep(index)}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-kmuGreen bg-kmuGreen text-white"
                                : isCompleted
                                  ? "border-kmuOrange bg-kmuOrange/10 text-kmuOrange"
                                  : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            }`}
                          >
                            <div className="text-xs font-semibold uppercase tracking-[0.18em]">Step {index + 1}</div>
                            <div className="mt-1 text-sm font-semibold">{step.title}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                      <h3 className="text-lg font-semibold text-kmuGreen">{activeStudentStep.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{activeStudentStep.subtitle}</p>
                    </div>

                    {renderStudentWizardStep()}

                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {success && <div className="text-sm text-kmuGreen">{success}</div>}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={studentCaseStep === 0 ? () => router.back() : handleStudentStepBack}
                        className="rounded bg-gray-500 px-6 py-2 text-white transition hover:bg-gray-600"
                      >
                        {studentCaseStep === 0 ? "Cancel" : "Back"}
                      </button>

                      {studentCaseStep < STUDENT_CASE_STEPS.length - 1 ? (
                        <button
                          type="button"
                          onClick={handleStudentStepNext}
                          className="rounded bg-kmuGreen px-6 py-2 text-white transition hover:bg-kmuOrange"
                        >
                          Continue
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={loading}
                          className="rounded bg-kmuGreen px-6 py-2 text-white transition hover:bg-kmuOrange disabled:opacity-50"
                        >
                          {loading ? "Creating..." : "Create Case"}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {renderGenericSelection()}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Incident Date" value={incidentDate} onChange={setIncidentDate} type="date" />
                      <div>
                        <label className="mb-1 block text-sm font-medium">Offense Type</label>
                        <select
                          value={offenseType}
                          onChange={(e) => handleOffenseTypeChange(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select offense type...</option>
                          {OFFENSE_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Severity</label>
                        <select
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select severity...</option>
                          {SEVERITY_LEVELS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {offenseTypeDescription && (
                      <p className="rounded bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {offenseTypeDescription}
                      </p>
                    )}

                    <TextAreaField label="Description" value={description} onChange={setDescription} placeholder="Provide a detailed description of the incident..." rows={4} />
                    <Field label="Sanctions (Optional)" value={sanctions} onChange={setSanctions} placeholder="Any sanctions or disciplinary measures applied" />

                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {success && <div className="text-sm text-kmuGreen">{success}</div>}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-kmuGreen px-6 py-2 text-white transition hover:bg-kmuOrange disabled:opacity-50"
                      >
                        {loading ? "Creating..." : "Create Case"}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-full rounded bg-gray-500 px-6 py-2 text-white transition hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
}
