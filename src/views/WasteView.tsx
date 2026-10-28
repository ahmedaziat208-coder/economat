import React, { useState, useEffect } from 'react';
import { Language, WasteReason, WasteRecord } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import { Trash2, Plus, AlertOctagon, TrendingDown, X, Check } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface WasteViewProps {
  lang: Language;
}

export const WasteView: React.FC<WasteViewProps> = ({ lang }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wasteToDelete, setWasteToDelete] = useState<string | null>(null);
  const [selectedMatId, setSelectedMatId] = useState(db.materials[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<WasteReason>('storage_damage');
  const [department, setDepartment] = useState<'cuisine' | 'bar' | 'stock'>('cuisine');
  const [reportedBy, setReportedBy] = useState('مساعد الطاهي وليد');
  const [notes, setNotes] = useState('');

  const selectedMaterial = db.materials.find((m) => m.id === selectedMatId);

  const handleSaveWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || quantity <= 0) return;

    dbService.recordWaste({
      date: new Date().toISOString(),
      materialId: selectedMatId,
      quantity: Number(quantity),
      unitPrice: selectedMaterial?.unitCost || 0,
      reason,
      department,
      reportedBy,
      notes,
    });

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (wasteToDelete) {
      dbService.deleteWasteRecord(wasteToDelete, true);
      setWasteToDelete(null);
    }
  };

  const totalCumulativeLoss = db.wasteRecords.reduce((acc, w) => acc + w.totalCost, 0);

  return (
    <div className="space-y-6">
      {/* Cumulative Waste KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-1 sm:col-span-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <span>{t.cumulativeWasteCost}</span>
            </div>
            <div className="text-3xl font-bold font-mono text-rose-400 tabular-nums mt-1">
              {totalCumulativeLoss.toLocaleString()} {t.currency}
            </div>
            <div className="text-[11px] text-neutral-500">
              إجمالي القيمة المالية المفقودة بسبب التلف، الكسر، وانتهاء الصلاحية
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newWasteRecord}</span>
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-neutral-400">عدد حالات التلف المسجلة</div>
          <div className="text-3xl font-bold font-mono text-white tabular-nums">
            {db.wasteRecords.length}
          </div>
          <div className="text-[11px] text-neutral-500">تم خصمها تلقائياً من الأرصدة</div>
        </div>
      </div>

      {/* Waste Records Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                <th className="py-3 px-4 font-semibold">{t.date}</th>
                <th className="py-3 px-4 font-semibold">{t.materialName}</th>
                <th className="py-3 px-4 font-semibold">{t.quantity}</th>
                <th className="py-3 px-4 font-semibold">{t.unitPrice}</th>
                <th className="py-3 px-4 font-semibold">{t.total}</th>
                <th className="py-3 px-4 font-semibold">{t.wasteReason}</th>
                <th className="py-3 px-4 font-semibold">{t.department}</th>
                <th className="py-3 px-4 font-semibold">{t.reportedBy}</th>
                <th className="py-3 px-4 font-semibold">{t.notes}</th>
                <th className="py-3 px-4 font-semibold text-center">{t.actions || 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {db.wasteRecords.map((w) => {
                const mat = db.materials.find((m) => m.id === w.materialId);
                const dateStr = new Date(w.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });

                return (
                  <tr key={w.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {dateStr}
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {mat?.name || w.materialId}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-rose-400 tabular-nums">
                      {w.quantity} {mat?.unit}
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {w.unitPrice} {t.currency}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-rose-400 tabular-nums">
                      {w.totalCost.toLocaleString()} {t.currency}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded">
                        {t[`reason_${w.reason}` as keyof typeof t] || w.reason}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-400">
                      {w.department === 'cuisine' ? 'مطبخ' : w.department === 'bar' ? 'بار' : 'مستودع'}
                    </td>

                    <td className="py-3 px-4 text-neutral-300">
                      {w.reportedBy}
                    </td>

                    <td className="py-3 px-4 text-neutral-400 max-w-xs truncate">
                      {w.notes || '-'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setWasteToDelete(w.id)}
                        title="حذف هذا السجل"
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Waste Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>{t.newWasteRecord}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWaste} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  المادة التالفة:
                </label>
                <select
                  value={selectedMatId}
                  onChange={(e) => setSelectedMatId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {db.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (المتوفر: {m.currentStock} {m.unit} · {m.unitCost} {t.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.quantity} ({selectedMaterial?.unit}):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.wasteReason}:
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as WasteReason)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="storage_damage">{t.reason_storage_damage}</option>
                    <option value="expired">{t.reason_expired}</option>
                    <option value="breakage">{t.reason_breakage}</option>
                    <option value="prep_defect">{t.reason_prep_defect}</option>
                    <option value="temperature_abuse">{t.reason_temperature_abuse}</option>
                    <option value="other">{t.reason_other}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.department}:
                  </label>
                  <select
                    value={department}
                    onChange={(e) =>
                      setDepartment(e.target.value as 'cuisine' | 'bar' | 'stock')
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="cuisine">{t.dept_cuisine}</option>
                    <option value="bar">{t.dept_bar}</option>
                    <option value="stock">{t.dept_stock}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.reportedBy}:
                  </label>
                  <input
                    type="text"
                    required
                    value={reportedBy}
                    onChange={(e) => setReportedBy(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  تفاصيل وتوضيح سبب التلف:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="وصف سبب حدوث الهدر..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs flex justify-between">
                <span className="text-neutral-400">التكلفة المالية المحسوبة:</span>
                <span className="font-mono font-bold text-rose-400">
                  {((selectedMaterial?.unitCost || 0) * quantity).toFixed(2)} {t.currency}
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-500"
                >
                  تسجيل وخصم من الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!wasteToDelete}
        title="تأكيد حذف سجل الهدر"
        message="هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ سيتم تلقائياً إرجاع الكمية التالفة إلى رصيد المخزون الفعلي للمادة."
        onConfirm={handleConfirmDelete}
        onClose={() => setWasteToDelete(null)}
      />
    </div>
  );
};
