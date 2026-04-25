"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAvailableYearsForProgram, PROGRAM_OPTIONS } from '../../config/constants';
import { registerStudent } from '../../utils/api';

type SignupFormState = {
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

const INITIAL_FORM: SignupFormState = {
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
export default function StudentSignupPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<SignupFormState>(INITIAL_FORM);

  useEffect(() => {
    if (user) {
      router.push('/student-dashboard');
    }
  }, [router, user]);

  const fullName = useMemo(
    () => [form.personalInfo.firstName, form.personalInfo.surName].filter(Boolean).join(' ').trim(),
    [form.personalInfo.firstName, form.personalInfo.surName]
  );

  const availableYears = useMemo(
    () => getAvailableYearsForProgram(form.program),
    [form.program]
  );

  useEffect(() => {
    if (form.year && !availableYears.includes(form.year)) {
      setForm(prev => ({ ...prev, year: '' }));
    }
  }, [availableYears, form.year]);

  const inputClassName = `w-full rounded-lg border px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-kmuGreen focus:border-transparent ${
    theme === 'dark'
      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
  }`;

  const cardClassName = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-3xl shadow-xl border ${
    theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
  }`;

  const updateField = (field: keyof SignupFormState, value: string) => {
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
    setSuccess('');

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

      setSuccess('Your student account has been created. You can now sign in.');
      setForm(INITIAL_FORM);
      setStep(0);
      window.setTimeout(() => {
        router.push('/login?registered=1');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen px-4 py-8 md:px-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)]'}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-kmuOrange">Student Signup</p>
            <h1 className="mt-2 text-3xl font-bold text-kmuGreen md:text-4xl">Create your Kapasa Makasa University account</h1>
            <p className={`mt-2 max-w-2xl text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Complete your details so your student account and profile are ready in one go.
            </p>
          </div>
          <Link
            href="/login"
            className={`hidden rounded-full px-4 py-2 text-sm font-medium md:inline-flex ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700 shadow-sm'}`}
          >
            Back to Login
          </Link>
        </div>

        <form onSubmit={handleSubmit} className={`${cardClassName} overflow-hidden`}>
          <div className="p-6 md:p-8">
              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Student ID</label>
                      <input className={inputClassName} value={form.studentId} onChange={(e) => updateField('studentId', e.target.value)} placeholder="e.g. 2024-ICT-001" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Program</label>
                      <select className={inputClassName} value={form.program} onChange={(e) => updateField('program', e.target.value)}>
                        <option value="">Select program</option>
                        {PROGRAM_OPTIONS.map((program) => <option key={program} value={program}>{program}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Password</label>
                      <input type="password" className={inputClassName} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Minimum 6 characters" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Confirm Password</label>
                      <input type="password" className={inputClassName} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} placeholder="Repeat password" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Year</label>
                      <select className={inputClassName} value={form.year} onChange={(e) => updateField('year', e.target.value)}>
                        <option value="">Select year</option>
                        {availableYears.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Delivery Mode</label>
                      <select className={inputClassName} value={form.deliveryMode} onChange={(e) => updateField('deliveryMode', e.target.value)}>
                        <option value="">Select delivery mode</option>
                        {DELIVERY_MODES.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">First Name</label>
                      <input className={inputClassName} value={form.personalInfo.firstName} onChange={(e) => updateNestedField('personalInfo', 'firstName', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Surname</label>
                      <input className={inputClassName} value={form.personalInfo.surName} onChange={(e) => updateNestedField('personalInfo', 'surName', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Gender</label>
                      <select className={inputClassName} value={form.personalInfo.gender} onChange={(e) => updateNestedField('personalInfo', 'gender', e.target.value)}>
                        <option value="">Select gender</option>
                        {GENDERS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Date of Birth</label>
                      <input type="date" className={inputClassName} value={form.personalInfo.dateOfBirth} onChange={(e) => updateNestedField('personalInfo', 'dateOfBirth', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Marital Status</label>
                      <select className={inputClassName} value={form.personalInfo.maritalStatus} onChange={(e) => updateNestedField('personalInfo', 'maritalStatus', e.target.value)}>
                        <option value="">Select marital status</option>
                        {MARITAL_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Nationality</label>
                      <input className={inputClassName} value={form.personalInfo.nationality} onChange={(e) => updateNestedField('personalInfo', 'nationality', e.target.value)} placeholder="e.g. Zambian" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">NRC</label>
                      <input className={inputClassName} value={form.personalInfo.nrc} onChange={(e) => updateNestedField('personalInfo', 'nrc', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Passport</label>
                      <input className={inputClassName} value={form.personalInfo.passport} onChange={(e) => updateNestedField('personalInfo', 'passport', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Room Number</label>
                      <input className={inputClassName} value={form.accommodation.roomNumber} onChange={(e) => updateNestedField('accommodation', 'roomNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Province</label>
                      <input className={inputClassName} value={form.addressInfo.province} onChange={(e) => updateNestedField('addressInfo', 'province', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Town</label>
                      <input className={inputClassName} value={form.addressInfo.town} onChange={(e) => updateNestedField('addressInfo', 'town', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Phone</label>
                      <input className={inputClassName} value={form.addressInfo.phone} onChange={(e) => updateNestedField('addressInfo', 'phone', e.target.value)} placeholder="+260..." />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email</label>
                    <input type="email" className={inputClassName} value={form.addressInfo.email} onChange={(e) => updateNestedField('addressInfo', 'email', e.target.value)} placeholder="student@example.com" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Address</label>
                    <textarea className={`${inputClassName} min-h-[120px]`} value={form.addressInfo.address} onChange={(e) => updateNestedField('addressInfo', 'address', e.target.value)} placeholder="Street, area, landmark, or residence details" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className={`rounded-2xl border p-5 ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h2 className="text-lg font-semibold text-kmuGreen">Review your details</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-kmuOrange">Account</p>
                        <p className="mt-2 text-sm">Student ID: {form.studentId || 'Not set'}</p>
                        <p className="text-sm">Program: {form.program || 'Not set'}</p>
                        <p className="text-sm">Year: {form.year || 'Not set'}</p>
                        <p className="text-sm">Status: Active by default</p>
                        <p className="text-sm">Delivery Mode: {form.deliveryMode || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-kmuOrange">Personal</p>
                        <p className="mt-2 text-sm">Full Name: {fullName || 'Not set'}</p>
                        <p className="text-sm">Gender: {form.personalInfo.gender || 'Not set'}</p>
                        <p className="text-sm">Date of Birth: {form.personalInfo.dateOfBirth || 'Not set'}</p>
                        <p className="text-sm">Nationality: {form.personalInfo.nationality || 'Not set'}</p>
                        <p className="text-sm">NRC: {form.personalInfo.nrc || 'Not set'}</p>
                        <p className="text-sm">Passport: {form.personalInfo.passport || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-kmuOrange">Contact</p>
                        <p className="mt-2 text-sm">Email: {form.addressInfo.email || 'Not set'}</p>
                        <p className="text-sm">Phone: {form.addressInfo.phone || 'Not set'}</p>
                        <p className="text-sm">Province: {form.addressInfo.province || 'Not set'}</p>
                        <p className="text-sm">Town: {form.addressInfo.town || 'Not set'}</p>
                        <p className="text-sm">Address: {form.addressInfo.address || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-kmuOrange">Accommodation</p>
                        <p className="mt-2 text-sm">Room Number: {form.accommodation.roomNumber || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 0 || loading}
                  className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  {step < STEP_TITLES.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-full bg-kmuGreen px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-kmuGreen/90"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-full bg-kmuOrange px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-kmuOrange/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Creating account...' : 'Create Student Account'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 text-center text-sm">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Already have an account? </span>
                <Link href="/login" className="font-semibold text-kmuGreen underline">
                  Sign in
                </Link>
              </div>
            </div>
        </form>
      </div>
    </div>
  );
}
