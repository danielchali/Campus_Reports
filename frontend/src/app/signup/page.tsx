"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAvailableYearsForProgram, PROGRAM_OPTIONS } from '../../config/constants';
import { register, registerStudent } from '../../utils/api';

type AccountType = 'student' | 'general_user' | null;

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
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [generalUserForm, setGeneralUserForm] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

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

  const inputClassName = `w-full rounded-xl border px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-kmuGreen/20 focus:border-kmuGreen transition-all ${
    theme === 'dark'
      ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500'
      : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  }`;

  const cardClassName = `${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl md:rounded-[32px] shadow-xl border ${
    theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountType === 'general_user') {
      if (!generalUserForm.fullName.trim()) return setError('Full name is required.');
      if (!generalUserForm.username.trim()) return setError('Username is required.');
      if (!generalUserForm.password) return setError('Password is required.');
      if (generalUserForm.password.length < 6) return setError('Password must be at least 6 characters.');
      if (generalUserForm.password !== generalUserForm.confirmPassword) return setError('Passwords do not match.');

      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await register(
          generalUserForm.username.trim(),
          generalUserForm.password,
          generalUserForm.fullName.trim(),
          'general_user'
        );
        setSuccess('Your general user account has been created. You can now sign in.');
        setGeneralUserForm({ fullName: '', username: '', password: '', confirmPassword: '' });
        window.setTimeout(() => {
          router.push('/login?registered=1');
        }, 1200);
      } catch (err: any) {
        setError(err?.message || 'Signup failed. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!accountType) {
      setError('Please select how you want to register.');
      return;
    }

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
    <div className={`min-h-screen px-4 py-6 md:py-12 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-center md:text-left">
            <Link href="/login" className="inline-flex items-center gap-2 text-kmuGreen font-semibold mb-4 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
            <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-kmuOrange mb-2">
              {accountType === 'general_user' ? 'General User Registration' : 'Student Registration'}
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#002d62] dark:text-white tracking-tight">Create your account</h1>
            <p className={`mt-4 max-w-2xl text-sm md:text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Join the Campus Reports community. Fill in your details to get started.
            </p>
          </div>
        </div>

        {/* Progress Stepper */}
        {accountType === 'student' && (
          <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center justify-between min-w-[600px] px-2">
              {STEP_TITLES.map((title, i) => (
                <div key={title} className="flex flex-col items-center gap-2 relative flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                    step >= i ? 'bg-kmuGreen text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {step > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                    step >= i ? 'text-kmuGreen' : 'text-slate-400'
                  }`}>
                    {title}
                  </span>
                  {i < STEP_TITLES.length - 1 && (
                    <div className={`absolute top-4 left-[60%] w-[80%] h-0.5 ${
                      step > i ? 'bg-kmuGreen' : 'bg-slate-200 dark:bg-slate-800'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`${cardClassName} overflow-hidden shadow-2xl shadow-slate-200 dark:shadow-none`}>
          <div className="p-6 md:p-10">
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                {success}
              </div>
            )}

            {!accountType && (
              <div className="space-y-6">
                <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Choose how you want to register.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <button type="button" onClick={() => { setAccountType('student'); setError(''); }} className="text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-kmuGreen transition-all">
                    <h3 className="font-bold text-lg mb-2">Student</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Register with your student details and academic information.</p>
                  </button>
                  <button type="button" onClick={() => { setAccountType('general_user'); setError(''); }} className="text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-kmuGreen transition-all">
                    <h3 className="font-bold text-lg mb-2">General User (e.g. Lecturer)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">For malpractice reports, disciplinary reports, and maintenance requests.</p>
                  </button>
                </div>
              </div>
            )}

            {accountType === 'student' && step === 0 && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Student ID</label>
                    <input className={inputClassName} value={form.studentId} onChange={(e) => updateField('studentId', e.target.value)} placeholder="e.g. 2024-ICT-001" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Program</label>
                    <select className={inputClassName} value={form.program} onChange={(e) => updateField('program', e.target.value)}>
                      <option value="">Select program</option>
                      {PROGRAM_OPTIONS.map((program) => <option key={program} value={program}>{program}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                    <input type="password" className={inputClassName} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Minimum 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
                    <input type="password" className={inputClassName} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} placeholder="Repeat password" />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Year</label>
                    <select className={inputClassName} value={form.year} onChange={(e) => updateField('year', e.target.value)}>
                      <option value="">Select year</option>
                      {availableYears.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Delivery Mode</label>
                    <select className={inputClassName} value={form.deliveryMode} onChange={(e) => updateField('deliveryMode', e.target.value)}>
                      <option value="">Select mode</option>
                      {DELIVERY_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {accountType === 'student' && step === 1 && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">First Name</label>
                    <input className={inputClassName} value={form.personalInfo.firstName} onChange={(e) => updateNestedField('personalInfo', 'firstName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Surname</label>
                    <input className={inputClassName} value={form.personalInfo.surName} onChange={(e) => updateNestedField('personalInfo', 'surName', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NRC Number</label>
                    <input className={inputClassName} value={form.personalInfo.nrc} onChange={(e) => updateNestedField('personalInfo', 'nrc', e.target.value)} placeholder="e.g. 123456/78/9" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Passport (Optional)</label>
                    <input className={inputClassName} value={form.personalInfo.passport} onChange={(e) => updateNestedField('personalInfo', 'passport', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Gender</label>
                    <select className={inputClassName} value={form.personalInfo.gender} onChange={(e) => updateNestedField('personalInfo', 'gender', e.target.value)}>
                      <option value="">Select</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Date of Birth</label>
                    <input type="date" className={inputClassName} value={form.personalInfo.dateOfBirth} onChange={(e) => updateNestedField('personalInfo', 'dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Marital Status</label>
                    <select className={inputClassName} value={form.personalInfo.maritalStatus} onChange={(e) => updateNestedField('personalInfo', 'maritalStatus', e.target.value)}>
                      <option value="">Select</option>
                      {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {accountType === 'student' && step === 2 && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input type="email" className={inputClassName} value={form.addressInfo.email} onChange={(e) => updateNestedField('addressInfo', 'email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input className={inputClassName} value={form.addressInfo.phone} onChange={(e) => updateNestedField('addressInfo', 'phone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Residential Address</label>
                  <textarea rows={3} className={inputClassName} value={form.addressInfo.address} onChange={(e) => updateNestedField('addressInfo', 'address', e.target.value)} />
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Province</label>
                    <input className={inputClassName} value={form.addressInfo.province} onChange={(e) => updateNestedField('addressInfo', 'province', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Town</label>
                    <input className={inputClassName} value={form.addressInfo.town} onChange={(e) => updateNestedField('addressInfo', 'town', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Room No. (Optional)</label>
                    <input className={inputClassName} value={form.accommodation.roomNumber} onChange={(e) => updateNestedField('accommodation', 'roomNumber', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {accountType === 'student' && step === 3 && (
              <div className="space-y-8">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-6 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-[#002d62] dark:text-white mb-4">Summary</h3>
                  <div className="grid gap-6 md:grid-cols-2 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Full Name</p>
                      <p className="font-bold">{fullName || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Student ID</p>
                      <p className="font-bold">{form.studentId}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Program</p>
                      <p className="font-bold">{form.program} (Year {form.year})</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Email</p>
                      <p className="font-bold">{form.addressInfo.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-kmuGreen/5 border border-kmuGreen/20">
                  <CheckCircle2 className="w-6 h-6 text-kmuGreen" />
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                    By submitting, you agree to our terms and conditions for student reporting and data handling.
                  </p>
                </div>
              </div>
            )}

            {accountType === 'general_user' && (
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                    <input className={inputClassName} value={generalUserForm.fullName} onChange={(e) => setGeneralUserForm(prev => ({ ...prev, fullName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Username</label>
                    <input className={inputClassName} value={generalUserForm.username} onChange={(e) => setGeneralUserForm(prev => ({ ...prev, username: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                    <input type="password" className={inputClassName} value={generalUserForm.password} onChange={(e) => setGeneralUserForm(prev => ({ ...prev, password: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
                    <input type="password" className={inputClassName} value={generalUserForm.confirmPassword} onChange={(e) => setGeneralUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col md:flex-row gap-4">
              {(accountType === 'student' && step > 0) && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 md:py-4 border-2 border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Previous
                </button>
              )}
              {(accountType === 'student' && step < STEP_TITLES.length - 1) ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-[2] flex items-center justify-center gap-2 py-3.5 md:py-4 bg-kmuGreen text-white rounded-xl md:rounded-2xl font-bold shadow-lg shadow-kmuGreen/20 hover:bg-kmuGreen-dark transition-all"
                >
                  Next Step
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center gap-2 py-3.5 md:py-4 bg-kmuGreen text-white rounded-xl md:rounded-2xl font-bold shadow-lg shadow-kmuGreen/20 hover:bg-kmuGreen-dark transition-all disabled:opacity-70"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Complete Registration <CheckCircle2 className="w-5 h-5" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
