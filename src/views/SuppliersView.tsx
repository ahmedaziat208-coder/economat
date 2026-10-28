import React, { useState, useEffect } from 'react';
import { Supplier, Language } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  Truck,
  Plus,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface SuppliersViewProps {
  lang: Language;
  onOpenWhatsApp: (supplier: Supplier) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ lang, onOpenWhatsApp }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  const initialForm = {
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    deliveryDays: [1, 3] as number[],
    rib: '',
    taxId: '',
    categorySpecialty: '',
    notes: '',
    active: true,
  };
  const [formData, setFormData] = useState(initialForm);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      companyName: sup.companyName,
      phone: sup.phone,
      email: sup.email || '',
      address: sup.address || '',
      deliveryDays: [...sup.deliveryDays],
      rib: sup.rib || '',
      taxId: sup.taxId || '',
      categorySpecialty: sup.categorySpecialty || '',
      notes: sup.notes || '',
      active: sup.active,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.phone) return;

    dbService.saveSupplier({
      id: editingSupplier ? editingSupplier.id : undefined,
      ...formData,
    });

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      dbService.deleteSupplier(supplierToDelete);
      setSupplierToDelete(null);
    }
  };

  const toggleDay = (dayIndex: number) => {
    let days = [...formData.deliveryDays];
    if (days.includes(dayIndex)) {
      days = days.filter((d) => d !== dayIndex);
    } else {
      days.push(dayIndex);
    }
    setFormData({ ...formData, deliveryDays: days.sort() });
  };

  const dayLabels = [
    t.day_0,
    t.day_1,
    t.day_2,
    t.day_3,
    t.day_4,
    t.day_5,
    t.day_6,
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold text-white">{t.suppliersTitle}</h2>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addSupplier}</span>
        </button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {db.suppliers.map((sup) => {
          const suppliedMaterials = db.materials.filter((m) => m.supplierId === sup.id);
          const supplierInvoices = db.invoices.filter((inv) => inv.supplierId === sup.id);

          return (
            <div
              key={sup.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white">{sup.companyName}</h3>
                    <div className="text-xs text-neutral-400 mt-0.5 font-medium">
                      المسؤول: {sup.name} · {sup.categorySpecialty}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                      sup.active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {sup.active ? t.active : t.inactive}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-mono tabular-nums text-neutral-200">{sup.phone}</span>
                  </div>

                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-neutral-400">{sup.email}</span>
                    </div>
                  )}

                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-neutral-400">{sup.address}</span>
                    </div>
                  )}

                  {sup.rib && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-mono text-[11px] text-neutral-400">RIB: {sup.rib}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Days Strip */}
                <div>
                  <div className="text-[10px] text-neutral-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{t.deliveryDays}:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dayLabels.map((dayName, idx) => {
                      const isDeliveryDay = sup.deliveryDays.includes(idx);
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isDeliveryDay
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                              : 'bg-neutral-950 text-neutral-600'
                          }`}
                        >
                          {dayName}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Stats: Supplied Materials & Invoices */}
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs flex justify-between text-neutral-400">
                  <span>المواد المرتبطة: <strong className="text-white">{suppliedMaterials.length}</strong></span>
                  <span>فواتير مسجلة: <strong className="text-white">{supplierInvoices.length}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                <button
                  onClick={() => onOpenWhatsApp(sup)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.sendWhatsAppOrder}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSupplierToDelete(sup.id)}
                    title={t.delete}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingSupplier ? 'تعديل بيانات المورد' : t.addSupplier}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.companyName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.contactPerson}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.phone} (مع كود الدولة) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+213..."
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.address}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Delivery Days Picker */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  {t.deliveryDays}:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {dayLabels.map((dayName, idx) => {
                    const isSelected = formData.deliveryDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-700 hover:text-white'
                        }`}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.bankRIB}
                  </label>
                  <input
                    type="text"
                    value={formData.rib}
                    onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.taxNumber}
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
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
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      <ConfirmModal
        isOpen={!!supplierToDelete}
        title="تأكيد حذف المورد"
        message={t.confirmDelete || 'هل أنت متأكد من رغبتك في حذف هذا المورد نهائياً؟'}
        onConfirm={handleConfirmDelete}
        onClose={() => setSupplierToDelete(null)}
      />
    </div>
  );
};
