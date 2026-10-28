import React, { useState, useEffect } from 'react';
import { Language, SupplierInvoice, InvoiceItem } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import { Receipt, Plus, Printer, Trash2, Edit2, Search, X, Check, ArrowRight } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface InvoicesViewProps {
  lang: Language;
  onPrintInvoice: (invoice: SupplierInvoice) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ lang, onPrintInvoice }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  // Form State
  const initialForm = {
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: db.suppliers[0]?.id || '',
    items: [] as InvoiceItem[],
    tvaRate: 19,
    status: 'paid' as 'paid' | 'pending' | 'partially_paid',
    paymentMethod: 'bank_transfer' as 'cash' | 'bank_transfer' | 'check' | 'credit',
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const filteredInvoices = db.invoices.filter((inv) => {
    const sup = db.suppliers.find((s) => s.id === inv.supplierId);
    const q = search.toLowerCase().trim();
    return (
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (sup && sup.companyName.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingInvoice(null);
    const firstMat = db.materials[0];
    setFormData({
      ...initialForm,
      invoiceNumber: 'FAC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      items: firstMat
        ? [
            {
              materialId: firstMat.id,
              quantity: 10,
              unitPriceHT: firstMat.purchasePrice || 100,
              totalHT: (firstMat.purchasePrice || 100) * 10,
            },
          ]
        : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv: SupplierInvoice) => {
    setEditingInvoice(inv);
    setFormData({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      supplierId: inv.supplierId,
      items: inv.items.map((i) => ({ ...i })),
      tvaRate: inv.tvaRate,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      notes: inv.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (invoiceToDelete) {
      dbService.deleteInvoice(invoiceToDelete);
      setInvoiceToDelete(null);
    }
  };

  // Line item manipulation
  const addItemRow = () => {
    const firstMat = db.materials[0];
    if (!firstMat) return;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          materialId: firstMat.id,
          quantity: 5,
          unitPriceHT: firstMat.purchasePrice || 100,
          totalHT: (firstMat.purchasePrice || 100) * 5,
        },
      ],
    });
  };

  const removeItemRow = (idx: number) => {
    const updated = [...formData.items];
    updated.splice(idx, 1);
    setFormData({ ...formData, items: updated });
  };

  // Calculated Totals
  const subtotalHT = formData.items.reduce((acc, item) => acc + item.totalHT, 0);
  const tvaAmount = Number(((subtotalHT * formData.tvaRate) / 100).toFixed(2));
  const totalTTC = Number((subtotalHT + tvaAmount).toFixed(2));

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber || formData.items.length === 0) return;

    dbService.saveInvoice({
      id: editingInvoice ? editingInvoice.id : undefined,
      invoiceNumber: formData.invoiceNumber,
      date: formData.date,
      supplierId: formData.supplierId,
      items: formData.items,
      subtotalHT,
      tvaRate: formData.tvaRate,
      tvaAmount,
      totalTTC,
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم المورد..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pr-9 pl-4 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newInvoice}</span>
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                <th className="py-3 px-4 font-semibold">{t.invoiceNumber}</th>
                <th className="py-3 px-4 font-semibold">{t.date}</th>
                <th className="py-3 px-4 font-semibold">{t.supplier}</th>
                <th className="py-3 px-4 font-semibold">{t.subtotalHT}</th>
                <th className="py-3 px-4 font-semibold">TVA ({t.currency})</th>
                <th className="py-3 px-4 font-semibold">{t.totalTTC}</th>
                <th className="py-3 px-4 font-semibold">{t.paymentStatus}</th>
                <th className="py-3 px-4 font-semibold text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredInvoices.map((inv) => {
                const sup = db.suppliers.find((s) => s.id === inv.supplierId);
                return (
                  <tr key={inv.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-100">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {inv.date}
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-200">
                      {sup?.companyName || 'مورد عام'}
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-300 tabular-nums">
                      {inv.subtotalHT.toLocaleString()} {t.currency}
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                      {inv.tvaAmount.toLocaleString()} ({inv.tvaRate}%)
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-400 tabular-nums">
                      {inv.totalTTC.toLocaleString()} {t.currency}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {inv.status === 'paid' ? t.paid : t.pending}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onPrintInvoice(inv)}
                          title={t.printInvoice}
                          className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(inv)}
                          title={t.edit}
                          className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInvoiceToDelete(inv.id)}
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
      </div>

      {/* Add / Edit Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                <span>{editingInvoice ? 'تعديل فاتورة التوريد' : t.newInvoice}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.invoiceNumber} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceNumber: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.date} *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.supplier} *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {db.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} ({s.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Line Table */}
              <div className="space-y-2 border-t border-neutral-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400">
                    {t.invoiceItems}
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addItemToInvoice}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formData.items.map((item, idx) => {
                    const mat = db.materials.find((m) => m.id === item.materialId);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800 text-xs"
                      >
                        <select
                          value={item.materialId}
                          onChange={(e) => {
                            const newMat = db.materials.find((m) => m.id === e.target.value);
                            const updated = [...formData.items];
                            const price = newMat ? newMat.purchasePrice : item.unitPriceHT;
                            updated[idx] = {
                              ...updated[idx],
                              materialId: e.target.value,
                              unitPriceHT: price,
                              totalHT: Number((item.quantity * price).toFixed(2)),
                            };
                            setFormData({ ...formData, items: updated });
                          }}
                          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-white"
                        >
                          {db.materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            const updated = [...formData.items];
                            updated[idx] = {
                              ...updated[idx],
                              quantity: qty,
                              totalHT: Number((qty * item.unitPriceHT).toFixed(2)),
                            };
                            setFormData({ ...formData, items: updated });
                          }}
                          placeholder="الكمية"
                          className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-white font-mono text-center"
                        />

                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPriceHT}
                          onChange={(e) => {
                            const price = Number(e.target.value);
                            const updated = [...formData.items];
                            updated[idx] = {
                              ...updated[idx],
                              unitPriceHT: price,
                              totalHT: Number((item.quantity * price).toFixed(2)),
                            };
                            setFormData({ ...formData, items: updated });
                          }}
                          placeholder="سعر HT"
                          className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-white font-mono text-center"
                        />

                        <div className="w-24 font-mono font-bold text-neutral-200 text-left">
                          {item.totalHT.toLocaleString()} {t.currency}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-neutral-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Calculation Strip */}
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">المبلغ دون ضريبة (HT):</span>
                  <span className="text-base font-bold font-mono text-white">
                    {subtotalHT.toLocaleString()} {t.currency}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 block">نسبة الضريبة (TVA %):</span>
                  <input
                    type="number"
                    value={formData.tvaRate}
                    onChange={(e) =>
                      setFormData({ ...formData, tvaRate: Number(e.target.value) })
                    }
                    className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <span className="text-neutral-500 block">قيمة الضريبة (TVA):</span>
                  <span className="text-base font-bold font-mono text-neutral-300">
                    {tvaAmount.toLocaleString()} {t.currency}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 block">المجموع النهائي (TTC):</span>
                  <span className="text-lg font-bold font-mono text-amber-400">
                    {totalTTC.toLocaleString()} {t.currency}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.paymentStatus}:
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'paid' | 'pending' | 'partially_paid',
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="paid">{t.paid}</option>
                    <option value="pending">{t.pending}</option>
                    <option value="partially_paid">{t.partially_paid}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.paymentMethod}:
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value as any,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="bank_transfer">{t.pay_bank_transfer}</option>
                    <option value="check">{t.pay_check}</option>
                    <option value="cash">{t.pay_cash}</option>
                    <option value="credit">{t.pay_credit}</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors"
                >
                  حفظ الفاتورة وتحديث المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={!!invoiceToDelete}
        title="تأكيد حذف الفاتورة"
        message="هل أنت متأكد من حذف هذه الفاتورة نهائياً؟ سيتم عكس خصم الكميات من المخزون تلقائياً."
        onConfirm={handleConfirmDelete}
        onClose={() => setInvoiceToDelete(null)}
      />
    </div>
  );
};
