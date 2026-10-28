import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  KeyRound, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Globe,
  Utensils,
  Settings,
  X,
  Send,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { authService, PendingPasscodeRequest } from '../services/auth';
import { Language, UserRole } from '../types';

interface LoginViewProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  lang,
  onLanguageChange,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'password' | 'firebase'>('password');
  
  // Master password state
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Firebase auth state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [firebasePassword, setFirebasePassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showFirebasePassword, setShowFirebasePassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Passcode Settings Modal State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsStep, setSettingsStep] = useState<'form' | 'verify' | 'success'>('form');
  
  // Form step inputs
  const [adminEmail, setAdminEmail] = useState('ahmedaziat208@gmail.com');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showNewPasscode, setShowNewPasscode] = useState(false);
  
  // Verification step inputs
  const [verificationInput, setVerificationInput] = useState('');
  const [activeVerificationCode, setActiveVerificationCode] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Check if there is already an active pending request in authService
  useEffect(() => {
    const pending = authService.getPendingPasscodeRequest();
    if (pending) {
      setAdminEmail(pending.email);
      setActiveVerificationCode(pending.verificationCode);
    }
  }, []);

  const handleMasterLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!password.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى كتابة رمز أو كلمة المرور للمتابعة.' : 'Please enter the passcode.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = authService.loginWithMasterPassword(password, selectedRole, undefined, rememberMe);
      setLoading(false);
      if (res.success) {
        setSuccessMessage(lang === 'ar' ? 'تم تسجيل الدخول بنجاح! جاري فتح النظام...' : 'Login successful! Opening system...');
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      } else {
        setErrorMessage(res.error || 'رمز الدخول غير صحيح.');
      }
    }, 300);
  };


  const handleFirebaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !firebasePassword.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Please enter email and password.');
      return;
    }

    setLoading(true);

    if (isRegisterMode) {
      const res = await authService.registerWithFirebase(email, firebasePassword, displayName);
      setLoading(false);
      if (res.success) {
        setSuccessMessage(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! مرحباً بك.' : 'Account created successfully!');
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      } else {
        setErrorMessage(res.error || 'فشل إنشاء الحساب.');
      }
    } else {
      const res = await authService.loginWithFirebase(email, firebasePassword, rememberMe);
      setLoading(false);
      if (res.success) {
        setSuccessMessage(lang === 'ar' ? 'تم التحقق السحابي بنجاح! مرحباً بك.' : 'Authenticated successfully!');
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول.');
      }
    }
  };

  // --- Passcode Settings Handlers ---

  const handleOpenSettings = () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    const pending = authService.getPendingPasscodeRequest();
    if (pending) {
      setAdminEmail(pending.email);
      setActiveVerificationCode(pending.verificationCode);
      setSettingsStep('verify');
    } else {
      setSettingsStep('form');
    }
    setIsSettingsOpen(true);
  };

  const handleRequestPasscodeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    if (!adminEmail.trim()) {
      setSettingsError('يرجى إدخال البريد الإلكتروني الخاص بك لتأكيد العملية.');
      return;
    }

    if (!newPasscode.trim() || newPasscode.trim().length < 3) {
      setSettingsError('رمز الدخول الجديد يجب ألا يقل عن 3 خانات أو أحرف.');
      return;
    }

    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setSettingsError('رمز الدخول الجديد غير متطابق مع حقل التأكيد.');
      return;
    }

    setSettingsLoading(true);

    try {
      const res = await authService.requestPasscodeChange(adminEmail, newPasscode);
      setSettingsLoading(false);

      if (res.success && res.verificationCode) {
        setActiveVerificationCode(res.verificationCode);
        setVerificationInput('');
        setSettingsStep('verify');
        setSettingsSuccess(res.message || 'تم إرسال كود التأكيد بنجاح!');
      } else {
        setSettingsError(res.error || 'تعذر إرسال كود التأكيد.');
      }
    } catch (err) {
      setSettingsLoading(false);
      setSettingsError('حدث خطأ غير متوقع أثناء معالجة الطلب.');
    }
  };

  const handleVerifyPasscodeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    if (!verificationInput.trim()) {
      setSettingsError('يرجى كتابة كود التأكيد المكون من 6 أرقام.');
      return;
    }

    setSettingsLoading(true);

    try {
      const res = await authService.verifyAndSetPasscode(verificationInput);
      setSettingsLoading(false);

      if (res.success && res.newPasscode) {
        setSettingsStep('success');
        setSettingsSuccess(res.message || 'تم تأكيد وتفعيل رمز الدخول الجديد بنجاح!');
        // Pre-fill the login input with the newly verified passcode
        setPassword(res.newPasscode);
      } else {
        setSettingsError(res.error || 'كود التأكيد غير صحيح.');
      }
    } catch (err) {
      setSettingsLoading(false);
      setSettingsError('حدث خطأ أثناء التحقق من الكود.');
    }
  };

  const handleCopyCode = () => {
    if (activeVerificationCode) {
      navigator.clipboard.writeText(activeVerificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAutoFillCode = () => {
    if (activeVerificationCode) {
      setVerificationInput(activeVerificationCode);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Ambience and Kitchen Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Top Bar with Language Selector and Settings Trigger */}
      <header className="relative z-10 p-4 md:p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-black text-xl">
            <Utensils className="w-5 h-5 text-neutral-950" />
          </div>
          <div>
            <div className="font-black text-lg tracking-wider text-amber-400">OBAYOLI ERP</div>
            <div className="text-[10px] text-neutral-400">نظام إدارة المطاعم والمخازن الذكي</div>
          </div>
        </div>

        {/* Action zone: Passcode Settings & Language */}
        <div className="flex items-center gap-2">
          {/* Quick Access to Passcode Settings */}
          <button
            type="button"
            onClick={handleOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all shadow-sm"
            title="إعدادات وتعيين رمز الدخول الجديد بتأكيد البريد"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span className="hidden sm:inline">إعدادات رمز الدخول</span>
            <span className="sm:hidden">إعداد الرمز</span>
          </button>

          {/* Language switch */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-neutral-400 mx-1" />
            <button
              type="button"
              onClick={() => onLanguageChange('ar')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                lang === 'ar' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('fr')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                lang === 'fr' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                lang === 'en' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {lang === 'ar' ? 'تسجيل الدخول إلى النظام' : 'Sign In to ERP'}
            </h1>
            <p className="text-xs text-neutral-400">
              {lang === 'ar'
                ? 'أدخل رمز أو كلمة المرور للوصول إلى كافة أقسام المطعم'
                : 'Enter your passcode or password to access the modules'}
            </p>
          </div>

          {/* Login Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'password'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'رمز دخول النظام' : 'Passcode / Master'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('firebase');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'firebase'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'حساب سحابي (Firebase)' : 'Cloud Account'}</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab 1: Master Password / Passcode Login Form */}
          {activeTab === 'password' && (
            <form onSubmit={handleMasterLogin} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>{lang === 'ar' ? 'الصفة / الدور الوظيفي:' : 'User Role:'}</span>
                  <span className="text-[11px] text-amber-400/90 font-normal">
                    {selectedRole === 'admin' ? 'صلاحيات كاملة' : 'صلاحيات محددة'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'admin' as UserRole, label: 'المدير العام (Admin)' },
                    { id: 'manager' as UserRole, label: 'مدير الصالة (Manager)' },
                    { id: 'stock_officer' as UserRole, label: 'مسؤول المخزن (Stock)' },
                    { id: 'cashier' as UserRole, label: 'الكاشير (Cashier)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`p-2 rounded-lg border text-right transition-colors ${
                        selectedRole === r.id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password / Passcode Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    {lang === 'ar' ? 'رمز أو كلمة المرور:' : 'Passcode:'}
                  </label>
                  {/* Link to Open Passcode Settings */}
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Settings className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'إضافة أو تغيير رمز الدخول' : 'Passcode Settings'}</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
                    <KeyRound className="w-4 h-4 text-amber-500/70" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب رمز الدخول هنا...' : 'Enter passcode...'}
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pr-9 pl-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors font-mono tracking-wider"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500"
                  />
                  <span>{lang === 'ar' ? 'تذكرني على هذا المتصفح' : 'Remember me'}</span>
                </label>
                <span className="text-[11px] text-neutral-500">مشفرة ومحمية</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{lang === 'ar' ? 'دخول إلى النظام' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>

              {/* Form End */}
            </form>
          )}

          {/* Tab 2: Firebase Email/Password Auth Form */}
          {activeTab === 'firebase' && (
            <form onSubmit={handleFirebaseSubmit} className="space-y-4">
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    {lang === 'ar' ? 'اسم المستخدم أو المدير:' : 'Display Name:'}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: أحمد أزيات' : 'e.g. Chef Ahmed'}
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  {lang === 'ar' ? 'البريد الإلكتروني:' : 'Email Address:'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@restaurant.com"
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pr-9 pl-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  {lang === 'ar' ? 'كلمة المرور السحابية:' : 'Cloud Password:'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showFirebasePassword ? 'text' : 'password'}
                    value={firebasePassword}
                    onChange={(e) => setFirebasePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pr-9 pl-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowFirebasePassword(!showFirebasePassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 hover:text-white"
                  >
                    {showFirebasePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isRegisterMode && (
                  <p className="text-[11px] text-neutral-500">يجب ألا تقل عن 6 خانات.</p>
                )}
              </div>

              {/* Cloud Account Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {isRegisterMode
                        ? lang === 'ar'
                          ? 'إنشاء حساب سحابي وتأكيد الدخول'
                          : 'Create Account & Sign In'
                        : lang === 'ar'
                        ? 'تسجيل الدخول السحابي (Firebase)'
                        : 'Sign In with Firebase'}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>

              {/* Switch Login / Register */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-amber-400 hover:underline"
                >
                  {isRegisterMode
                    ? lang === 'ar'
                      ? 'لديك حساب بالفعل؟ اضغط لتسجيل الدخول'
                      : 'Already have an account? Sign in'
                    : lang === 'ar'
                    ? 'ليس لديك حساب سحابي بعد؟ اضغط لإنشاء حساب جديد'
                    : "Don't have an account? Register now"}
                </button>
              </div>
            </form>
          )}

          {/* Security badge at bottom */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/60">
            <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
            <span>نظام محمي وآمن | متوافق مع Firebase Cloud و Cloudflare</span>
          </div>
        </div>
      </main>

      {/* --- Passcode Settings & Email Confirmation Modal --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>إعدادات رمز الدخول الجديد</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      تأكيد بالبريد
                    </span>
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    تعيين رمز دخول جديد للمشروع مع التحقق عبر البريد الإلكتروني
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center hover:bg-neutral-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              
              {/* Settings Errors / Alerts */}
              {settingsError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{settingsError}</span>
                </div>
              )}

              {settingsSuccess && settingsStep !== 'success' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              {/* Step 1: Passcode Form */}
              {settingsStep === 'form' && (
                <form onSubmit={handleRequestPasscodeCode} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-neutral-300 text-xs leading-relaxed space-y-1">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>حماية وأمان صلاحيات النظام</span>
                    </div>
                    <p className="text-neutral-400 text-[11px]">
                      لتغيير أو إضافة رمز دخول رئيسي جديد للنظام، يرجى كتابة الرمز المطلوب وبريدك الإلكتروني. سنرسل كود تحقق سري إلى بريدك لتأكيد الملكية وحفظ الرمز الجديد سحابياً.
                    </p>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>البريد الإلكتروني لتأكيد رمز الدخول:</span>
                      </span>
                      <span className="text-[10px] text-neutral-500">حساب الإدارة</span>
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@restaurant.com"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      required
                    />
                    <p className="text-[10px] text-neutral-400">
                      سيتم إرسال كود التأكيد السري المكون من 6 أرقام إلى هذا البريد.
                    </p>
                  </div>

                  {/* New Passcode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>رمز الدخول الجديد المراد إضافته:</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPasscode ? 'text' : 'password'}
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="مثال: 8899 أو obayoli2025 أو كلمة سر خاصة"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pr-3 pl-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono tracking-wider"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPasscode(!showNewPasscode)}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 hover:text-white"
                      >
                        {showNewPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Passcode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>تأكيد رمز الدخول الجديد:</span>
                    </label>
                    <input
                      type={showNewPasscode ? 'text' : 'password'}
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="أعد كتابة الرمز الجديد للتطابق"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono tracking-wider"
                      required
                    />
                    {confirmPasscode && newPasscode && confirmPasscode !== newPasscode && (
                      <p className="text-[11px] text-rose-400">الرمزان غير متطابقين بعد.</p>
                    )}
                    {confirmPasscode && newPasscode && confirmPasscode === newPasscode && (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>الرمزان متطابقان بنجاح.</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={settingsLoading || !newPasscode || newPasscode !== confirmPasscode}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {settingsLoading ? (
                        <span className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>إرسال كود التأكيد إلى البريد الإلكتروني</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verification Code Input */}
              {settingsStep === 'verify' && (
                <form onSubmit={handleVerifyPasscodeCode} className="space-y-5">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">البريد المرسل إليه:</span>
                      <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {adminEmail}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-300 leading-relaxed">
                      تم إنشاء وإرسال كود الأمان المكون من 6 أرقام لتأكيد رمز الدخول الجديد. يرجى إدخال الكود بالأسفل لإتمام الحفظ وتحديث كلمة المرور في قاعدة البيانات.
                    </div>

                    {/* Quick Code Helper Card */}
                    {activeVerificationCode && (
                      <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] text-neutral-400">كود التحقق المولد (للمعاينة الفورية):</div>
                          <div className="font-mono text-base font-black tracking-widest text-amber-300">
                            {activeVerificationCode}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[11px] text-neutral-200 border border-neutral-700 flex items-center gap-1"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'تم النسخ' : 'نسخ'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAutoFillCode}
                            className="px-2.5 py-1 rounded bg-amber-500 text-neutral-950 text-[11px] font-bold hover:bg-amber-400 transition-colors"
                          >
                            تعبئة الكود
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6-Digit Code Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                      <span>أدخل كود التأكيد (6 أرقام):</span>
                      <span className="text-[10px] text-neutral-500">صالح لمدة 15 دقيقة</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationInput}
                      onChange={(e) => setVerificationInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-amber-400 placeholder-neutral-700 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      autoFocus
                    />
                  </div>

                  {/* Verify Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={settingsLoading || verificationInput.length < 6}
                      className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {settingsLoading ? (
                        <span className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تأكيد وتفعيل رمز الدخول الجديد</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setSettingsStep('form')}
                        className="text-xs text-neutral-400 hover:text-white"
                      >
                        العودة لتعديل الرمز والبريد
                      </button>

                      <button
                        type="button"
                        onClick={handleRequestPasscodeCode}
                        disabled={settingsLoading}
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>إعادة توليد كود جديد</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 3: Success State */}
              {settingsStep === 'success' && (
                <div className="py-6 text-center space-y-4 animate-scale-up">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-white">
                      تم تأكيد وتفعيل رمز الدخول بنجاح!
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                      تم حفظ رمز الدخول الجديد ومزامنته سحابياً مع قاعدة البيانات. يمكنك الآن تسجيل الدخول مباشرة بهذا الرمز في أي وقت.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 inline-block text-center min-w-[200px]">
                    <div className="text-[10px] text-neutral-500">رمز الدخول الجديد النشط:</div>
                    <div className="font-mono text-base font-bold text-amber-400">
                      {newPasscode}
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleMasterLogin();
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <span>تسجيل الدخول فوراً بالرمز الجديد</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-neutral-600">
        © {new Date().getFullYear()} مطعم ومطبخ OBAYOLI - جميع الحقوق محفوظة
      </footer>
    </div>
  );
};
