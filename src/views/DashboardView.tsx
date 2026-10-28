import React, { useState, useEffect } from 'react';
import { Language, Material, SupplierInvoice } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import { ViewTab } from '../components/Sidebar';
import { APP_IMAGES } from '../assets/images';
import {
  Boxes,
  AlertTriangle,
  Coins,
  Receipt,
  Flame,
  Trash2,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  Truck,
  ShoppingCart,
  ClipboardCheck,
  ShoppingBag,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface DashboardViewProps {
  lang: Language;
  onNavigate: (tab: ViewTab) => void;
  onOpenBarcodeModal: () => void;
  onOpenWhatsApp: (material: Material) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lang,
  onNavigate,
  onOpenBarcodeModal,
  onOpenWhatsApp,
}) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SupplierInvoice | null>(null);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  // Metrics calculations
  const totalMaterials = db.materials.length;
  const criticalMaterials = db.materials.filter((m) => m.currentStock <= m.minStock);
  const totalStockValue = db.materials.reduce(
    (acc, m) => acc + m.currentStock * m.unitCost,
    0
  );

  const monthlyInvoicesTotal = db.invoices.reduce((acc, inv) => acc + inv.totalTTC, 0);
  const monthlyConsumptionTotal = db.consumptionRecords.reduce(
    (acc, c) => acc + c.totalValue,
    0
  );
  const monthlyWasteTotal = db.wasteRecords.reduce((acc, w) => acc + w.totalCost, 0);

  const recentInvoices = db.invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Visual Hero Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
        <div className="absolute inset-0">
          <img
            src={APP_IMAGES.heroKitchen}
            alt="Restaurant Culinary Kitchen"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-transparent" />
        </div>

        <div className="relative p-6 md:p-8 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <span>🍽️ نظام تسيير المطاعم والمخازن الاحترافي</span>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => onNavigate('pos_sales')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t.recordDishSale}</span>
            </button>
            <button
              onClick={() => onNavigate('invoices')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-neutral-800 text-neutral-100 rounded-lg hover:bg-neutral-700 border border-neutral-700 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              <span>{t.logInvoice}</span>
            </button>
            <button
              onClick={onOpenBarcodeModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-neutral-800/80 text-amber-400 rounded-lg hover:bg-neutral-800 border border-amber-500/30 transition-colors"
            >
              <span>{t.barcodeScan}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fresh Start / Empty State Banner */}
      {totalMaterials === 0 && (
        <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-bold text-lg shrink-0">
              📦
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-300">النظام جاهز وفارغ للبدء من الصفر في إدخال المواد</h4>
              <p className="text-xs text-neutral-300 mt-0.5">
                تم مسح جميع البيانات السابقة بنجاح. ابدأ الآن بتسجيل أول مادة أولية مع أسعار FEX والباركود ورصيد المخزون.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('materials')}
            className="px-4 py-2 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0 shadow-sm"
          >
            + إضافة المواد والأصناف الآن
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{t.kpiTotalMaterials}</span>
            <Boxes className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {totalMaterials}
          </div>
          <div className="text-[10px] text-neutral-500">صنف مسجل</div>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 transition-colors ${
          criticalMaterials.length > 0
            ? 'bg-rose-950/20 border-rose-900/50 text-rose-300'
            : 'bg-neutral-900 border-neutral-800/80 text-neutral-400'
        }`}>
          <div className="text-[11px] flex items-center justify-between">
            <span>{t.kpiLowStockAlerts}</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${criticalMaterials.length > 0 ? 'text-rose-400 animate-pulse' : 'text-neutral-500'}`} />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {criticalMaterials.length}
          </div>
          <div className="text-[10px] text-rose-400">تحت حد الأمان</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{t.kpiTotalStockValue}</span>
            <Coins className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
            {Math.round(totalStockValue).toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500">{t.currency} قيمة المخزون</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{t.kpiMonthlyInvoices}</span>
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {Math.round(monthlyInvoicesTotal).toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500">{t.currency} مشتريات وتوريد</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{t.kpiMonthlyConsumption}</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {Math.round(monthlyConsumptionTotal).toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500">{t.currency} مطبخ + بار</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{t.kpiMonthlyWaste}</span>
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">
            {Math.round(monthlyWasteTotal).toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500">{t.currency} خسائر تلف وهدر</div>
        </div>
      </div>

      {/* Main Grid: Critical Stock Alerts + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Stock Alerts */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">{t.criticalStockItems}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('purchase_orders')}
                className="px-2.5 py-1 text-[11px] bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                title="طلب المواد الناقصة من الموردين"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>طلب من الموردين</span>
              </button>
              <button
                onClick={() => onNavigate('materials')}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 font-medium"
              >
                <span>{t.materials}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {criticalMaterials.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-lg">
              {t.noAlerts}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {criticalMaterials.map((m) => {
                const supplier = db.suppliers.find((s) => s.id === m.supplierId);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-rose-900/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-xs text-white truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                        <span>الرصيد: <strong className="text-rose-400 font-mono">{m.currentStock} {m.unit}</strong></span>
                        <span>·</span>
                        <span>حد الأمان: {m.minStock} {m.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {supplier && (
                        <button
                          onClick={() => onOpenWhatsApp(m)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition-colors"
                          title="إرسال طلبية بالواتساب"
                        >
                          <Truck className="w-3 h-3" />
                          <span>طلب توريد</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">{t.recentInvoices}</h3>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>كل الفواتير</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentInvoices.map((inv) => {
              const supplier = db.suppliers.find((s) => s.id === inv.supplierId);
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-200">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-neutral-500">· {inv.date}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {supplier?.companyName || 'مورد عام'} ({inv.items.length} مواد)
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-left">
                      <div className="font-mono font-bold text-xs text-amber-400 tabular-nums">
                        {inv.totalTTC.toLocaleString()} {t.currency}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        {inv.status === 'paid' ? 'مدفوعة' : 'قيد الانتظار'}
                      </div>
                    </div>
                    <button
                      onClick={() => setInvoiceToDelete(inv)}
                      title="حذف الفاتورة"
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Access Tiles to Core Workflows */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigate('purchase_orders')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-right transition-all group"
        >
          <div className="text-amber-500 mb-2 font-bold text-sm flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span>طلب المواد من الموردين</span>
          </div>
          <div className="text-xs text-neutral-400 group-hover:text-neutral-200">
            إنشاء طلبيات التوريد، إرسالها بالواتساب، واستلامها للمخزون
          </div>
        </button>

        <button
          onClick={() => onNavigate('recipes')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-right transition-all group"
        >
          <div className="text-amber-500 mb-2 font-bold text-sm">البطاقات التقنية للأطباق</div>
          <div className="text-xs text-neutral-400 group-hover:text-neutral-200">
            حساب تكلفة الطعام (Food Cost) وهامش ربح كل وصفة
          </div>
        </button>

        <button
          onClick={() => onNavigate('stocktaking')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-right transition-all group"
        >
          <div className="text-amber-500 mb-2 font-bold text-sm">الجرد الفعلي والمطابقة</div>
          <div className="text-xs text-neutral-400 group-hover:text-neutral-200">
            تسجيل الجرد الفعلي ومقارنته برصيد النظام واعتماد التسويات
          </div>
        </button>

        <button
          onClick={() => onNavigate('waste')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-right transition-all group"
        >
          <div className="text-rose-400 mb-2 font-bold text-sm">تسجيل الهدر والتالف</div>
          <div className="text-xs text-neutral-400 group-hover:text-neutral-200">
            توثيق أسباب التلف والخصم التلقائي وحساب الخسائر
          </div>
        </button>

        <button
          onClick={() => onNavigate('cloud_db')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-right transition-all group"
        >
          <div className="text-blue-400 mb-2 font-bold text-sm">قاعدة البيانات & Cloudflare</div>
          <div className="text-xs text-neutral-400 group-hover:text-neutral-200">
            تصدير JSON، إعداد Cloudflare Workers و D1 و GitHub
          </div>
        </button>
      </div>

      {/* Delete Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={!!invoiceToDelete}
        title="تأكيد حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة رقم (${invoiceToDelete?.invoiceNumber || ''})؟ سيتم عكس أثر كمياتها من المخزون تلقائياً.`}
        onConfirm={() => {
          if (invoiceToDelete) {
            dbService.deleteInvoice(invoiceToDelete.id);
            setInvoiceToDelete(null);
          }
        }}
        onClose={() => setInvoiceToDelete(null)}
      />
    </div>
  );
};
