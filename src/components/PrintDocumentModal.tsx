import { FicheTechnique, SupplierInvoice, StockAudit, Material, Supplier, Language, PurchaseOrder } from '../types';
import { translations } from '../i18n/translations';
import { Printer, X, Download } from 'lucide-react';
import { dbService } from '../services/db';

export type PrintableDocType =
  | { type: 'recipe'; data: FicheTechnique }
  | { type: 'invoice'; data: SupplierInvoice }
  | { type: 'audit'; data: StockAudit }
  | { type: 'purchase_order'; data: PurchaseOrder };

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: PrintableDocType | null;
  lang: Language;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  lang,
}) => {
  const t = translations[lang];
  if (!isOpen || !document) return null;

  const materials = dbService.getMaterials();
  const suppliers = dbService.getSuppliers();
  const recipes = dbService.getRecipes();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-white text-neutral-900 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
            <Printer className="w-4 h-4" />
            <span>معاينة الطباعة والمستند الرسمي (A4)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 md:p-12 text-sm leading-normal font-sans bg-white" id="printable-area">
          {/* Header of the Official Document */}
          <div className="border-b-2 border-neutral-900 pb-6 mb-6 flex items-start justify-between">
            <div>
              <div className="text-3xl font-black tracking-tight text-neutral-900">OBAYOLI</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-600 mt-0.5">
                Restaurant & Culinary Management ERP
              </div>
              <div className="text-xs text-neutral-500 mt-2 space-y-0.5">
                <div>الدار البيضاء، المملكة المغربية · هاتف: +212 522 00 11 22</div>
                <div>سجل تجاري / ICE: 001523456000089 · RC: 489211 Casablanca</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded border border-amber-200 inline-block">
                مستند معتمد للاستخدام الداخلي
              </div>
              <div className="text-xs text-neutral-500 mt-2">
                تاريخ الطباعة: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA')}
              </div>
            </div>
          </div>

          {/* 1. Recipe / Fiche Technique Content */}
          {document.type === 'recipe' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    البطاقة التقنية للمطبخ (Fiche Technique Cuisine)
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 mt-1">{document.data.name}</h2>
                  {document.data.nameFr && (
                    <div className="text-sm text-neutral-500 italic">{document.data.nameFr}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">كود الوصفة:</div>
                  <div className="text-base font-mono font-bold text-neutral-900">
                    {document.data.code}
                  </div>
                </div>
              </div>

              {/* Recipe Meta Strip */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
                <div>
                  <div className="text-xs text-neutral-500">عدد الحصص</div>
                  <div className="text-lg font-bold text-neutral-900 font-mono">
                    {document.data.portions}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">زمن التحضير والطهي</div>
                  <div className="text-lg font-bold text-neutral-900 font-mono">
                    {document.data.prepTimeMin + document.data.cookTimeMin} دقيقة
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">تكلفة المكونات (Food Cost)</div>
                  <div className="text-lg font-bold text-amber-700 font-mono">
                    {dbService.calculateRecipeFoodCost(document.data.id)} {t.currency}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">سعر البيع (TTC)</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono">
                    {document.data.sellingPrice} {t.currency}
                  </div>
                </div>
              </div>

              {/* Ingredients Table */}
              <div>
                <h3 className="font-bold text-base text-neutral-900 mb-3 border-b pb-1">
                  1. المكونات والمقادير الأولية
                </h3>
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-300">
                      <th className="py-2 px-3 font-semibold text-neutral-700">المادة</th>
                      <th className="py-2 px-3 font-semibold text-neutral-700">الكمية لكل حصة</th>
                      <th className="py-2 px-3 font-semibold text-neutral-700">سعر الوحدة</th>
                      <th className="py-2 px-3 font-semibold text-neutral-700">التكلفة الجزئية</th>
                      <th className="py-2 px-3 font-semibold text-neutral-700">ملاحظات التحضير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {document.data.ingredients.map((ing, i) => {
                      const mat = materials.find((m) => m.id === ing.materialId);
                      const subCost = mat ? ing.quantity * mat.unitCost : 0;
                      return (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium text-neutral-900">
                            {mat?.name || ing.materialId}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold">
                            {ing.quantity} {ing.unit}
                          </td>
                          <td className="py-2 px-3 font-mono text-neutral-600">
                            {mat?.unitCost || 0} {t.currency}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-neutral-900">
                            {subCost.toFixed(2)} {t.currency}
                          </td>
                          <td className="py-2 px-3 text-neutral-500">{ing.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Composite Sub-Recipes if any */}
              {document.data.compositeItems && document.data.compositeItems.length > 0 && (
                <div>
                  <h3 className="font-bold text-base text-neutral-900 mb-2 border-b pb-1">
                    2. الوصفات والمكونات المركبة (Sub-Recipes)
                  </h3>
                  <div className="space-y-1.5">
                    {document.data.compositeItems.map((comp, idx) => {
                      const sub = recipes.find((r) => r.id === comp.dishId);
                      const subCost = dbService.calculateRecipeFoodCost(comp.dishId);
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-2.5 bg-neutral-50 rounded border border-neutral-200 text-xs"
                        >
                          <div>
                            <span className="font-bold text-neutral-900">{sub?.name || comp.dishId}</span>
                            <span className="text-neutral-500 mr-2">({sub?.code})</span>
                          </div>
                          <div className="font-mono">
                            <span className="text-neutral-600">الكمية: {comp.quantity} حصة · </span>
                            <span className="font-bold text-neutral-900">
                              {(subCost * comp.quantity).toFixed(2)} {t.currency}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prep Steps & Equipment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <h3 className="font-bold text-base text-neutral-900 mb-2 border-b pb-1">
                    طريقة التحضير والطهي
                  </h3>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-neutral-700 leading-relaxed">
                    {document.data.steps.map((step, idx) => (
                      <li key={idx} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 mb-2 border-b pb-1">
                      المعدات والأدوات المطلوبة
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-neutral-700">
                      {document.data.equipment.map((eq, idx) => (
                        <li key={idx}>{eq}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-neutral-900 mb-2 border-b pb-1 text-rose-800">
                      مسببات الحساسية (Allergens)
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {document.data.allergens.map((alg, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-semibold"
                        >
                          ⚠️ {alg}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Supplier Invoice Content */}
          {document.type === 'invoice' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-xs font-bold text-neutral-500 uppercase">فاتورة توريد رسمية</div>
                  <h2 className="text-2xl font-bold text-neutral-900 mt-1">
                    {document.data.invoiceNumber}
                  </h2>
                </div>
                <div className="text-right text-xs">
                  <div>التاريخ: {document.data.date}</div>
                  <div>طريقة الدفع: {document.data.paymentMethod}</div>
                  <div className="font-bold text-emerald-700 mt-0.5">
                    الحالة: {document.data.status}
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              {(() => {
                const sup = suppliers.find((s) => s.id === document.data.supplierId);
                return (
                  <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-bold text-neutral-900 text-sm">
                        المورد: {sup?.companyName || 'مورد عام'}
                      </div>
                      <div className="text-neutral-600 mt-1">المسؤول: {sup?.name}</div>
                      <div className="text-neutral-600">العنوان: {sup?.address}</div>
                    </div>
                    <div className="text-right">
                      <div>الهاتف: {sup?.phone}</div>
                      <div>رقم الحساب (RIB): {sup?.rib || '-'}</div>
                      <div>رقم التعريف الجبائي: {sup?.taxId || '-'}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Items Table */}
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300">
                    <th className="py-2 px-3">المادة</th>
                    <th className="py-2 px-3">الكمية</th>
                    <th className="py-2 px-3">السعر دون ضريبة (HT)</th>
                    <th className="py-2 px-3">الإجمالي (HT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {document.data.items.map((item, i) => {
                    const mat = materials.find((m) => m.id === item.materialId);
                    return (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold">{mat?.name || item.materialId}</td>
                        <td className="py-2 px-3 font-mono font-bold">
                          {item.quantity} {mat?.unit}
                        </td>
                        <td className="py-2 px-3 font-mono">{item.unitPriceHT} {t.currency}</td>
                        <td className="py-2 px-3 font-mono font-bold">{item.totalHT} {t.currency}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs text-right border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">المجموع دون ضريبة (HT):</span>
                    <span className="font-mono font-bold">
                      {document.data.subtotalHT.toLocaleString()} {t.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">ضريبة القيمة المضافة ({document.data.tvaRate}%):</span>
                    <span className="font-mono text-neutral-700">
                      {document.data.tvaAmount.toLocaleString()} {t.currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-neutral-900 border-t pt-1.5">
                    <span>الإجمالي شامل الضريبة (TTC):</span>
                    <span className="font-mono text-emerald-700">
                      {document.data.totalTTC.toLocaleString()} {t.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Stock Audit Report */}
          {document.type === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-xs font-bold text-amber-800 uppercase">
                    محضر الجرد الفعلي للمخزون والتسويات
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 mt-1">
                    {document.data.auditNumber}
                  </h2>
                </div>
                <div className="text-right text-xs">
                  <div>تاريخ الجرد: {document.data.date}</div>
                  <div>المشرف على الجرد: {document.data.auditorName}</div>
                  <div className="font-bold text-neutral-900">الحالة: {document.data.status}</div>
                </div>
              </div>

              {/* Audit Table */}
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300">
                    <th className="py-2 px-3">المادة</th>
                    <th className="py-2 px-3">رصيد النظام</th>
                    <th className="py-2 px-3">الرصيد الفعلي</th>
                    <th className="py-2 px-3">الفارق</th>
                    <th className="py-2 px-3">سعر الوحدة</th>
                    <th className="py-2 px-3">قيمة الفارق</th>
                    <th className="py-2 px-3">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {document.data.items.map((item, i) => {
                    const mat = materials.find((m) => m.id === item.materialId);
                    return (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold">{mat?.name || item.materialId}</td>
                        <td className="py-2 px-3 font-mono">{item.systemStock}</td>
                        <td className="py-2 px-3 font-mono font-bold">{item.countedStock}</td>
                        <td
                          className={`py-2 px-3 font-mono font-bold ${
                            item.variance < 0
                              ? 'text-rose-700'
                              : item.variance > 0
                              ? 'text-emerald-700'
                              : 'text-neutral-600'
                          }`}
                        >
                          {item.variance > 0 ? `+${item.variance}` : item.variance}
                        </td>
                        <td className="py-2 px-3 font-mono">{item.unitPrice} {t.currency}</td>
                        <td className="py-2 px-3 font-mono font-bold">
                          {item.varianceValue.toFixed(2)} {t.currency}
                        </td>
                        <td className="py-2 px-3 text-neutral-500">{item.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary */}
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 flex justify-between text-xs font-mono font-semibold">
                <div>إجمالي العجز (نقص): {document.data.totalNegativeVarianceValue} {t.currency}</div>
                <div>إجمالي الفائض (زيادة): {document.data.totalPositiveVarianceValue} {t.currency}</div>
                <div className="font-bold text-neutral-900">
                  صافي فارق الجرد: {document.data.netVarianceValue} {t.currency}
                </div>
              </div>
            </div>
          )}

          {/* 4. Purchase Order (Bon de Commande Fournisseur) */}
          {document.type === 'purchase_order' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    سند طلب توريد مواد / Bon de Commande Fournisseur
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
                    {document.data.orderNumber}
                  </h2>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <div>تاريخ إنشاء الطلبية: {new Date(document.data.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA')}</div>
                  <div>
                    تاريخ التسليم المطلوب:{' '}
                    <strong className="text-neutral-900">{document.data.requestedDeliveryDate || 'في أقرب وقت'}</strong>
                  </div>
                  <div className="font-bold text-neutral-900">
                    الحالة:{' '}
                    <span className="font-sans px-2 py-0.5 bg-neutral-100 rounded border border-neutral-300">
                      {document.data.status === 'draft'
                        ? 'مسودة'
                        : document.data.status === 'sent'
                        ? 'تم الإرسال للمورد'
                        : document.data.status === 'confirmed'
                        ? 'مؤكدة'
                        : document.data.status === 'delivered'
                        ? 'تم الاستلام'
                        : 'ملغاة'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              {(() => {
                const sup = suppliers.find((s) => s.id === document.data.supplierId);
                return (
                  <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-bold text-neutral-900 text-sm">
                        المورد: {sup?.companyName || 'مورد عام'}
                      </div>
                      <div className="text-neutral-600 mt-1">المسؤول: {sup?.name}</div>
                      <div className="text-neutral-600">العنوان: {sup?.address || 'غير محدد'}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div>الهاتف: {sup?.phone || '-'}</div>
                      <div>رقم الحساب (RIB): {sup?.rib || '-'}</div>
                      <div>رقم التعريف الجبائي: {sup?.taxId || '-'}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Order Items Table */}
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300">
                    <th className="py-2 px-3 font-semibold text-neutral-700">#</th>
                    <th className="py-2 px-3 font-semibold text-neutral-700">المادة المطلوبة</th>
                    <th className="py-2 px-3 font-semibold text-neutral-700">الكمية المطلوبة</th>
                    <th className="py-2 px-3 font-semibold text-neutral-700">السعر التقديري</th>
                    <th className="py-2 px-3 font-semibold text-neutral-700">الإجمالي التقديري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {document.data.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 text-neutral-500 font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-semibold text-neutral-900">
                        {item.materialName}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {item.estimatedPrice.toLocaleString()} {t.currency}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-neutral-900">
                        {item.totalEstimate.toLocaleString()} {t.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Estimated Total */}
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <span className="font-semibold text-neutral-700">
                  القيمة التقديرية لإجمالي سند الطلب:
                </span>
                <span className="text-base font-bold font-mono text-emerald-800">
                  {document.data.totalEstimatedAmount.toLocaleString()} {t.currency}
                </span>
              </div>

              {/* Notes */}
              {document.data.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
                  <div className="font-bold text-amber-900 mb-1">تعليمات وشروط التسليم:</div>
                  <div className="text-neutral-700 whitespace-pre-wrap">{document.data.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Signature Footer */}
          <div className="mt-12 pt-8 border-t border-neutral-300 grid grid-cols-2 text-xs text-neutral-600">
            <div>
              <div className="font-semibold text-neutral-900">توقيع مسؤول المخزن / المطبخ:</div>
              <div className="h-14"></div>
              <div className="border-t border-neutral-400 w-48"></div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-neutral-900">مصادقة الإدارة العامة للمطعم:</div>
              <div className="h-14"></div>
              <div className="border-t border-neutral-400 w-48 mr-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
