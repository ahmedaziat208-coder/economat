import React, { useState, useEffect } from 'react';
import { Language, MovementType } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  ArrowLeftRight,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface StockMovementsViewProps {
  lang: Language;
}

export const StockMovementsView: React.FC<StockMovementsViewProps> = ({ lang }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [movToDelete, setMovToDelete] = useState<string | null>(null);

  // Form State for Add Movement
  const [selectedMatId, setSelectedMatId] = useState<string>(db.materials[0]?.id || '');
  const [movementType, setMovementType] = useState<MovementType>('in_purchase');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('أمين المخزن');
  const [movementDate, setMovementDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );

  const selectedMaterial = db.materials.find((m) => m.id === selectedMatId);

  // When opening modal, update unitPrice to material's unitCost
  const handleOpenAddModal = (initialType?: MovementType) => {
    const mat = db.materials[0];
    setSelectedMatId(mat?.id || '');
    setMovementType(
      initialType || (filterType !== 'all' ? (filterType as MovementType) : 'in_purchase')
    );
    setQuantity(1);
    setUnitPrice(mat ? mat.unitCost || mat.purchasePrice || 0 : 0);
    setReason('');
    setOperatorName('أمين المخزن');
    setMovementDate(new Date().toISOString().slice(0, 16));
    setIsAddModalOpen(true);
  };

  const handleMaterialChange = (matId: string) => {
    setSelectedMatId(matId);
    const mat = db.materials.find((m) => m.id === matId);
    if (mat) {
      setUnitPrice(mat.unitCost || mat.purchasePrice || 0);
    }
  };

  const isPositiveMovement = (type: MovementType) => {
    return type === 'in_purchase' || type === 'adjustment_positive';
  };

  // Calculate projected stock
  const currentStock = selectedMaterial ? selectedMaterial.currentStock : 0;
  const projectedStock = isPositiveMovement(movementType)
    ? Number((currentStock + quantity).toFixed(3))
    : Number(Math.max(0, currentStock - quantity).toFixed(3));

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || quantity <= 0) return;

    dbService.recordStockMovement({
      materialId: selectedMatId,
      type: movementType,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      reason: reason.trim() || undefined,
      operatorName: operatorName.trim() || undefined,
      date: movementDate ? new Date(movementDate).toISOString() : new Date().toISOString(),
    });

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (movToDelete) {
      dbService.deleteStockMovement(movToDelete, true);
      setMovToDelete(null);
    }
  };

  const filteredMovements = db.movements.filter((mov) => {
    const mat = db.materials.find((m) => m.id === mov.materialId);
    const q = search.toLowerCase().trim();

    const matchesSearch =
      !q ||
      (mat && mat.name.toLowerCase().includes(q)) ||
      (mov.reason && mov.reason.toLowerCase().includes(q)) ||
      (mov.operatorName && mov.operatorName.toLowerCase().includes(q));

    const matchesType = filterType === 'all' || mov.type === filterType;
    return matchesSearch && matchesType;
  });

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'in_purchase':
        return {
          label: t.mov_in_purchase,
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: ArrowDownLeft,
        };
      case 'out_kitchen':
        return {
          label: t.mov_out_kitchen,
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: ArrowUpRight,
        };
      case 'out_bar':
        return {
          label: t.mov_out_bar,
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          icon: ArrowUpRight,
        };
      case 'out_dish_sale':
        return {
          label: t.mov_out_dish_sale,
          className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          icon: ArrowUpRight,
        };
      case 'out_waste':
        return {
          label: t.mov_out_waste,
          className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          icon: ArrowUpRight,
        };
      case 'adjustment_positive':
        return {
          label: t.mov_adjustment_positive,
          className: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
          icon: ArrowDownLeft,
        };
      case 'adjustment_negative':
        return {
          label: t.mov_adjustment_negative,
          className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          icon: ArrowUpRight,
        };
      case 'audit_reconciliation':
        return {
          label: t.mov_audit_reconciliation,
          className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
          icon: CheckCircle2,
        };
      default:
        return {
          label: type,
          className: 'bg-neutral-800 text-neutral-400 border-neutral-700',
          icon: ArrowLeftRight,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Search, Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالمادة، السبب، أو المسؤول..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pr-9 pl-4 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الحركات ({db.movements.length})</option>
            <option value="in_purchase">{t.mov_in_purchase}</option>
            <option value="out_dish_sale">{t.mov_out_dish_sale}</option>
            <option value="out_kitchen">{t.mov_out_kitchen}</option>
            <option value="out_bar">{t.mov_out_bar}</option>
            <option value="out_waste">{t.mov_out_waste}</option>
            <option value="adjustment_positive">{t.mov_adjustment_positive}</option>
            <option value="adjustment_negative">{t.mov_adjustment_negative}</option>
            <option value="audit_reconciliation">{t.mov_audit_reconciliation}</option>
          </select>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حركة مخزون</span>
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                <th className="py-3 px-4 font-semibold">{t.date}</th>
                <th className="py-3 px-4 font-semibold">{t.materialName}</th>
                <th className="py-3 px-4 font-semibold">{t.movementType}</th>
                <th className="py-3 px-4 font-semibold">{t.quantity}</th>
                <th className="py-3 px-4 font-semibold">{t.unitPrice}</th>
                <th className="py-3 px-4 font-semibold">{t.total}</th>
                <th className="py-3 px-4 font-semibold">{t.adjustmentReason}</th>
                <th className="py-3 px-4 font-semibold">{t.operatorName}</th>
                <th className="py-3 px-4 font-semibold text-center">{t.actions || 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500 text-xs">
                    لا توجد حركات مخزون تطابق البحث أو التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const mat = db.materials.find((m) => m.id === mov.materialId);
                  const badge = getMovementBadge(mov.type);
                  const Icon = badge.icon;
                  const formattedDate = new Date(mov.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr key={mov.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                        {formattedDate}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-200">{mat?.name || mov.materialId}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{mat?.sku}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-neutral-100 tabular-nums">
                        {mov.quantity} {mat?.unit || ''}
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-300 tabular-nums">
                        {mov.unitPrice} {t.currency}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-400 tabular-nums">
                        {mov.totalValue.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                        {mov.reason || '-'}
                      </td>

                      <td className="py-3 px-4 text-neutral-400">
                        {mov.operatorName || '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setMovToDelete(mov.id)}
                          title="حذف هذه الحركة"
                          className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Movement Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                <span>تسجيل حركة مخزون جديدة</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-5 space-y-4">
              {/* Movement Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  نوع حركة المخزون:
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as MovementType)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <optgroup label="حركات الدخول والإضافة (زيادة الرصيد +)">
                    <option value="in_purchase">📥 {t.mov_in_purchase}</option>
                    <option value="adjustment_positive">➕ {t.mov_adjustment_positive}</option>
                  </optgroup>
                  <optgroup label="حركات الخروج والصرف (خصم من الرصيد -)">
                    <option value="out_kitchen">🍳 {t.mov_out_kitchen}</option>
                    <option value="out_bar">☕ {t.mov_out_bar}</option>
                    <option value="out_dish_sale">🏷️ {t.mov_out_dish_sale}</option>
                    <option value="out_waste">🗑️ {t.mov_out_waste}</option>
                    <option value="adjustment_negative">➖ {t.mov_adjustment_negative}</option>
                  </optgroup>
                  <optgroup label="حركات التدقيق والمطابقة">
                    <option value="audit_reconciliation">📋 {t.mov_audit_reconciliation}</option>
                  </optgroup>
                </select>
              </div>

              {/* Material Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  المادة الأولية:
                </label>
                <select
                  value={selectedMatId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {db.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sku}) · الرصيد الحالي: {m.currentStock} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Impact Live Preview */}
              {selectedMaterial && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    isPositiveMovement(movementType)
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isPositiveMovement(movementType) ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">
                        {isPositiveMovement(movementType)
                          ? 'أثر الحركة: إضافة ورفع رصيد المخزون (+)'
                          : 'أثر الحركة: صرف وخصم من رصيد المخزون (-)'}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-bold tabular-nums text-right">
                    <span>{currentStock}</span> ➔ <span className="underline">{projectedStock}</span> {selectedMaterial.unit}
                  </div>
                </div>
              )}

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    الكمية ({selectedMaterial?.unit || 'وحدة'}):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    سعر الوحدة ({t.currency}):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Total Financial Value */}
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">إجمالي القيمة المالية للحركة:</span>
                <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                  {(quantity * unitPrice).toFixed(2)} {t.currency}
                </span>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  سبب أو بيان الحركة:
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: شراء مباشر نقدياً، صرف للمطبخ لخدمة العشاء، تعديل خطأ إدخال..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Operator Name & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    المسؤول / المشرف:
                  </label>
                  <input
                    type="text"
                    required
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    التاريخ والوقت:
                  </label>
                  <input
                    type="datetime-local"
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
                >
                  تسجيل وحفظ الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!movToDelete}
        title="تأكيد حذف حركة المخزون"
        message="هل أنت متأكد من حذف حركة المخزون هذه؟ سيتم تلقائياً عكس أثر الحركة وتحديث رصيد المخزون الفعلي."
        onConfirm={handleConfirmDelete}
        onClose={() => setMovToDelete(null)}
      />
    </div>
  );
};
