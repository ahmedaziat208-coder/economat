import React, { useState, useEffect } from 'react';
import { StockAudit, StockAuditItem, Language } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  ClipboardCheck,
  Plus,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
  Sparkles,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface StocktakingViewProps {
  lang: Language;
  onPrintAudit: (audit: StockAudit) => void;
}

export const StocktakingView: React.FC<StocktakingViewProps> = ({ lang, onPrintAudit }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [activeAudit, setActiveAudit] = useState<StockAudit>(
    db.audits[0] || {
      id: 'aud_' + Date.now(),
      auditNumber: 'JRD-' + new Date().getFullYear() + '-W' + Math.ceil(new Date().getDate() / 7),
      date: new Date().toISOString().split('T')[0],
      auditorName: 'حميد قادري (مراقب الجودة والمخازن)',
      status: 'draft',
      items: db.materials.map((m) => ({
        materialId: m.id,
        systemStock: m.currentStock,
        countedStock: m.currentStock,
        variance: 0,
        unitPrice: m.unitCost,
        varianceValue: 0,
        notes: '',
      })),
      totalPositiveVarianceValue: 0,
      totalNegativeVarianceValue: 0,
      netVarianceValue: 0,
    }
  );

  const [reconciledNotice, setReconciledNotice] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);

  // Recalculate variance whenever countedStock changes
  const handleCountChange = (materialId: string, counted: number) => {
    if (activeAudit.status === 'reconciled') return;

    const updatedItems = activeAudit.items.map((item) => {
      if (item.materialId === materialId) {
        const variance = Number((counted - item.systemStock).toFixed(3));
        const varianceValue = Number((variance * item.unitPrice).toFixed(2));
        return {
          ...item,
          countedStock: counted,
          variance,
          varianceValue,
        };
      }
      return item;
    });

    let pos = 0;
    let neg = 0;
    updatedItems.forEach((it) => {
      if (it.varianceValue > 0) pos += it.varianceValue;
      if (it.varianceValue < 0) neg += Math.abs(it.varianceValue);
    });

    setActiveAudit({
      ...activeAudit,
      items: updatedItems,
      totalPositiveVarianceValue: Number(pos.toFixed(2)),
      totalNegativeVarianceValue: Number(neg.toFixed(2)),
      netVarianceValue: Number((pos - neg).toFixed(2)),
    });
  };

  const handleStartNewSession = () => {
    const newSession: StockAudit = {
      id: 'aud_' + Date.now(),
      auditNumber: 'JRD-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      date: new Date().toISOString().split('T')[0],
      auditorName: 'المراقب / أمين المخزن',
      status: 'draft',
      items: db.materials.map((m) => ({
        materialId: m.id,
        systemStock: m.currentStock,
        countedStock: m.currentStock,
        variance: 0,
        unitPrice: m.unitCost,
        varianceValue: 0,
        notes: '',
      })),
      totalPositiveVarianceValue: 0,
      totalNegativeVarianceValue: 0,
      netVarianceValue: 0,
    };
    dbService.saveAudit(newSession);
    setActiveAudit(newSession);
  };

  const handleSaveDraft = () => {
    dbService.saveAudit(activeAudit);
    setReconciledNotice('تم حفظ مسودة الجرد بنجاح!');
    setTimeout(() => setReconciledNotice(null), 3500);
  };

  const handleConfirmReconcile = () => {
    dbService.saveAudit(activeAudit);
    const reconciled = dbService.reconcileAudit(activeAudit.id);
    if (reconciled) {
      setActiveAudit({ ...reconciled });
      setReconciledNotice('تم اعتماد الجرد وتحديث أرصدة المخزون الرسمية بنجاح!');
      setTimeout(() => setReconciledNotice(null), 4000);
    }
  };

  const handleConfirmDeleteAudit = () => {
    dbService.deleteAudit(activeAudit.id);
    const remaining = dbService.getSnapshot().audits.filter((a) => a.id !== activeAudit.id);
    if (remaining.length > 0) {
      setActiveAudit(remaining[0]);
    } else {
      handleStartNewSession();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-white">{t.stocktakingTitle}</h2>
              <div className="text-xs text-neutral-400 mt-0.5">
                دورة جرد رقم: <strong className="text-amber-400 font-mono">{activeAudit.auditNumber}</strong> · بتاريخ: {activeAudit.date}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 text-neutral-200 hover:text-white rounded-lg border border-neutral-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newAuditSession}</span>
            </button>

            <button
              onClick={() => onPrintAudit(activeAudit)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 text-neutral-200 hover:text-white rounded-lg border border-neutral-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.print}</span>
            </button>

            {activeAudit.status !== 'reconciled' && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 text-neutral-200 hover:text-white rounded-lg border border-neutral-700 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ مسودة</span>
                </button>
                <button
                  onClick={() => setIsReconcileModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.reconcileAndAdjust}</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              title="حذف دورة الجرد"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف الجرد</span>
            </button>
          </div>
        </div>

        {reconciledNotice && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{reconciledNotice}</span>
          </div>
        )}

        {/* Audit Meta Grid */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-neutral-500">حالة دورة الجرد</div>
            <div className="font-semibold text-white mt-0.5">
              {activeAudit.status === 'reconciled' ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>معتمد ومطابق في المخزون</span>
                </span>
              ) : (
                <span className="text-amber-400">مسودة قيد الحصر</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-neutral-500">{t.auditorNameLabel}</div>
            <input
              type="text"
              disabled={activeAudit.status === 'reconciled'}
              value={activeAudit.auditorName}
              onChange={(e) =>
                setActiveAudit({ ...activeAudit, auditorName: e.target.value })
              }
              className="bg-transparent border-b border-neutral-700 text-white font-medium focus:outline-none focus:border-amber-500 w-full mt-0.5"
            />
          </div>

          <div>
            <div className="text-neutral-500">إجمالي العجز (نقص)</div>
            <div className="font-mono font-bold text-rose-400 mt-0.5 tabular-nums">
              -{activeAudit.totalNegativeVarianceValue.toLocaleString()} {t.currency}
            </div>
          </div>

          <div>
            <div className="text-neutral-500">صافي فارق التسوية</div>
            <div className={`font-mono font-bold text-base mt-0.5 tabular-nums ${
              activeAudit.netVarianceValue < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {activeAudit.netVarianceValue.toLocaleString()} {t.currency}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Reconciliation Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                <th className="py-3 px-4 font-semibold">{t.materialName}</th>
                <th className="py-3 px-4 font-semibold">{t.systemStockLabel}</th>
                <th className="py-3 px-4 font-semibold">{t.countedStockLabel}</th>
                <th className="py-3 px-4 font-semibold">{t.variance}</th>
                <th className="py-3 px-4 font-semibold">{t.unitPrice}</th>
                <th className="py-3 px-4 font-semibold">{t.varianceValue}</th>
                <th className="py-3 px-4 font-semibold">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {activeAudit.items.map((item) => {
                const mat = db.materials.find((m) => m.id === item.materialId);
                const hasVariance = item.variance !== 0;

                return (
                  <tr
                    key={item.materialId}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      hasVariance ? (item.variance < 0 ? 'bg-rose-950/10' : 'bg-emerald-950/10') : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{mat?.name || item.materialId}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{mat?.sku}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-neutral-300 tabular-nums">
                      {item.systemStock} {mat?.unit}
                    </td>

                    <td className="py-3 px-4">
                      {activeAudit.status === 'reconciled' ? (
                        <span className="font-mono font-bold text-white tabular-nums">
                          {item.countedStock} {mat?.unit}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.countedStock}
                            onChange={(e) =>
                              handleCountChange(item.materialId, Number(e.target.value))
                            }
                            className="w-24 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono font-bold text-center focus:border-amber-500"
                          />
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {mat?.unit}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold tabular-nums">
                      <span
                        className={
                          item.variance < 0
                            ? 'text-rose-400'
                            : item.variance > 0
                            ? 'text-emerald-400'
                            : 'text-neutral-500'
                        }
                      >
                        {item.variance > 0 ? `+${item.variance}` : item.variance} {mat?.unit}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {item.unitPrice} {t.currency}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold tabular-nums">
                      <span
                        className={
                          item.varianceValue < 0
                            ? 'text-rose-400'
                            : item.varianceValue > 0
                            ? 'text-emerald-400'
                            : 'text-neutral-500'
                        }
                      >
                        {item.varianceValue.toLocaleString()} {t.currency}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {item.variance === 0 ? (
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-neutral-500" />
                          <span>مطابق</span>
                        </span>
                      ) : item.variance < 0 ? (
                        <span className="text-[11px] text-rose-400 font-medium">عجز (-{Math.abs(item.variance)})</span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">فائض (+{item.variance})</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Audit Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف دورة الجرد"
        message={`هل أنت متأكد من حذف دورة الجرد رقم (${activeAudit.auditNumber}) نهائياً؟`}
        onConfirm={handleConfirmDeleteAudit}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {/* Reconcile Audit Confirmation Modal */}
      <ConfirmModal
        isOpen={isReconcileModalOpen}
        variant="primary"
        title="اعتماد الجرد وتحديث المخزون"
        message="هل أنت متأكد من اعتماد الجرد وتحديث أرصدة المخزون رسمياً؟ لا يمكن التراجع عن هذه الخطوة."
        confirmLabel="اعتماد الجرد الآن"
        onConfirm={handleConfirmReconcile}
        onClose={() => setIsReconcileModalOpen(false)}
      />
    </div>
  );
};
