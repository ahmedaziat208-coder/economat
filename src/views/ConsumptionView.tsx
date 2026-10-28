import React, { useState, useEffect } from 'react';
import { Language, ConsumptionRecord } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import { Flame, Plus, Wine, Utensils, Search, Filter, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface ConsumptionViewProps {
  lang: Language;
}

export const ConsumptionView: React.FC<ConsumptionViewProps> = ({ lang }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [filterDept, setFilterDept] = useState<'all' | 'cuisine' | 'bar'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [consumptionToDelete, setConsumptionToDelete] = useState<string | null>(null);

  // Form State
  const [selectedMatId, setSelectedMatId] = useState(db.materials[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [department, setDepartment] = useState<'cuisine' | 'bar'>('cuisine');
  const [shift, setShift] = useState<'morning' | 'evening' | 'full'>('morning');
  const [requestedBy, setRequestedBy] = useState('الشيف رفيق');
  const [notes, setNotes] = useState('');

  const selectedMaterial = db.materials.find((m) => m.id === selectedMatId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || quantity <= 0) return;

    dbService.recordConsumption({
      date: new Date().toISOString(),
      materialId: selectedMatId,
      department,
      quantity: Number(quantity),
      unitPrice: selectedMaterial?.unitCost || 0,
      shift,
      requestedBy,
      notes,
    });

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (consumptionToDelete) {
      dbService.deleteConsumptionRecord(consumptionToDelete, true);
      setConsumptionToDelete(null);
    }
  };

  const filtered = db.consumptionRecords.filter((c) => {
    if (filterDept === 'all') return true;
    return c.department === filterDept;
  });

  const totalCuisine = db.consumptionRecords
    .filter((c) => c.department === 'cuisine')
    .reduce((acc, c) => acc + c.totalValue, 0);

  const totalBar = db.consumptionRecords
    .filter((c) => c.department === 'bar')
    .reduce((acc, c) => acc + c.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Department Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-500" />
              <span>{t.totalCuisineValue}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totalCuisine.toLocaleString()} {t.currency}
            </div>
            <div className="text-[11px] text-neutral-500">استهلاك قسم الطهي والمطبخ</div>
          </div>
          <span className="text-3xl opacity-20">🍳</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Wine className="w-4 h-4 text-blue-400" />
              <span>{t.totalBarValue}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totalBar.toLocaleString()} {t.currency}
            </div>
            <div className="text-[11px] text-neutral-500">استهلاك قسم المشروبات والقهوة</div>
          </div>
          <span className="text-3xl opacity-20">☕</span>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterDept('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterDept === 'all'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            جميع الأقسام ({db.consumptionRecords.length})
          </button>
          <button
            onClick={() => setFilterDept('cuisine')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterDept === 'cuisine'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            المطبخ فقط
          </button>
          <button
            onClick={() => setFilterDept('bar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterDept === 'bar'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            البار فقط
          </button>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newConsumption}</span>
        </button>
      </div>

      {/* Consumption Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                <th className="py-3 px-4 font-semibold">{t.date}</th>
                <th className="py-3 px-4 font-semibold">{t.department}</th>
                <th className="py-3 px-4 font-semibold">{t.materialName}</th>
                <th className="py-3 px-4 font-semibold">{t.quantity}</th>
                <th className="py-3 px-4 font-semibold">{t.unitPrice}</th>
                <th className="py-3 px-4 font-semibold">{t.total}</th>
                <th className="py-3 px-4 font-semibold">{t.shift}</th>
                <th className="py-3 px-4 font-semibold">المستلم / الطاهي</th>
                <th className="py-3 px-4 font-semibold text-center">{t.actions || 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filtered.map((c) => {
                const mat = db.materials.find((m) => m.id === c.materialId);
                const dateStr = new Date(c.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });

                return (
                  <tr key={c.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {dateStr}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                          c.department === 'cuisine'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {c.department === 'cuisine' ? 'مطبخ (Cuisine)' : 'بار (Bar)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-100">
                      {mat?.name || c.materialId}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-neutral-100 tabular-nums">
                      {c.quantity} {mat?.unit}
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {c.unitPrice} {t.currency}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-400 tabular-nums">
                      {c.totalValue.toLocaleString()} {t.currency}
                    </td>

                    <td className="py-3 px-4 text-neutral-400">
                      {t[`shift_${c.shift}` as keyof typeof t] || c.shift}
                    </td>

                    <td className="py-3 px-4 text-neutral-300">
                      {c.requestedBy || '-'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setConsumptionToDelete(c.id)}
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

      {/* Add Consumption Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{t.newConsumption}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.materialName}:
                </label>
                <select
                  value={selectedMatId}
                  onChange={(e) => setSelectedMatId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {db.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (المتوفر: {m.currentStock} {m.unit})
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
                    {t.department}:
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as 'cuisine' | 'bar')}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="cuisine">{t.dept_cuisine}</option>
                    <option value="bar">{t.dept_bar}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.shift}:
                  </label>
                  <select
                    value={shift}
                    onChange={(e) =>
                      setShift(e.target.value as 'morning' | 'evening' | 'full')
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="morning">{t.shift_morning}</option>
                    <option value="evening">{t.shift_evening}</option>
                    <option value="full">{t.shift_full}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    المستلم / الشيف:
                  </label>
                  <input
                    type="text"
                    required
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.notes}:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات الخدمة..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400"
                >
                  صرف وخصم من المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!consumptionToDelete}
        title="تأكيد حذف سجل الاستهلاك"
        message="هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ سيتم تلقائياً إرجاع الكمية المصروفة إلى رصيد المادة في المستودع."
        onConfirm={handleConfirmDelete}
        onClose={() => setConsumptionToDelete(null)}
      />
    </div>
  );
};
