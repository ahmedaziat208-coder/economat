import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Mail,
  Send,
  X,
  CheckCircle2,
  PhoneCall,
  ShoppingCart,
  Copy,
  Check,
  Package,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Material, Supplier, Language } from '../types';
import { translations } from '../i18n/translations';
import { authService } from '../services/auth';

interface LowStockAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  suppliers: Supplier[];
  lang: Language;
  onOrderViaWhatsApp?: (supplier: Supplier, material: Material) => void;
  onNavigateToMaterial?: (materialId: string) => void;
  onCreatePurchaseOrder?: (material: Material) => void;
}

export const LowStockAlertsModal: React.FC<LowStockAlertsModalProps> = ({
  isOpen,
  onClose,
  materials,
  suppliers,
  lang,
  onOrderViaWhatsApp,
  onNavigateToMaterial,
  onCreatePurchaseOrder,
}) => {
  const t = translations[lang];
  const currentUser = authService.getCurrentUser();
  const [managerEmail, setManagerEmail] = useState(
    currentUser?.email || 'ahmedaziat208@gmail.com'
  );
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  // Filter low stock and out-of-stock items
  const lowStockItems = materials.filter((m) => m.currentStock <= m.minStock);
  const outOfStockItems = lowStockItems.filter((m) => m.currentStock <= 0);
  const criticalItems = lowStockItems.filter((m) => m.currentStock > 0);

  // Generate Email Text Report
  const generateReportText = () => {
    const cur = t.currency;
    const now = new Date().toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-MA');
    let text = `🚨 تقرير تنبيه انخفاض المخزون - مطعم OBAYOLI\n`;
    text += `التاريخ: ${now}\n`;
    text += `المرسل إليه (المدير): ${managerEmail}\n`;
    text += `عدد المواد تحت حد الأمان: ${lowStockItems.length} مواد\n\n`;
    text += `═══════════════════════════════════════\n`;

    lowStockItems.forEach((m, idx) => {
      const sup = suppliers.find((s) => s.id === m.supplierId);
      const deficit = Math.max(0, m.minStock - m.currentStock);
      text += `${idx + 1}. ${m.name}\n`;
      text += `   - المخزون الحالي: ${m.currentStock} ${m.unit} (حد الأمان الأدنى: ${m.minStock} ${m.unit})\n`;
      text += `   - العجز المطلوب تعويضه: ${deficit} ${m.unit}\n`;
      text += `   - سعر الوحدة: ${m.purchasePrice} ${cur}\n`;
      if (sup) {
        text += `   - المورد المعتمد: ${sup.name} (${sup.phone})\n`;
      }
      text += `───────────────────────────────────────\n`;
    });

    text += `\nنرجو اتخاذ إجراءات التوريد وإصدار أوامر الشراء فوراً لتجنب توقف المطبخ أو البار.\nإدارة نظام OBAYOLI ERP.`;
    return text;
  };

  const handleSendEmailToManager = () => {
    if (!managerEmail.trim()) {
      setEmailStatus('⚠️ يرجى تحديد بريد إلكتروني صحيح للمدير.');
      setTimeout(() => setEmailStatus(null), 3500);
      return;
    }

    const subject = encodeURIComponent(
      `🚨 تنبيه عاجل للمدير: انخفاض مخزون ${lowStockItems.length} مواد عن حد الأمان - OBAYOLI ERP`
    );
    const body = encodeURIComponent(generateReportText());
    
    // Open default email client with pre-filled report
    window.location.href = `mailto:${managerEmail.trim()}?subject=${subject}&body=${body}`;

    setEmailStatus(`تم تجهيز وإرسال التنبيه إلى بريد المدير (${managerEmail}) بنجاح!`);
    setTimeout(() => setEmailStatus(null), 5000);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  مركز تنبيهات المخزون للمدير
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  {lowStockItems.length} مواد حرجة
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                إشعار فوري عند انخفاض مخزون أي مادة عن الحد الأدنى المسموح به
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Banner: Email Alert to Manager */}
        <div className="p-4 bg-neutral-950/80 border-b border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>البريد الإلكتروني للمدير لاستقبال التنبيهات:</span>
              </label>
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@restaurant.com"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={handleSendEmailToManager}
                disabled={lowStockItems.length === 0}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال التنبيه للمدير</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition-colors"
                title="نسخ تقرير التنبيه كنص للمشاركة"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedText ? 'تم النسخ' : 'نسخ التقرير'}</span>
              </button>
            </div>
          </div>

          {emailStatus && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{emailStatus}</span>
            </div>
          )}
        </div>

        {/* Content: List of Low Stock Items */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">المخزون في وضع ممتاز!</h3>
                <p className="text-xs text-neutral-400">
                  جميع المواد المخزنة تتجاوز الحد الأدنى للأمان ولا توجد أي نواقص حالياً.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-neutral-400 flex items-center justify-between px-1">
                <span>المواد التي تتطلب توريداً عاجلاً:</span>
                <span className="text-[11px] text-rose-400 font-mono">
                  {outOfStockItems.length > 0 && `${outOfStockItems.length} نافدة تماماً · `}
                  {criticalItems.length} تحت حد الأمان
                </span>
              </div>

              {lowStockItems.map((mat) => {
                const sup = suppliers.find((s) => s.id === mat.supplierId);
                const isZero = mat.currentStock <= 0;
                const deficit = Math.max(0, mat.minStock - mat.currentStock);
                const percent = Math.min(100, Math.round((mat.currentStock / mat.minStock) * 100));

                return (
                  <div
                    key={mat.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isZero
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Material Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            {mat.name}
                          </span>
                          {isZero ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              نفاد كامل (0)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              تحت الأمان ({percent}%)
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-neutral-500">
                            {mat.sku}
                          </span>
                        </div>

                        {/* Stock comparison & progress bar */}
                        <div className="flex items-center gap-3 text-xs text-neutral-300">
                          <div>
                            المتوفر:{' '}
                            <strong className={isZero ? 'text-rose-400 font-mono' : 'text-amber-400 font-mono'}>
                              {mat.currentStock} {mat.unit}
                            </strong>
                          </div>
                          <span className="text-neutral-600">|</span>
                          <div>
                            الحد الأدنى للأمان:{' '}
                            <strong className="text-neutral-200 font-mono">
                              {mat.minStock} {mat.unit}
                            </strong>
                          </div>
                          <span className="text-neutral-600">|</span>
                          <div className="text-rose-400 font-semibold">
                            النقص: {deficit} {mat.unit}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-md h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isZero ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(5, percent)}%` }}
                          />
                        </div>

                        {/* Supplier info */}
                        {sup && (
                          <div className="text-[11px] text-neutral-400 pt-0.5 flex items-center gap-2">
                            <span>المورد المعتمد: <strong className="text-neutral-300">{sup.name}</strong></span>
                            <span className="text-neutral-600">·</span>
                            <span className="font-mono text-neutral-400">{sup.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                        {sup && onOrderViaWhatsApp && (
                          <button
                            type="button"
                            onClick={() => {
                              onOrderViaWhatsApp(sup, mat);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                            title="إرسال طلبية توريد مباشرة للمورد عبر WhatsApp"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>طلب عبر WhatsApp</span>
                          </button>
                        )}

                        {onNavigateToMaterial && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToMaterial(mat.id);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors"
                            title="الانتقال لبطاقة المادة وتفاصيل المخزون"
                          >
                            <span>عرض المادة</span>
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>نظام المراقبة اللحظية للمخزون يعمل تلقائياً</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
