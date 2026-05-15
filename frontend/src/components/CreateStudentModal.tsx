"use client";

import { useMemo, useState } from 'react';
import { X, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { getAvailableYearsForProgram, PROGRAM_OPTIONS } from '../config/constants';
import { registerStudent } from '../utils/api';

type CreateStudentFormState = {
  studentId: string;
  password: string;
  confirmPassword: string;
  program: string;
  year: string;
  deliveryMode: string;
  personalInfo: {
    firstName: string;
    surName: string;
    nrc: string;
    passport: string;
    maritalStatus: string;
    nationality: string;
    gender: string;
    dateOfBirth: string;
  };
  accommodation: {
    roomNumber: string;
  };
  addressInfo: {
    province: string;
    town: string;
    address: string;
    phone: string;
    email: string;
  };
};

const INITIAL_FORM: CreateStudentFormState = {
  studentId: '',
  password: '',
  confirmPassword: '',
  program: '',
  year: '',
  deliveryMode: '',
  personalInfo: {
    firstName: '',
    surName: '',
    nrc: '',
    passport: '',
    maritalStatus: '',
    nationality: '',
    gender: '',
    dateOfBirth: '',
  },
  accommodation: {
    roomNumber: '',
  },
  addressInfo: {
    province: '',
    town: '',
    address: '',
    phone: '',
    email: '',
  },
};

const STEP_TITLES = [
  'Account & Academics',
  'Personal Details',
  'Accommodation & Contact',
  'Review & Submit',
];

const DELIVERY_MODES = ['Full Time', 'Part Time', 'Distance'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const GENDERS = ['Male', 'Female', 'Other'];

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateStudentModal({ isOpen, onClose, onSuccess }: CreateStudentModalProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateStudentFormState>(INITIAL_FORM);

  const availableYears = useMemo(
    () => getAvailableYearsForProgram(form.program),
    [form.program]
  );

  const updateField = (field: keyof CreateStudentFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (
    section: 'personalInfo' | 'accommodation' | 'addressInfo',
    field: string,
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.studentId.trim()) return 'Student ID is required.';
      if (!form.password) return 'Password is required.';
      if (form.password.length < 6) return 'Password must be at least 6 characters.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
      if (!form.program.trim()) return 'Program is required.';
      if (!form.year) return 'Year is required.';
      return '';
    }

    if (step === 1) {
      if (!form.personalInfo.firstName.trim()) return 'First name is required.';
      if (!form.personalInfo.surName.trim()) return 'Surname is required.';
      if (!form.personalInfo.gender) return 'Gender is required.';
      if (!form.personalInfo.dateOfBirth) return 'Date of birth is required.';
      return '';
    }

    if (step === 2) {
      if (!form.addressInfo.email.trim()) return 'Email is required.';
      if (!form.addressInfo.phone.trim()) return 'Phone number is required.';
      if (!form.addressInfo.address.trim()) return 'Address is required.';
      if (!form.accommodation.roomNumber.trim()) return 'Room number is required.';
      return '';
    }

    return '';
  };

  const handleNext = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(prev => Math.min(prev + 1, STEP_TITLES.length - 1));
  };

  const handleBack = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await registerStudent({
        studentId: form.studentId.trim(),
        password: form.password,
        program: form.program.trim(),
        year: form.year,
        deliveryMode: form.deliveryMode,
        personalInfo: {
          ...form.personalInfo,
          firstName: form.personalInfo.firstName.trim(),
          surName: form.personalInfo.surName.trim(),
          nrc: form.personalInfo.nrc.trim(),
          passport: form.personalInfo.passport.trim(),
          nationality: form.personalInfo.nationality.trim(),
        },
        accommodation: {
          roomNumber: form.accommodation.roomNumber.trim(),
        },
        addressInfo: {
          province: form.addressInfo.province.trim(),
          town: form.addressInfo.town.trim(),
          address: form.addressInfo.address.trim(),
          phone: form.addressInfo.phone.trim(),
          email: form.addressInfo.email.trim(),
        },
      });

      setForm(INITIAL_FORM);
      setStep(0);
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to create student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClassName = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const selectClassName = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg dark:bg-gray-800">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold text-kmuGreen">Create Student User</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between gap-2">
            {STEP_TITLES.map((title, i) => (
              <div key={title} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= i ? 'bg-kmuGreen text-white' : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {step > i ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider text-center ${
                  step >= i ? 'text-kmuGreen' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 0: Account & Academics */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Student ID *</label>
                <input
                  type="text"
                  value={form.studentId}
                  onChange={(e) => updateField('studentId', e.target.value)}
                  className={inputClassName}
                  placeholder="e.g., STU001"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={inputClassName}
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Confirm Password *</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className={inputClassName}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Program *</label>
                <select
                  value={form.program}
                  onChange={(e) => updateField('program', e.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">Select Program</option>
                  {PROGRAM_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Year *</label>
                  <select
                    value={form.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    className={selectClassName}
                    required
                  >
                    <option value="">Select Year</option>
                    {availableYears.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery Mode</label>
                  <select
                    value={form.deliveryMode}
                    onChange={(e) => updateField('deliveryMode', e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select Mode</option>
                    {DELIVERY_MODES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">First Name *</label>
                  <input
                    type="text"
                    value={form.personalInfo.firstName}
                    onChange={(e) => updateNestedField('personalInfo', 'firstName', e.target.value)}
                    className={inputClassName}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Surname *</label>
                  <input
                    type="text"
                    value={form.personalInfo.surName}
                    onChange={(e) => updateNestedField('personalInfo', 'surName', e.target.value)}
                    className={inputClassName}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Gender *</label>
                  <select
                    value={form.personalInfo.gender}
                    onChange={(e) => updateNestedField('personalInfo', 'gender', e.target.value)}
                    className={selectClassName}
                    required
                  >
                    <option value="">Select Gender</option>
                    {GENDERS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Date of Birth *</label>
                  <input
                    type="date"
                    value={form.personalInfo.dateOfBirth}
                    onChange={(e) => updateNestedField('personalInfo', 'dateOfBirth', e.target.value)}
                    className={inputClassName}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">NRC</label>
                  <input
                    type="text"
                    value={form.personalInfo.nrc}
                    onChange={(e) => updateNestedField('personalInfo', 'nrc', e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Passport</label>
                  <input
                    type="text"
                    value={form.personalInfo.passport}
                    onChange={(e) => updateNestedField('personalInfo', 'passport', e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Marital Status</label>
                  <select
                    value={form.personalInfo.maritalStatus}
                    onChange={(e) => updateNestedField('personalInfo', 'maritalStatus', e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select Status</option>
                    {MARITAL_STATUSES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Nationality</label>
                  <input
                    type="text"
                    value={form.personalInfo.nationality}
                    onChange={(e) => updateNestedField('personalInfo', 'nationality', e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Accommodation & Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Room Number *</label>
                <input
                  type="text"
                  value={form.accommodation.roomNumber}
                  onChange={(e) => updateNestedField('accommodation', 'roomNumber', e.target.value)}
                  className={inputClassName}
                  placeholder="e.g., A101"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={form.addressInfo.email}
                  onChange={(e) => updateNestedField('addressInfo', 'email', e.target.value)}
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone Number *</label>
                <input
                  type="tel"
                  value={form.addressInfo.phone}
                  onChange={(e) => updateNestedField('addressInfo', 'phone', e.target.value)}
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Address *</label>
                <input
                  type="text"
                  value={form.addressInfo.address}
                  onChange={(e) => updateNestedField('addressInfo', 'address', e.target.value)}
                  className={inputClassName}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Province</label>
                  <input
                    type="text"
                    value={form.addressInfo.province}
                    onChange={(e) => updateNestedField('addressInfo', 'province', e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Town</label>
                  <input
                    type="text"
                    value={form.addressInfo.town}
                    onChange={(e) => updateNestedField('addressInfo', 'town', e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <h3 className="mb-3 font-semibold text-kmuGreen">Account Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Student ID:</span> {form.studentId}</div>
                  <div><span className="font-medium">Program:</span> {form.program}</div>
                  <div><span className="font-medium">Year:</span> {form.year}</div>
                  <div><span className="font-medium">Delivery Mode:</span> {form.deliveryMode || 'Not specified'}</div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <h3 className="mb-3 font-semibold text-kmuGreen">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Name:</span> {form.personalInfo.firstName} {form.personalInfo.surName}</div>
                  <div><span className="font-medium">Gender:</span> {form.personalInfo.gender}</div>
                  <div><span className="font-medium">DOB:</span> {form.personalInfo.dateOfBirth}</div>
                  <div><span className="font-medium">NRC:</span> {form.personalInfo.nrc || 'Not provided'}</div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <h3 className="mb-3 font-semibold text-kmuGreen">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Email:</span> {form.addressInfo.email}</div>
                  <div><span className="font-medium">Phone:</span> {form.addressInfo.phone}</div>
                  <div><span className="font-medium">Address:</span> {form.addressInfo.address}</div>
                  <div><span className="font-medium">Room:</span> {form.accommodation.roomNumber || 'Not specified'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            {step < STEP_TITLES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="ml-auto flex items-center gap-2 rounded bg-kmuGreen px-4 py-2 text-white hover:bg-kmuOrange"
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="ml-auto rounded bg-kmuGreen px-6 py-2 text-white hover:bg-kmuOrange disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Student'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
