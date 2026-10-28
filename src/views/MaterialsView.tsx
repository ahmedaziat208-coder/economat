import React, { useState, useEffect } from 'react';
import { Material, MaterialCategory, UnitType, Language } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Barcode as BarcodeIcon,
  AlertTriangle,
  Edit2,
  Trash2,
  SlidersHorizontal,
  X,
  Check,
  ArrowUpDown,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface MaterialsViewProps {
  lang: Language;
  onOpenBarcodeModal: () => void;
  scannedCode?: string;
  onClearScannedCode?: () => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  lang,
  onOpenBarcodeModal,
  scannedCode,
  onClearScannedCode,
}) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [searchQuery, setSearchQuery] = useState(scannedCode || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [isRestoreDemoModalOpen, setIsRestoreDemoModalOpen] = useState(false);

  // Adjustment Modal
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('تسوية دورية / تصحيح خطأ إدخال');
  const [operatorName, setOperatorName] = useState('أمين المخزن');

  // Form State for Add/Edit
  const initialFormState = {
    sku: '',
    barcode: '',
    name: '',
    nameFr: '',
    category: 'meats' as MaterialCategory,
    unit: 'kg' as UnitType,
    fexPrice: 0,
    purchasePrice: 0,
    unitCost: 0,
    currentStock: 0,
    minStock: 5,
    maxStock: 50,
    supplierId: '',
    supplierName: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [supplierInputMode, setSupplierInputMode] = useState<'manual' | 'select'>('manual');

  // Auto sync when scannedCode changes from Barcode Scanner
  useEffect(() => {
    if (scannedCode) {
      setSearchQuery(scannedCode);
      const clean = scannedCode.trim();
      const match = db.materials.find(
        (m) =>
          m.barcode.trim() === clean ||
          m.sku.toLowerCase() === clean.toLowerCase()
      );
      if (!match) {
        // Automatically open Add modal with the scanned barcode pre-filled
        setEditingMaterial(null);
        setFormData({
          ...initialFormState,
          barcode: clean,
          sku: 'MAT-' + (clean.length >= 4 ? clean.slice(-4) : Math.floor(1000 + Math.random() * 9000)),
        });
        setIsAddModalOpen(true);
      }
    }
  }, [scannedCode]);

  // Filter materials
  const filteredMaterials = db.materials.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.nameFr && m.nameFr.toLowerCase().includes(q)) ||
      m.sku.toLowerCase().includes(q) ||
      m.barcode.includes(q);

    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setFormData({
      ...initialFormState,
      sku: '',
      barcode: '613' + Math.floor(1000000000 + Math.random() * 9000000000),
      supplierId: '',
      supplierName: '',
    });
    setSupplierInputMode('manual');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (m: Material) => {
    setEditingMaterial(m);
    const existingSup = db.suppliers.find((s) => s.id === m.supplierId);
    const supName = m.supplierName || existingSup?.companyName || existingSup?.name || '';
    setFormData({
      sku: m.sku,
      barcode: m.barcode,
      name: m.name,
      nameFr: m.nameFr || '',
      category: m.category,
      unit: m.unit,
      fexPrice: m.fexPrice,
      purchasePrice: m.purchasePrice,
      unitCost: m.unitCost,
      currentStock: m.currentStock,
      minStock: m.minStock,
      maxStock: m.maxStock,
      supplierId: m.supplierId || '',
      supplierName: supName,
      notes: m.notes || '',
    });
    setSupplierInputMode(supName ? 'manual' : 'select');
    setIsAddModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    let finalSupplierId = formData.supplierId;
    const cleanSupplierName = formData.supplierName.trim();

    if (cleanSupplierName) {
      // Find matching existing supplier by companyName or name
      const matchedSup = db.suppliers.find(
        (s) =>
          s.companyName.toLowerCase() === cleanSupplierName.toLowerCase() ||
          s.name.toLowerCase() === cleanSupplierName.toLowerCase()
      );
      if (matchedSup) {
        finalSupplierId = matchedSup.id;
      } else if (!finalSupplierId) {
        // Auto-register new supplier so it is available across all views
        const newSup = dbService.saveSupplier({
          name: cleanSupplierName,
          companyName: cleanSupplierName,
          phone: '',
          deliveryDays: [0, 1, 2, 3, 4, 5, 6],
          active: true,
          notes: 'تمت إضافته تلقائياً عند تسجيل المادة',
        });
        finalSupplierId = newSup.id;
      }
    } else {
      finalSupplierId = '';
    }

    dbService.saveMaterial({
      id: editingMaterial ? editingMaterial.id : undefined,
      sku: formData.sku,
      barcode: formData.barcode,
      name: formData.name,
      nameFr: formData.nameFr,
      category: formData.category,
      unit: formData.unit,
      fexPrice: Number(formData.fexPrice),
      purchasePrice: Number(formData.purchasePrice),
      unitCost: Number(formData.unitCost || formData.purchasePrice),
      currentStock: Number(formData.currentStock),
      minStock: Number(formData.minStock),
      maxStock: Number(formData.maxStock),
      supplierId: finalSupplierId || undefined,
      supplierName: cleanSupplierName || undefined,
      notes: formData.notes,
    });

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (materialToDelete) {
      dbService.deleteMaterial(materialToDelete);
      setMaterialToDelete(null);
    }
  };

  const handleOpenAdjust = (m: Material) => {
    setAdjustingMaterial(m);
    setNewStockValue(m.currentStock);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    dbService.adjustStock(adjustingMaterial.id, Number(newStockValue), adjustReason, operatorName);
    setAdjustingMaterial(null);
  };

  return (
    <div className="space-y-5">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pr-9 pl-4 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (onClearScannedCode) onClearScannedCode();
                }}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onOpenBarcodeModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors shrink-0"
            title={t.barcodeScan}
          >
            <BarcodeIcon className="w-4 h-4" />
            <span className="hidden md:inline">{t.barcodeScan}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الأصناف ({db.materials.length})</option>
            <option value="meats">{t.cat_meats}</option>
            <option value="dairy_cheese">{t.cat_dairy_cheese}</option>
            <option value="vegetables_fruits">{t.cat_vegetables_fruits}</option>
            <option value="bakery_bread">{t.cat_bakery_bread}</option>
            <option value="beverages">{t.cat_beverages}</option>
            <option value="liquids_oils">{t.cat_liquids_oils}</option>
            <option value="sauces_spices">{t.cat_sauces_spices}</option>
            <option value="canned_dry">{t.cat_canned_dry}</option>
            <option value="packaging">{t.cat_packaging}</option>
          </select>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewMaterial}</span>
          </button>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        {filteredMaterials.length === 0 ? (
          db.materials.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-2xl">
                📦
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">لا توجد مواد مسجلة حالياً في قاعدة البيانات</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  تم تفريغ المواد سابقاً. يمكنك البدء الآن بإضافة موادك الخاصة من الصفر، أو استعادة القائمة النموذجية المجهزة بـ 12 مادة مع الباركود ورصيد المخزون وأسعار الشراء بالدرهم المغربي.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مادة أولية جديدة</span>
                </button>
                <button
                  onClick={() => setIsRestoreDemoModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-neutral-800 text-amber-400 border border-neutral-700 hover:bg-neutral-750 hover:border-amber-500/40 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>استرجاع المواد النموذجية (12 مادة)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 text-xl">
                🔍
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">لم يتم العثور على مواد مطابقة</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `لا توجد مادة تطابق عبارة البحث "${searchQuery}" أو التصنيف المختار.`
                    : 'لا توجد مواد مسجلة ضمن هذا التصنيف.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  if (onClearScannedCode) onClearScannedCode();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>إلغاء التصفية وعرض جميع المواد ({db.materials.length})</span>
              </button>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
                  <th className="py-3 px-4 font-semibold">{t.materialName}</th>
                  <th className="py-3 px-4 font-semibold">{t.barcode}</th>
                  <th className="py-3 px-4 font-semibold">{t.category}</th>
                  <th className="py-3 px-4 font-semibold">{t.fexPrice}</th>
                  <th className="py-3 px-4 font-semibold">{t.purchasePrice}</th>
                  <th className="py-3 px-4 font-semibold">{t.currentStock}</th>
                  <th className="py-3 px-4 font-semibold">{t.minStock}</th>
                  <th className="py-3 px-4 font-semibold text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredMaterials.map((mat) => {
                  const isPriceExceeded = mat.fexPrice > 0 && mat.purchasePrice > mat.fexPrice;
                  const isLowStock = mat.currentStock <= mat.minStock;

                  return (
                    <tr
                      key={mat.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        isLowStock ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-100">{mat.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{mat.sku}</span>
                          {mat.nameFr && <span>· {mat.nameFr}</span>}
                          {(() => {
                            const sup = db.suppliers.find((s) => s.id === mat.supplierId);
                            const supDisplay = mat.supplierName || sup?.companyName || sup?.name;
                            if (supDisplay) {
                              return (
                                <span className="inline-flex items-center gap-0.5 text-amber-400/90 bg-amber-500/10 px-1.5 py-0.2 rounded font-sans text-[10px]">
                                  🏢 {supDisplay}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="py-3 px-4 font-mono text-neutral-300">
                        <span className="bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-[11px]">
                          {mat.barcode}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-neutral-400">
                        {t[`cat_${mat.category}` as keyof typeof t] || mat.category}
                      </td>

                      {/* FEX Price */}
                      <td className="py-3 px-4 font-mono text-neutral-300 tabular-nums">
                        {mat.fexPrice} {t.currency}
                      </td>

                      {/* Purchase Price with Alert */}
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className={isPriceExceeded ? 'text-rose-400 font-bold' : 'text-neutral-200'}>
                            {mat.purchasePrice} {t.currency}
                          </span>
                          {isPriceExceeded && (
                            <span
                              title={t.fexAlertExceeded}
                              className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.2 rounded font-sans"
                            >
                              تجاوز FEX!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 font-mono font-bold tabular-nums">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            isLowStock
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'text-neutral-100'
                          }`}
                        >
                          {mat.currentStock} {mat.unit}
                        </span>
                      </td>

                      {/* Min Stock */}
                      <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                        {mat.minStock} {mat.unit}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAdjust(mat)}
                            title="تسوية رصيد المخزون"
                            className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(mat)}
                            title={t.edit}
                            className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setMaterialToDelete(mat.id)}
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

      {/* Add / Edit Material Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingMaterial ? t.editMaterial : t.addNewMaterial}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.materialName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: لحم مفروم بلاك أنغوس"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>


                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.barcode} (EAN-13 / UPC)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.sku}
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="مثال: Candia / Monin / الماركة التجارية"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.category}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as MaterialCategory })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="meats">{t.cat_meats}</option>
                    <option value="dairy_cheese">{t.cat_dairy_cheese}</option>
                    <option value="vegetables_fruits">{t.cat_vegetables_fruits}</option>
                    <option value="bakery_bread">{t.cat_bakery_bread}</option>
                    <option value="beverages">{t.cat_beverages}</option>
                    <option value="liquids_oils">{t.cat_liquids_oils}</option>
                    <option value="sauces_spices">{t.cat_sauces_spices}</option>
                    <option value="canned_dry">{t.cat_canned_dry}</option>
                    <option value="packaging">{t.cat_packaging}</option>
                    <option value="cleaning">{t.cat_cleaning}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.unit}
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value as UnitType })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="kg">{t.unit_kg}</option>
                    <option value="g">{t.unit_g}</option>
                    <option value="l">{t.unit_l}</option>
                    <option value="cl">{t.unit_cl}</option>
                    <option value="piece">{t.unit_piece}</option>
                    <option value="box">{t.unit_box}</option>
                    <option value="portion">{t.unit_portion}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.fexPrice} ({t.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fexPrice}
                    onChange={(e) => setFormData({ ...formData, fexPrice: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    {t.fexPriceHelp}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.purchasePrice} ({t.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, purchasePrice: Number(e.target.value) })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.currentStock}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.currentStock}
                    onChange={(e) =>
                      setFormData({ ...formData, currentStock: Number(e.target.value) })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.minStock} (حد الأمان)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: Number(e.target.value) })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-200">
                    {t.supplier || 'المورد المعتمد'}
                  </label>
                  <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSupplierInputMode('manual')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        supplierInputMode === 'manual'
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      ✍️ إدخال يدوي
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupplierInputMode('select')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        supplierInputMode === 'select'
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      📋 اختيار من القائمة ({db.suppliers.length})
                    </button>
                  </div>
                </div>

                {supplierInputMode === 'manual' ? (
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type="text"
                        list="manual-suppliers-datalist"
                        value={formData.supplierName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matchedSup = db.suppliers.find(
                            (s) =>
                              s.companyName.toLowerCase() === val.trim().toLowerCase() ||
                              s.name.toLowerCase() === val.trim().toLowerCase()
                          );
                          setFormData({
                            ...formData,
                            supplierName: val,
                            supplierId: matchedSup ? matchedSup.id : '',
                          });
                        }}
                        placeholder="اكتب اسم المورد يدوياً (مثال: مورد اللحوم كريم، شركة الألبان الممتازة...)"
                        className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
                      />
                      <datalist id="manual-suppliers-datalist">
                        {db.suppliers.map((s) => (
                          <option key={s.id} value={s.companyName || s.name}>
                            {s.name}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                      <span>✓ يمكنك كتابة أي اسم مورد جديد يدوياً وسيتم حفظه وربطه بالمادة تلقائياً.</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const sup = db.suppliers.find((s) => s.id === sId);
                        setFormData({
                          ...formData,
                          supplierId: sId,
                          supplierName: sup ? sup.companyName || sup.name : '',
                        });
                      }}
                      className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="">بدون مورد محدد</option>
                      {db.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName} ({s.name}) {s.phone ? `· ${s.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

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
                  className="px-5 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Balance Modal */}
      {adjustingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-amber-500" />
                <span>{t.adjustStock}</span>
              </h3>
              <button
                onClick={() => setAdjustingMaterial(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5">
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
                <div className="font-semibold text-white">{adjustingMaterial.name}</div>
                <div className="text-neutral-400 mt-1">
                  الرصيد الحالي بالنظام: <strong className="text-amber-400 font-mono">{adjustingMaterial.currentStock} {adjustingMaterial.unit}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  الرصيد الفعلي الجديد ({adjustingMaterial.unit}):
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.adjustmentReason}:
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.operatorName}:
                </label>
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingMaterial(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400"
                >
                  تأكيد التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Material Confirmation Modal */}
      <ConfirmModal
        isOpen={!!materialToDelete}
        title="تأكيد حذف المادة"
        message={t.confirmDelete || 'هل أنت متأكد من رغبتك في حذف هذه المادة نهائياً؟'}
        onConfirm={handleConfirmDelete}
        onClose={() => setMaterialToDelete(null)}
      />

      {/* Restore Demo Materials Confirmation Modal */}
      <ConfirmModal
        isOpen={isRestoreDemoModalOpen}
        variant="primary"
        title="استرجاع المواد النموذجية"
        message="هل ترغب في استرجاع المواد الأولية الافتراضية المعتمدة (12 مادة)؟"
        confirmLabel="استرجاع المواد"
        onConfirm={() => {
          dbService.resetToDemoData();
          setIsRestoreDemoModalOpen(false);
        }}
        onClose={() => setIsRestoreDemoModalOpen(false)}
      />
    </div>
  );
};
