import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { 
  Globe, 
  Printer, 
  Cloud, 
  Download, 
  Upload, 
  RotateCcw,
  Menu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  LogOut,
  Shield,
  Barcode as BarcodeIcon
} from 'lucide-react';
import { dbService } from '../services/db';
import { authService } from '../services/auth';
import { AuthUser } from '../types';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  activeViewTitle: string;
  onToggleSidebar: () => void;
  onOpenBarcodeModal?: () => void;
  onPrintClick?: () => void;
  onExportClick?: () => void;
  onLogout?: () => void;
  currentUser?: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  activeViewTitle,
  onToggleSidebar,
  onOpenBarcodeModal,
  onPrintClick,
  onExportClick,
  onLogout,
  currentUser,
}) => {
  const t = translations[lang];
  const cloudConfig = dbService.getCloudflareConfig();
  const [syncing, setSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  const handleQuickSync = async () => {
    setSyncing(true);
    const res = await dbService.syncToFirestore();
    setSyncing(false);
    setSyncMessage(res.message);
    setTimeout(() => setSyncMessage(null), 3500);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = dbService.importDatabaseJson(content);
        if (ok) {
          setSyncMessage(lang === 'ar' ? 'تم استرجاع قاعدة البيانات بنجاح!' : 'Database restored successfully!');
          setTimeout(() => window.location.reload(), 600);
        } else {
          setSyncMessage(lang === 'ar' ? 'الملف غير صالح أو تالف!' : 'Invalid database file!');
          setTimeout(() => setSyncMessage(null), 3500);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="no-print h-16 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Sidebar Toggle & Brand / Breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-amber-500 tracking-tight whitespace-nowrap">
            {t.brandName}
          </span>
          <span className="text-neutral-500 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold text-neutral-200 truncate max-w-[200px] sm:max-w-none">
            {activeViewTitle}
          </h1>
        </div>
      </div>

      {/* Zone 2: Status Notice (Quiet inline banner if syncing) */}
      <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400">
        {syncMessage ? (
          <span className="text-amber-400 font-medium animate-pulse">{syncMessage}</span>
        ) : cloudConfig.workerUrl ? (
          <div className="flex items-center gap-1.5 text-emerald-400/90">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Cloudflare D1: متصل</span>
          </div>
        ) : null}
      </div>

      {/* Zone 3: Actions (Barcode Scanner, Print, Export, Quick Sync, Language switcher) */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenBarcodeModal && (
          <button
            onClick={onOpenBarcodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-lg transition-colors shadow-sm group"
            title="مسح الباركود (كاميرا / قارئ خارجي)"
          >
            <BarcodeIcon className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">مسح الباركود</span>
          </button>
        )}

        {onPrintClick && (
          <button
            onClick={onPrintClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white rounded-lg border border-neutral-700/60 transition-colors"
            title={t.print}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.print}</span>
          </button>
        )}

        {onExportClick && (
          <button
            onClick={onExportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white rounded-lg border border-neutral-700/60 transition-colors"
            title={t.exportJson}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نسخة احتياطية</span>
          </button>
        )}

        <label className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white rounded-lg border border-neutral-700/60 transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <input
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
        </label>

        <button
          onClick={handleQuickSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
          title="مزامنة فورية مع قاعدة بيانات Firestore السحابية"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline text-[11px]">مزامنة سحابية</span>
        </button>

        {/* Language Switcher */}
        <div className="flex items-center border border-neutral-700/70 rounded-lg overflow-hidden bg-neutral-800 text-xs">
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-2.5 py-1 font-medium transition-colors ${
              lang === 'ar' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            العربية
          </button>
          <button
            onClick={() => onLanguageChange('fr')}
            className={`px-2.5 py-1 font-medium transition-colors ${
              lang === 'fr' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 font-medium transition-colors ${
              lang === 'en' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>

        {/* User Profile & Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-1 border-r rtl:border-r-0 rtl:border-l border-neutral-800">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-xs">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                <User className="w-3 h-3" />
              </div>
              <span className="text-neutral-200 font-semibold max-w-[110px] truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                {currentUser.role === 'admin' ? 'مدير' : currentUser.role}
              </span>
            </div>

            <button
              onClick={onLogout || (() => authService.logout())}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
              title={lang === 'ar' ? 'تسجيل الخروج وقفل النظام' : 'Sign out'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{lang === 'ar' ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
