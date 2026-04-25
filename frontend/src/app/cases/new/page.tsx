"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../(protected)/ProtectedRoute";
import { API_BASE_URL, OFFENSE_TYPES, SEVERITY_LEVELS } from "../../../config/constants";
import { authHeaders } from "../../../utils/api";
import SmartStudentSearch from "../../../components/SmartStudentSearch";
import SmartStaffSearch from "../../../components/SmartStaffSearch";
import QuickCaseTemplates from "../../../components/QuickCaseTemplates";
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

type CaseType = "single_student" | "single_staff" | "multiple_staff";

type PersonParticulars = {
  name: string;
  residentialAddress: string;
  sin: string;
  phoneNo: string;
  yearOfStudy: string;
  programOfStudy: string;
  sex: string;
  age: string;
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
    sex: string;
    age: string;
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
  sin: "",
  phoneNo: "",
  yearOfStudy: "",
  programOfStudy: "",
  sex: "",
  age: "",
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
      sex: "",
      age: "",
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
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white ${readOnly ? "bg-gray-100 dark:bg-gray-600/50" : "bg-white dark:bg-gray-700"}`}
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
  const [accusedStudents, setAccusedStudents] = useState<Student[]>([]);
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
  const [caseNumberPreview, setCaseNumberPreview] = useState("");
  const [printOnlyCalloutIndex, setPrintOnlyCalloutIndex] = useState<number | null>(null);
  const [selectedAccusedIndex, setSelectedAccusedIndex] = useState(0);
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
  sin: student.studentId || "",
  phoneNo: "",
    yearOfStudy: student.year || "",
    programOfStudy: student.program || student.department || "",
  sex: student.gender || "",
  age: "",
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

  const printAllCallouts = () => {
    setPrintOnlyCalloutIndex(null);
    window.print();
  };

  const printSingleCallout = (index: number) => {
    setPrintOnlyCalloutIndex(index);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintOnlyCalloutIndex(null), 300);
    }, 0);
  };

  const handleAddAccusedStudent = (student: Student) => {
    setAccusedStudents((prev) => {
      if (prev.some((item) => item.studentId === student.studentId)) {
        return prev;
      }

      const next = [...prev, student];
      if (next.length === 1) {
        setStudentId(student.studentId);
        setSelectedAccusedIndex(0);
        syncPrimaryAccusedDetails(student);
      } else {
        setStudentCaseProcess((current) => ({
          ...current,
          occurrenceCover: {
            ...current.occurrenceCover,
            accusedPeople: [...current.occurrenceCover.accusedPeople, buildAccusedPerson(student)],
          },
        }));
        setSelectedAccusedIndex(next.length - 1);
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
        setStudentId("");
        setSelectedAccusedIndex(0);
      } else {
        setStudentId(next[0].studentId);
        setSelectedAccusedIndex(0);
        syncPrimaryAccusedDetails(next[0]);
      }

      return next;
    });
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
      if (!studentCaseProcess.occurrenceCover.reportedAt.trim()) return "Date and time reported is required.";
      if (!studentCaseProcess.occurrenceCover.complainant.name.trim()) return "Complainant name is required.";
      if (!incidentDate) return "Incident date is required.";
      if (!offenseType) return "Offense type is required.";
      if (!severity) return "Severity is required.";
      if (!description.trim()) return "Description is required.";
      return null;
    }

    if (step === 1) {
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
    setAccusedStudents([]);
    setSelectedStaff(null);
    setSelectedStaffMembers([]);
    setIncidentDate("");
    setOffenseType("");
    setSeverity("");
    setDescription("");
    setSanctions("");
    setOffenseTypeDescription("");
    setCaseNumberPreview("");
    clearStatementAudio();
    resetStudentCaseProcess();
    setCaseType("single_student");
  };

  const buildRequestBody = (asDraft: boolean) => {
    const requestBody: any = {
      incident_date: incidentDate || undefined,
      offense_type: offenseType || undefined,
      severity: severity || undefined,
      description: description || undefined,
      sanctions,
      status: asDraft ? "Draft" : "Open",
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

    return requestBody;
  };

  async function saveCase(asDraft: boolean) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!asDraft && caseType === "single_student") {
        const validationError = validateStep(0);
        if (validationError) {
          throw new Error(validationError);
        }
      }

      const requestBody = buildRequestBody(asDraft);

      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const createdCase = await res.json();
      const generatedCaseNumber = createdCase.caseId || createdCase.case_id || "";
      setCaseNumberPreview(generatedCaseNumber);
      if (generatedCaseNumber) {
        setStudentCaseProcess((prev) => ({
          ...prev,
          occurrenceCover: {
            ...prev.occurrenceCover,
            occurrenceBookNumber: generatedCaseNumber,
          },
        }));
      }

      if (!asDraft && caseType === "single_student" && statementAudioFile && createdCase?._id) {
        await uploadStatementAudioEvidence(createdCase._id);
      }

      if (asDraft) {
        setSuccess(`Draft saved successfully. Case number: ${createdCase.caseId || createdCase.case_id || "generated"}.`);
      } else if (caseType === "single_student") {
        setSuccess("Case created from docket cover. Complete Call Out, Statement Pad, and Warn & Caution later.");
      } else if (caseType === "single_staff") {
        setSuccess("Case created successfully for staff member.");
      } else {
        setSuccess(`Case created successfully for ${selectedStaffMembers.length} staff member(s).`);
      }

      if (!asDraft) {
        resetAll();
      }
    } catch (err: any) {
      setError(err?.message || "Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveCase(false);
  }

  const renderStudentWizardStep = () => {
    if (studentCaseStep === 0) {
      const selectedAccused = studentCaseProcess.occurrenceCover.accusedPeople[selectedAccusedIndex];

      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="mb-4 font-semibold text-kmuOrange">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT OCCURRENCE DOCKET COVER</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Investigating Officer"
                value={studentCaseProcess.occurrenceCover.investigatingOfficer}
                onChange={(value) => updateOccurrenceField("investigatingOfficer", value)}
              />
              <Field
                label="Case Number"
                value={caseNumberPreview || studentCaseProcess.occurrenceCover.occurrenceBookNumber || "Auto-generated on save"}
                onChange={() => {}}
                readOnly
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
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <Field label="Name" value={studentCaseProcess.occurrenceCover.complainant.name} onChange={(value) => updateOccurrencePersonField("name", value)} />
                  <Field label="Residential Address" value={studentCaseProcess.occurrenceCover.complainant.residentialAddress} onChange={(value) => updateOccurrencePersonField("residentialAddress", value)} />
                  <Field label="SIN" value={studentCaseProcess.occurrenceCover.complainant.sin} onChange={(value) => updateOccurrencePersonField("sin", value)} />
                  <Field label="Phone No" value={studentCaseProcess.occurrenceCover.complainant.phoneNo} onChange={(value) => updateOccurrencePersonField("phoneNo", value)} />
                  <Field label="Year of Study" value={studentCaseProcess.occurrenceCover.complainant.yearOfStudy} onChange={(value) => updateOccurrencePersonField("yearOfStudy", value)} />
                  <Field label="Program of Study" value={studentCaseProcess.occurrenceCover.complainant.programOfStudy} onChange={(value) => updateOccurrencePersonField("programOfStudy", value)} />
                  <Field label="Sex" value={studentCaseProcess.occurrenceCover.complainant.sex} onChange={(value) => updateOccurrencePersonField("sex", value)} />
                  <Field label="Age" value={studentCaseProcess.occurrenceCover.complainant.age} onChange={(value) => updateOccurrencePersonField("age", value)} />
                  <Field label="Nationality/Tribe" value={studentCaseProcess.occurrenceCover.complainant.nationalityTribe} onChange={(value) => updateOccurrencePersonField("nationalityTribe", value)} />
                  <Field label="Village" value={studentCaseProcess.occurrenceCover.complainant.village} onChange={(value) => updateOccurrencePersonField("village", value)} />
                  <Field label="Chief" value={studentCaseProcess.occurrenceCover.complainant.chief} onChange={(value) => updateOccurrencePersonField("chief", value)} />
                  <Field label="District" value={studentCaseProcess.occurrenceCover.complainant.district} onChange={(value) => updateOccurrencePersonField("district", value)} />
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold">Particulars of the Accused</h5>
                <SmartStudentSearch
                  onStudentSelect={handleAddAccusedStudent}
                  placeholder="Search and add accused students..."
                  className="w-full"
                />
                {studentCaseProcess.occurrenceCover.accusedPeople.length === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    Add at least one accused student to populate this section.
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {accusedStudents.map((student, index) => (
                        <span key={student.studentId} className="inline-flex items-center gap-1 rounded bg-kmuGreen px-2 py-1 text-xs text-white">
                          {student.fullName}{index === 0 ? " (primary)" : ""}
                          <button
                            type="button"
                            onClick={() => removeAccusedStudent(student.studentId)}
                            className="ml-1 rounded-full px-1 hover:bg-red-500"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Select Accused</label>
                      <select
                        value={selectedAccusedIndex}
                        onChange={(e) => setSelectedAccusedIndex(Number(e.target.value))}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {studentCaseProcess.occurrenceCover.accusedPeople.map((accused, index) => (
                          <option key={`${accused.sin || index}-opt`} value={index}>
                            {accused.name || `Accused ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedAccused && (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <Field label="Name" value={selectedAccused.name} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "name", value)} />
                        <Field label="Residential Address" value={selectedAccused.residentialAddress} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "residentialAddress", value)} />
                        <Field label="SIN" value={selectedAccused.sin} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "sin", value)} />
                        <Field label="Phone No" value={selectedAccused.phoneNo} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "phoneNo", value)} />
                        <Field label="Year of Study" value={selectedAccused.yearOfStudy} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "yearOfStudy", value)} />
                        <Field label="Program of Study" value={selectedAccused.programOfStudy} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "programOfStudy", value)} />
                        <Field label="Sex" value={selectedAccused.sex} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "sex", value)} />
                        <Field label="Age" value={selectedAccused.age} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "age", value)} />
                        <Field label="Nationality/Tribe" value={selectedAccused.nationalityTribe} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "nationalityTribe", value)} />
                        <Field label="Village" value={selectedAccused.village} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "village", value)} />
                        <Field label="Chief" value={selectedAccused.chief} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "chief", value)} />
                        <Field label="District" value={selectedAccused.district} onChange={(value) => updateAccusedPersonField(selectedAccusedIndex, "district", value)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-kmuOrange">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT CALL OUT</h4>
            <button
              type="button"
              onClick={printAllCallouts}
              className="rounded border border-kmuGreen px-3 py-2 text-sm font-medium text-kmuGreen transition hover:bg-kmuGreen/10 print:hidden"
            >
              Print Call Out(s)
            </button>
          </div>
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Report Time" value={studentCaseProcess.summon.reportTime} onChange={(value) => updateSummonField("reportTime", value)} type="time" />
            <Field label="Day & Date" value={studentCaseProcess.summon.reportDate} onChange={(value) => updateSummonField("reportDate", value)} type="date" />
            <Field label="Appointment" value={studentCaseProcess.summon.appointment} onChange={(value) => updateSummonField("appointment", value)} />
          </div>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300 print:hidden">
            Each accused student gets an individual call out auto-filled from the docket cover details.
          </p>
          <div id="callout-print-area" className="space-y-6">
            {studentCaseProcess.occurrenceCover.accusedPeople.map((accused, index) => (
              <div
                key={`callout-${accused.sin || index}`}
                data-callout-index={index}
                className={`callout-print-sheet rounded-lg border border-gray-300 bg-white p-4 text-sm text-black shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white print:mb-2 print:rounded-md print:border-black print:p-2 print:text-[11px] print:leading-tight print:shadow-none ${
                  printOnlyCalloutIndex !== null && printOnlyCalloutIndex !== index ? "print:hidden" : ""
                }`}
              >
                <div className="mb-2 flex justify-end print:hidden">
                  <button
                    type="button"
                    onClick={() => printSingleCallout(index)}
                    className="rounded border border-kmuOrange px-2 py-1 text-xs font-medium text-kmuOrange transition hover:bg-kmuOrange/10"
                  >
                    Print This Callout
                  </button>
                </div>
                <div className="mb-2 text-center">
                  <h5 className="text-sm font-bold print:text-[11px]">KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT</h5>
                  <p className="font-semibold">CALL OUT</p>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 print:grid-cols-2">
                  <div><span className="font-semibold">Full Names:</span> {accused.name || "____________________"}</div>
                  <div><span className="font-semibold">SIN:</span> {accused.sin || "____________________"}</div>
                  <div><span className="font-semibold">Sex:</span> {accused.sex || "____________________"}</div>
                  <div><span className="font-semibold">Age:</span> {accused.age || "____________________"}</div>
                  <div><span className="font-semibold">Program of Study:</span> {accused.programOfStudy || "____________________"}</div>
                  <div><span className="font-semibold">Year of Study:</span> {accused.yearOfStudy || "____________________"}</div>
                  <div><span className="font-semibold">Residential Address:</span> {accused.residentialAddress || "____________________"}</div>
                  <div><span className="font-semibold">Phone No:</span> {accused.phoneNo || "____________________"}</div>
                  <div><span className="font-semibold">Report Time:</span> {studentCaseProcess.summon.reportTime || "____________________"}</div>
                  <div><span className="font-semibold">Day & Date:</span> {studentCaseProcess.summon.reportDate || "____________________"}</div>
                  <div className="md:col-span-2"><span className="font-semibold">Appointment:</span> {studentCaseProcess.summon.appointment || "____________________"}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="border-t border-black pt-2 text-center">Officer Signature</div>
                  <div className="border-t border-black pt-2 text-center">Student Signature</div>
                </div>
                <div className="mt-2 text-right text-xs text-gray-500 dark:text-gray-300">
                  Call Out {index + 1} of {studentCaseProcess.occurrenceCover.accusedPeople.length}
                </div>
              </div>
            ))}
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
            <Field label="Sex" value={studentCaseProcess.statementPad.sex} onChange={(value) => updateStatementField("sex", value)} />
            <Field label="Age" value={studentCaseProcess.statementPad.age} onChange={(value) => updateStatementField("age", value)} />
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
            <div className="mt-4">
              <SignatureField
                label="Signature"
                value={studentCaseProcess.statementPad.signature}
                onChange={(value) => updateStatementField("signature", value)}
                helperText="Draw the complainant or witness signature."
              />
            </div>
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
        </div>
        <div className="mt-4">
          <SignatureField
            label="Signature"
            value={studentCaseProcess.warnAndCaution.signature}
            onChange={(value) => updateWarnField("signature", value)}
            helperText="Draw the warned and cautioned student's signature."
          />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Signed Date" value={studentCaseProcess.warnAndCaution.signedDate} onChange={(value) => updateWarnField("signedDate", value)} type="date" />
            <Field label="Signed Time" value={studentCaseProcess.warnAndCaution.signedTime} onChange={(value) => updateWarnField("signedTime", value)} type="time" />
          </div>
        </div>
      </div>
    );
  };

  const renderGenericSelection = () => {
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
      <section className="mx-auto w-full max-w-5xl px-4 py-2 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-kmuGreen">Create New Case</h1>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
              <div className="mb-6">
                <QuickCaseTemplates onTemplateSelect={handleTemplateSelect} className="w-full sm:w-auto" />
              </div>

              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-kmuOrange">Case Type</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Student Cases</label>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="flex items-center rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
                        <input
                          type="radio"
                          name="caseType"
                          value="single_student"
                          checked={caseType === "single_student"}
                          onChange={() => {
                            setCaseType("single_student");
                            setSelectedStaff(null);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Single Student
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
                            setStudentId("");
                            resetStudentCaseProcess();
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
                            setStudentId("");
                            resetStudentCaseProcess();
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

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={studentCaseStep === 0 ? () => router.back() : handleStudentStepBack}
                        className="rounded bg-gray-500 px-6 py-2 text-white transition hover:bg-gray-600"
                      >
                        {studentCaseStep === 0 ? "Cancel" : "Back"}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveCase(true)}
                          disabled={loading}
                          className="rounded border border-kmuGreen px-6 py-2 text-kmuGreen transition hover:bg-kmuGreen/10 disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save Draft"}
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="rounded bg-kmuGreen px-6 py-2 text-white transition hover:bg-kmuOrange disabled:opacity-50"
                        >
                          {loading ? "Creating..." : "Create Case"}
                        </button>
                        {studentCaseStep < STUDENT_CASE_STEPS.length - 1 && (
                          <button
                            type="button"
                            onClick={handleStudentStepNext}
                            className="rounded bg-kmuOrange px-6 py-2 text-white transition hover:bg-kmuOrange/90"
                          >
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <RecentStaff onStaffSelect={caseType === "single_staff" ? handleSmartStaffSelect : handleSmartStaffSelectMultiple} maxItems={5} className="w-full" />

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
      </section>
    </ProtectedRoute>
  );
}
