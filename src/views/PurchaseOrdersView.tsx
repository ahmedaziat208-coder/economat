import React, { useState, useEffect } from 'react';
import { Language, PurchaseOrder, PurchaseOrderItem, Supplier, Material } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  ShoppingBag,
  Plus,
  Send,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  ArrowRight,
  X,
  FileCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface PurchaseOrdersViewProps {
  lang: Language;
  onPrintOrder: (order: PurchaseOrder) => void;
  onSendWhatsApp: (order: PurchaseOrder, supplier: Supplier) => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  lang,
  onPrintOrder,
  onSendWhatsApp,
}) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [orderToConvert, setOrderToConvert] = useState<PurchaseOrder | null>(null);

  // Form State
  const initialForm = {
    orderNumber: '',
    supplierId: db.suppliers[0]?.id || '',
    requestedDeliveryDate: new Date().toISOString().split('T')[0],
    items: [] as PurchaseOrderItem[],
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const purchaseOrders = dbService.getPurchaseOrders();

  const filteredOrders = purchaseOrders.filter((ord) => {
    const matchesSupplier = filterSupplier === 'all' || ord.supplierId === filterSupplier;
    const matchesStatus = filterStatus === 'all' || ord.status === filterStatus;
    return matchesSupplier && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingOrder(null);
    const orderNum =
      'BDC-' +
      new Date().getFullYear() +
      '-' +
      Math.floor(100 + Math.random() * 900);

    const firstSupplier = db.suppliers[0];
    setFormData({
      ...initialForm,
      orderNumber: orderNum,
      supplierId: firstSupplier?.id || '',
      items: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ord: PurchaseOrder) => {
    setEditingOrder(ord);
    setFormData({
      orderNumber: ord.orderNumber,
      supplierId: ord.supplierId,
      requestedDeliveryDate: ord.requestedDeliveryDate || '',
      items: ord.items.map((i) => ({ ...i })),
      notes: ord.notes || '',
    });
    setIsModalOpen(true);
  };

  // Smart feature: Automatically import low-stock items for selected supplier
  const handleAutoAddLowStock = () => {
    const lowStock = db.materials.filter((m) => {
      const isLow = m.currentStock <= m.minStock;
      const isMatchSupplier = !m.supplierId || m.supplierId === formData.supplierId;
      return isLow && isMatchSupplier;
    });

    if (lowStock.length === 0) {
      alert('لا توجد مواد تحت حد الأمان لهذا المورد حالياً!');
      return;
    }

    const newItems: PurchaseOrderItem[] = lowStock.map((m) => {
      // Calculate recommended replenishment
      const deficit = Math.max(1, Math.ceil(m.minStock * 2 - m.currentStock));
      return {
        materialId: m.id,
        materialName: m.name,
        quantity: deficit,
        unit: m.unit,
        estimatedPrice: m.purchasePrice || m.unitCost || 0,
        totalEstimate: Number((deficit * (m.purchasePrice || m.unitCost || 0)).toFixed(2)),
      };
    });

    setFormData({
      ...formData,
      items: [...formData.items, ...newItems],
    });
  };

  const handleAddItemRow = () => {
    const firstMat = db.materials[0];
    if (!firstMat) return;

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          materialId: firstMat.id,
          materialName: firstMat.name,
          quantity: 10,
          unit: firstMat.unit,
          estimatedPrice: firstMat.purchasePrice || 0,
          totalEstimate: Number((10 * (firstMat.purchasePrice || 0)).toFixed(2)),
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...formData.items];
    updated.splice(index, 1);
    setFormData({ ...formData, items: updated });
  };

  const totalEstimatedAmount = formData.items.reduce(
    (acc, it) => acc + (it.totalEstimate || 0),
    0
  );

  const handleSaveOrder = (status: PurchaseOrder['status'] = 'draft') => {
    if (!formData.supplierId || formData.items.length === 0) {
      alert('يرجى اختيار مورد وإضافة مادة واحدة على الأقل في الطلبية.');
      return;
    }

    const saved = dbService.savePurchaseOrder({
      id: editingOrder ? editingOrder.id : undefined,
      orderNumber: formData.orderNumber,
      createdAt: new Date().toISOString(),
      requestedDeliveryDate: formData.requestedDeliveryDate,
      supplierId: formData.supplierId,
      items: formData.items,
      totalEstimatedAmount,
      status,
      notes: formData.notes,
    });

    setIsModalOpen(false);
    setSuccessBanner(`تم حفظ طلبية التوريد رقم ${saved.orderNumber} بنجاح!`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleConfirmConvertToInvoice = () => {
    if (!orderToConvert) return;
    const inv = dbService.convertOrderToInvoice(orderToConvert.id);
    if (inv) {
      setSuccessBanner(
        `تم استلام الطلبية بنجاح وتوليد فاتورة التوريد رقم ${inv.invoiceNumber} وإضافة المواد للمخزون!`
      );
      setTimeout(() => setSuccessBanner(null), 5000);
    }
    setOrderToConvert(null);
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      dbService.deletePurchaseOrder(orderToDelete);
      setOrderToDelete(null);
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft':
        return { label: 'مسودة', className: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
      case 'sent':
        return { label: 'تم الإرسال للمورد', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'confirmed':
        return { label: 'مؤكدة للتسليم', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'delivered':
        return { label: 'تم الاستلام وإضافته للمخزون', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'cancelled':
        return { label: 'ملغاة', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      default:
        return { label: status, className: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">طلب المواد من الموردين (Bons de Commande)</h2>
              <div className="text-xs text-neutral-400 mt-0.5">
                إنشاء ومتابعة طلبيات التوريد، إرسالها عبر WhatsApp، وتحويلها إلى فواتير استلام مخزنية بنقرة واحدة.
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء طلبية توريد جديدة</span>
          </button>
        </div>

        {successBanner && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800 text-xs">
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الموردين ({db.suppliers.length})</option>
            {db.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="sent">تم الإرسال للمورد</option>
            <option value="confirmed">مؤكدة</option>
            <option value="delivered">تم الاستلام وإضافته للمخزون</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">لا توجد طلبيات توريد مسجلة حالياً</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                يمكنك إنشاء طلبية توريد جديدة لأي مورد، واقتراح المواد الناقصة تحت حد الأمان تلقائياً وإرسالها عبر WhatsApp.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء أول طلبية توريد الآن</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                  <th className="py-3 px-4 font-semibold">رقم الطلبية</th>
                  <th className="py-3 px-4 font-semibold">تاريخ الإنشاء</th>
                  <th className="py-3 px-4 font-semibold">المورد المطلوب منه</th>
                  <th className="py-3 px-4 font-semibold">تاريخ التسليم المطلوب</th>
                  <th className="py-3 px-4 font-semibold">عدد المواد</th>
                  <th className="py-3 px-4 font-semibold">القيمة التقديرية</th>
                  <th className="py-3 px-4 font-semibold">الحالة</th>
                  <th className="py-3 px-4 font-semibold text-center">الإجراءات والعمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredOrders.map((ord) => {
                  const supplier = db.suppliers.find((s) => s.id === ord.supplierId);
                  const badge = getStatusBadge(ord.status);
                  const isDelivered = ord.status === 'delivered';

                  return (
                    <tr key={ord.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {ord.orderNumber}
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                        {new Date(ord.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA')}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {supplier?.companyName || 'مورد عام'}
                        </div>
                        <div className="text-[10px] text-neutral-500">{supplier?.phone}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-300">
                        {ord.requestedDeliveryDate || '-'}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-neutral-200">
                        {ord.items.length} مواد
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-neutral-100 tabular-nums">
                        {ord.totalEstimatedAmount.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Send WhatsApp */}
                          {supplier && (
                            <button
                              onClick={() => onSendWhatsApp(ord, supplier)}
                              title="إرسال بنود الطلبية عبر WhatsApp"
                              className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Bon de Commande */}
                          <button
                            onClick={() => onPrintOrder(ord)}
                            title="طباعة سند الطلبية (A4)"
                            className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Convert to Invoice if not already delivered */}
                          {!isDelivered && (
                            <button
                              onClick={() => setOrderToConvert(ord)}
                              title="استلام الشحنة وإضافتها للمخزون وتحويلها لفاتورة"
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors"
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>استلام للمخزون</span>
                            </button>
                          )}

                          {!isDelivered && (
                            <button
                              onClick={() => handleOpenEdit(ord)}
                              title={t.edit}
                              className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setOrderToDelete(ord.id)}
                            title={t.delete}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Purchase Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>{editingOrder ? 'تعديل طلبية التوريد' : 'إنشاء طلبية توريد جديدة للمورد'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    رقم الطلبية *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.orderNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, orderNumber: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    المورد المطلوب منه *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {db.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    تاريخ التسليم المطلوب
                  </label>
                  <input
                    type="date"
                    value={formData.requestedDeliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, requestedDeliveryDate: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Items Section Header with Smart Auto-Import */}
              <div className="space-y-2 border-t border-neutral-800 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-amber-400">
                    قائمة المواد المطلوبة من المورد:
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoAddLowStock}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/25 transition-colors"
                      title="حصر جميع المواد الناقصة التابعة لهذا المورد وإدراجها فوراً"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>إضافة المواد الناقصة تلقائياً (تحت حد الأمان)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-neutral-800 text-neutral-200 hover:text-white rounded-lg border border-neutral-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة مادة يدوياً</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-950 rounded-lg border border-neutral-800">
                    لم تقم بإضافة أي مواد بعد. اضغط «إضافة المواد الناقصة تلقائياً» أو «إضافة مادة يدوياً».
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formData.items.map((it, idx) => {
                      const mat = db.materials.find((m) => m.id === it.materialId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-xs"
                        >
                          <select
                            value={it.materialId}
                            onChange={(e) => {
                              const newMat = db.materials.find((m) => m.id === e.target.value);
                              const updated = [...formData.items];
                              const price = newMat ? (newMat.purchasePrice || newMat.unitCost) : it.estimatedPrice;
                              updated[idx] = {
                                ...updated[idx],
                                materialId: e.target.value,
                                materialName: newMat ? newMat.name : it.materialName,
                                unit: newMat ? newMat.unit : it.unit,
                                estimatedPrice: price,
                                totalEstimate: Number((it.quantity * price).toFixed(2)),
                              };
                              setFormData({ ...formData, items: updated });
                            }}
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white"
                          >
                            {db.materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (المتوفر حالياً: {m.currentStock} {m.unit})
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={it.quantity}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                const updated = [...formData.items];
                                updated[idx] = {
                                  ...updated[idx],
                                  quantity: qty,
                                  totalEstimate: Number((qty * it.estimatedPrice).toFixed(2)),
                                };
                                setFormData({ ...formData, items: updated });
                              }}
                              placeholder="الكمية"
                              className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-white font-mono text-center font-bold"
                            />
                            <span className="text-[11px] text-neutral-400 font-mono w-8">
                              {it.unit}
                            </span>
                          </div>

                          <div className="w-28 font-mono text-neutral-300 text-left">
                            {it.totalEstimate?.toLocaleString()} {t.currency}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-neutral-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Estimated Cost Strip */}
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">القيمة التقديرية لإجمالي الطلبية:</span>
                <span className="text-base font-bold font-mono text-amber-400 tabular-nums">
                  {totalEstimatedAmount.toLocaleString()} {t.currency}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  تعليمات وملاحظات التسليم للمورد:
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثال: يرجى تسليم اللحم بارداً بشاحنة تبريد الساعة 07:30 صباحاً..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrder('draft')}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700"
                >
                  حفظ كمسودة
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrder('sent')}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
                >
                  حفظ واعتماد الطلبية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Purchase Order Confirmation Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="تأكيد حذف طلبية التوريد"
        message="هل أنت متأكد من رغبتك في حذف طلبية التوريد هذه نهائياً؟"
        onConfirm={handleConfirmDelete}
        onClose={() => setOrderToDelete(null)}
      />

      {/* Convert Order to Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={!!orderToConvert}
        variant="primary"
        title="تأكيد استلام الطلبية للمخزون"
        message={`تأكيد استلام الطلبية رقم (${orderToConvert?.orderNumber || ''}): سيتم تحويلها مباشرة إلى فاتورة توريد وإضافة الكميات تلقائياً إلى رصيد المخزون.`}
        confirmLabel="استلام وتوليد فاتورة"
        onConfirm={handleConfirmConvertToInvoice}
        onClose={() => setOrderToConvert(null)}
      />
    </div>
  );
};
