import React, { useState, useEffect } from 'react';
import { Language, DishSale } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  ShoppingCart,
  Plus,
  Coins,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface PosSalesViewProps {
  lang: Language;
}

export const PosSalesView: React.FC<PosSalesViewProps> = ({ lang }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const activeRecipes = db.recipes.filter((r) => r.category !== 'sub_recipe');
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string>(
    activeRecipes[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [department, setDepartment] = useState<'cuisine' | 'bar'>('cuisine');
  const [notes, setNotes] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const selectedDish = db.recipes.find((r) => r.id === selectedDishId);

  // Sync custom price when dish changes
  React.useEffect(() => {
    if (selectedDish) {
      setCustomPrice(selectedDish.sellingPrice);
      setDepartment(selectedDish.department);
    }
  }, [selectedDishId]);

  const unitFoodCost = selectedDish ? dbService.calculateRecipeFoodCost(selectedDish.id) : 0;
  const totalAmount = Number((customPrice * quantity).toFixed(2));
  const totalCost = Number((unitFoodCost * quantity).toFixed(2));
  const profit = Number((totalAmount - totalCost).toFixed(2));
  const marginPct = totalAmount > 0 ? ((profit / totalAmount) * 100).toFixed(1) : '0';

  const handleRecordSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDishId || quantity <= 0) return;

    dbService.recordDishSale(
      selectedDishId,
      quantity,
      customPrice,
      department,
      notes || undefined
    );

    setSuccessNotice(`تم تسجيل بيع ${quantity} × ${selectedDish?.name} وتم خصم المكونات من المخزون بنجاح!`);
    setTimeout(() => setSuccessNotice(null), 4000);

    // Reset notes
    setNotes('');
  };

  const handleConfirmDelete = () => {
    if (saleToDelete) {
      dbService.deleteDishSale(saleToDelete, true);
      setSaleToDelete(null);
    }
  };

  // Aggregated Sales Metrics
  const totalRevenue = db.dishSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = db.dishSales.reduce((acc, s) => acc + s.grossProfit, 0);
  const overallMargin =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-neutral-400 flex items-center justify-between">
            <span>{t.salesRevenue}</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalRevenue.toLocaleString()} {t.currency}
          </div>
          <div className="text-[11px] text-neutral-500">إجمالي المبيعات المسجلة</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-neutral-400 flex items-center justify-between">
            <span>{t.salesProfit}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {totalProfit.toLocaleString()} {t.currency}
          </div>
          <div className="text-[11px] text-neutral-500">الأرباح الصافية بعد خصم تكلفة الطعام</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-neutral-400 flex items-center justify-between">
            <span>متوسط هامش الربح</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
            {overallMargin}%
          </div>
          <div className="text-[11px] text-neutral-500">نسبة الربحية الإجمالية</div>
        </div>
      </div>

      {/* Sale Registration Form + Live Calculation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-white">{t.posTitle}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.autoDeductionBadge}</span>
          </div>
        </div>

        {successNotice && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {activeRecipes.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-neutral-950/40 rounded-xl border border-neutral-800">
            <div className="text-amber-500 font-bold text-sm">لا توجد بطاقات تقنية للأطباق مسجلة حالياً</div>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              ابدأ أولاً بإدخال المواد الأولية من تبويب «المواد والأصناف»، ثم قم بإنشاء البطاقات التقنية للأطباق لتتمكن من تسجيل مبيعاتها وخصم مكوناتها تلقائياً.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRecordSale} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  اختر الطبق / الوصفة:
                </label>
                <select
                  value={selectedDishId}
                  onChange={(e) => setSelectedDishId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {activeRecipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.sellingPrice} {t.currency} ({r.department === 'bar' ? 'بار' : 'مطبخ'})
                    </option>
                  ))}
                </select>
              </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t.quantitySold}:
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono text-center font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                سعر البيع للوحدة ({t.currency}):
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
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

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t.notes} (رقم الطاولة أو اسم النادل):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: طاولة 4 - صالة العشاء"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Live Profit & Cost Preview */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-[10px] text-neutral-500">إجمالي المبيعات</div>
              <div className="text-base font-bold font-mono text-white tabular-nums">
                {totalAmount.toLocaleString()} {t.currency}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">تكلفة المكونات (Food Cost)</div>
              <div className="text-base font-bold font-mono text-amber-400 tabular-nums">
                {totalCost.toLocaleString()} {t.currency}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">مجمل الربح</div>
              <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">
                {profit.toLocaleString()} {t.currency}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">نسبة الربحية</div>
              <div className="text-base font-bold font-mono text-blue-400 tabular-nums">
                {marginPct}%
              </div>
            </div>
          </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>تسجيل البيع وخصم المكونات فوراً</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dish Sales History Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h4 className="font-bold text-xs text-white">{t.soldDishes}</h4>
          <span className="text-[11px] text-neutral-400 font-mono">
            {db.dishSales.length} عمليات مسجلة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                <th className="py-3 px-4 font-semibold">{t.date}</th>
                <th className="py-3 px-4 font-semibold">{t.dishName}</th>
                <th className="py-3 px-4 font-semibold">{t.quantity}</th>
                <th className="py-3 px-4 font-semibold">{t.total}</th>
                <th className="py-3 px-4 font-semibold">Food Cost</th>
                <th className="py-3 px-4 font-semibold">مجمل الربح</th>
                <th className="py-3 px-4 font-semibold">الهامش %</th>
                <th className="py-3 px-4 font-semibold">{t.department}</th>
                <th className="py-3 px-4 font-semibold text-center">{t.actions || 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {db.dishSales.map((sale) => {
                const dish = db.recipes.find((r) => r.id === sale.dishId);
                const dateStr = new Date(sale.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });

                return (
                  <tr key={sale.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {dateStr}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {dish?.name || sale.dishId}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-100 tabular-nums">
                      {sale.quantity}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400 tabular-nums">
                      {sale.totalAmount.toLocaleString()} {t.currency}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {sale.calculatedCost.toLocaleString()} {t.currency}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                      {sale.grossProfit.toLocaleString()} {t.currency}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-400 tabular-nums">
                      {sale.marginPercent}%
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {sale.department === 'bar' ? 'بار' : 'مطبخ'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSaleToDelete(sale.id)}
                        title="إلغاء وحذف عملية البيع"
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

      {/* In-App Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!saleToDelete}
        title="تأكيد إلغاء وحذف عملية البيع"
        message="هل أنت متأكد من إلغاء وحذف هذه العملية؟ سيتم تلقائياً إرجاع كافة المكونات الأولية للطبق وإضافتها مجدداً إلى رصيد المخزون الفعلي."
        onConfirm={handleConfirmDelete}
        onClose={() => setSaleToDelete(null)}
      />
    </div>
  );
};
