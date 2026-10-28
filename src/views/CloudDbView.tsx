import React, { useState, useEffect } from 'react';
import { Language, CloudflareConfig } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  CLOUDFLARE_WORKER_TS,
  CLOUDFLARE_WRANGLER_TOML,
  CLOUDFLARE_D1_SQL_SCHEMA,
  GITHUB_DEPLOYMENT_GUIDE_MD,
} from '../services/cloudflareWorkerTemplate';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Github,
  Server,
  FileCode,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Lock,
  LogOut,
} from 'lucide-react';
import { authService } from '../services/auth';

interface CloudDbViewProps {
  lang: Language;
}

export const CloudDbView: React.FC<CloudDbViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [, forceUpdate] = useState(0);
  useEffect(() => dbService.subscribe(() => forceUpdate((c) => c + 1)), []);
  const db = dbService.getSnapshot();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [workerUrl, setWorkerUrl] = useState(db.cloudflareConfig.workerUrl || '');
  const [apiToken, setApiToken] = useState(db.cloudflareConfig.apiToken || '');
  const [activeTab, setActiveTab] = useState<'worker' | 'sql' | 'wrangler' | 'guide'>('guide');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Master password management state
  const [newMasterPass, setNewMasterPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleExportJson = () => {
    const dataStr = dbService.exportDatabaseJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obayoli_restaurant_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveConfig = () => {
    dbService.saveCloudflareConfig({
      workerUrl,
      apiToken,
    });
    showToast('تم حفظ إعدادات خادم Cloudflare بنجاح!');
  };

  const handleTestSync = async () => {
    handleSaveConfig();
    setIsSyncing(true);
    setSyncFeedback(null);

    const result = await dbService.syncWithCloudflare();
    setIsSyncing(false);
    setSyncFeedback({ success: result.success, msg: result.message });
  };

  const handleResetDemo = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'إعادة تعيين البيانات النموذجية',
      description: 'هل أنت متأكد من إعادة تعيين قاعدة البيانات إلى البيانات النموذجية الأولية؟',
      onConfirm: () => {
        dbService.resetToDemoData();
        window.location.reload();
      },
    });
  };

  const handleClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد الحذف الشامل والبدء من الصفر',
      description: 'هل أنت متأكد من حذف وتصفير جميع المعلومات والبدء من الصفر؟ سيتم مسح كافة المواد، الفواتير، الحركات، والوصفات نهائياً.',
      onConfirm: () => {
        dbService.clearAllData();
        showToast('تم تفريغ وحذف جميع البيانات بنجاح! النظام الآن نظيف وجاهز لإدخال المواد من الصفر.');
        setConfirmDialog(null);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      },
    });
  };

  const handleChangeMasterPassword = async () => {
    if (!newMasterPass.trim() || newMasterPass.trim().length < 3) {
      showToast('⚠️ يجب ألا تقل كلمة المرور عن 3 أحرف أو أرقام.');
      return;
    }
    const ok = await authService.setMasterPassword(newMasterPass.trim());
    if (ok) {
      showToast('🔑 تم تحديث كلمة مرور النظام بنجاح!');
      setNewMasterPass('');
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Cloud Firestore Database Section */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-amber-500/30 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">قاعدة البيانات السحابية الحقيقية (Google Cloud Firestore)</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  متصلة ونشطة حياً (Live Connected)
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                بيانات النظام لم تعد محصورة في المتصفح فقط؛ يتم حفظها ومزامنتها لحظياً في قاعدة بيانات سحابية حقيقية دائمة عبر السحابة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setIsSyncing(true);
                const res = await dbService.syncToFirestore();
                setIsSyncing(false);
                showToast(res.message);
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>مزامنة سحابية الآن (Push)</span>
            </button>

            <button
              onClick={async () => {
                setIsSyncing(true);
                const res = await dbService.loadFromFirestore();
                setIsSyncing(false);
                showToast(res.message);
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>سحب واسترجاع من السحابة (Pull)</span>
            </button>

            <button
              onClick={async () => {
                const ok = await dbService.checkFirestoreConnection();
                if (ok) {
                  showToast('🟢 الاتصال بقاعدة بيانات Firestore السحابية ممتاز ونشط 100%!');
                } else {
                  showToast('⚠️ يرجى التأكد من اتصال الإنترنت.');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/80 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>فحص الاتصال</span>
            </button>
          </div>
        </div>

        {/* Cloud DB Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
          <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block">المشروع السحابي (Project ID):</span>
            <span className="font-mono text-amber-400 font-semibold">decisive-glyph-7zbz0</span>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block">معرف قاعدة البيانات (Firestore Database ID):</span>
            <span className="font-mono text-emerald-400 truncate block font-semibold" title="ai-studio-obayoli-b6ddc7d1-1f93-46a7-8ff8-edd476cebbad">
              ai-studio-obayoli-...
            </span>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block">نوع التخزين والمزامنة:</span>
            <span className="text-neutral-200 font-medium">سحابي حقيقي + مزامنة لحظية فورية (Real-time)</span>
          </div>
        </div>
      </div>


      {/* Database Status & Health Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400">المواد والأصناف</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {db.materials.length}
          </div>
          <div className="text-[10px] text-neutral-500">مادة مخزنية</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400">حركات المخزون المسجلة</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {db.movements.length}
          </div>
          <div className="text-[10px] text-neutral-500">حركة دخول وخروج</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400">البطاقات التقنية للأطباق</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {db.recipes.length}
          </div>
          <div className="text-[10px] text-neutral-500">وصفات Fiche Technique</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400">فواتير التوريد والموردين</div>
          <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
            {db.invoices.length} فواتير · {db.suppliers.length} موردين
          </div>
          <div className="text-[10px] text-neutral-500">سجلات توريد معتمدة</div>
        </div>
      </div>

      {/* System Security & Password Management */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">حماية النظام وتسجيل الدخول بكلمة المرور</h3>
              <p className="text-xs text-neutral-400">
                إدارة الوصول إلى النظام، كلمة مرور المدير، والتحكم في الجلسات الحالية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => authService.logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>قفل النظام وتسجيل الخروج</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Master Password Info */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-semibold">كلمة مرور النظام النشطة:</span>
              <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {authService.getMasterPassword()}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              تُستخدم هذه الكلمة لتسجيل الدخول السريع لكافة مدراء وموظفي المطعم على شاشة الدخول.
            </p>

            <button
              onClick={() => setIsChangingPass(!isChangingPass)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>{isChangingPass ? 'إلغاء التغيير' : 'تغيير كلمة المرور'}</span>
            </button>

            {isChangingPass && (
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newMasterPass}
                  onChange={(e) => setNewMasterPass(e.target.value)}
                  placeholder="اكتب كلمة المرور الجديدة..."
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleChangeMasterPassword}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  حفظ الكلمة الجديدة
                </button>
              </div>
            )}
          </div>

          {/* Cloud Auth Info */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
            <span className="text-xs text-neutral-400 font-semibold block">المصادقة السحابية (Firebase Cloud Auth):</span>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>مفعلة وتدعم الدخول بالبريد الإلكتروني وكلمة المرور وحسابات الفريق</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              يمكن لأي موظف أو مشرف إنشاء حساب سحابي رسمي أو تسجيل الدخول ببريده الإلكتروني عبر واجهة الدخول.
            </p>
          </div>
        </div>
      </div>

      {/* Local DB Actions: Export, Restore, Reset */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-xs text-white">إدارة النسخ الاحتياطي والبدء من الصفر</h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{t.backupDb}</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg transition-colors"
          >
            <span>حذف جميع المعلومات والبدء من الصفر</span>
          </button>

          <button
            onClick={handleResetDemo}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition-colors text-[11px]"
            title="استرجاع البيانات التجريبية إذا رغبت في معاينة أمثلة"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            <span>استرجاع بيانات تجريبية (Demo)</span>
          </button>
        </div>
      </div>

      {/* Cloudflare Worker & D1 Setup */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-white">{t.cloudflareWorkersSection}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Serverless Edge API</span>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t.workerUrlLabel}:
            </label>
            <input
              type="url"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
              placeholder="https://obayoli-restaurant-api.your-subdomain.workers.dev"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-neutral-500 mt-1 block">
              رابط الـ Worker بعد نشره باستخدام Wrangler
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t.workerTokenLabel} (اختياري للحماية):
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Bearer secret_token_xyz..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-neutral-700 transition-colors"
            >
              حفظ الإعدادات
            </button>
            <button
              onClick={handleTestSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{t.testSync}</span>
            </button>
          </div>

          {syncFeedback && (
            <div
              className={`text-xs px-3 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                syncFeedback.success
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {syncFeedback.success ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{syncFeedback.msg}</span>
            </div>
          )}
        </div>

        {/* Code Snippets & Deployment Guide */}
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>دليل GitHub و Cloudflare</span>
            </button>

            <button
              onClick={() => setActiveTab('worker')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'worker'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>كود الـ Worker (TS)</span>
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'sql'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>مخطط SQL / D1 DDL</span>
            </button>

            <button
              onClick={() => setActiveTab('wrangler')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'wrangler'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>wrangler.toml</span>
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="relative">
            {activeTab === 'guide' && (
              <div className="bg-neutral-950 rounded-xl p-5 border border-neutral-800 text-xs text-neutral-300 leading-relaxed space-y-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-bold text-white text-sm">
                    طريقة رفع المشروع على GitHub ونشره مع Cloudflare Workers
                  </span>
                  <button
                    onClick={() => handleCopy('guide', GITHUB_DEPLOYMENT_GUIDE_MD)}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    {copiedKey === 'guide' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'guide' ? 'تم النسخ!' : 'نسخ الدليل'}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-neutral-300">
                  {GITHUB_DEPLOYMENT_GUIDE_MD}
                </pre>
              </div>
            )}

            {activeTab === 'worker' && (
              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 relative">
                <button
                  onClick={() => handleCopy('worker', CLOUDFLARE_WORKER_TS)}
                  className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1 bg-neutral-800 text-xs text-amber-400 hover:bg-neutral-700 rounded font-semibold border border-neutral-700"
                >
                  {copiedKey === 'worker' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'worker' ? 'تم النسخ' : t.copyWorkerCode}</span>
                </button>
                <pre className="overflow-x-auto text-[11px] font-mono text-emerald-400 p-2 max-h-96 leading-relaxed">
                  {CLOUDFLARE_WORKER_TS}
                </pre>
              </div>
            )}

            {activeTab === 'sql' && (
              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 relative">
                <button
                  onClick={() => handleCopy('sql', CLOUDFLARE_D1_SQL_SCHEMA)}
                  className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1 bg-neutral-800 text-xs text-amber-400 hover:bg-neutral-700 rounded font-semibold border border-neutral-700"
                >
                  {copiedKey === 'sql' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'sql' ? 'تم النسخ' : t.copySqlSchema}</span>
                </button>
                <pre className="overflow-x-auto text-[11px] font-mono text-blue-300 p-2 max-h-96 leading-relaxed">
                  {CLOUDFLARE_D1_SQL_SCHEMA}
                </pre>
              </div>
            )}

            {activeTab === 'wrangler' && (
              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 relative">
                <button
                  onClick={() => handleCopy('wrangler', CLOUDFLARE_WRANGLER_TOML)}
                  className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1 bg-neutral-800 text-xs text-amber-400 hover:bg-neutral-700 rounded font-semibold border border-neutral-700"
                >
                  {copiedKey === 'wrangler' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'wrangler' ? 'تم النسخ' : 'نسخ wrangler.toml'}</span>
                </button>
                <pre className="overflow-x-auto text-[11px] font-mono text-amber-300 p-2 max-h-96 leading-relaxed">
                  {CLOUDFLARE_WRANGLER_TOML}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1.5">{confirmDialog.title}</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">{confirmDialog.description}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/30"
              >
                تأكيد التنفيذ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-950 border border-emerald-600/50 text-emerald-200 text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
