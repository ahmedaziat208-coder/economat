import React, { useState } from 'react';
import { Supplier, Language } from '../types';
import { translations } from '../i18n/translations';
import { Send, X, Phone, MessageSquare, Check, Sparkles } from 'lucide-react';
import { dbService } from '../services/db';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  initialMessage?: string;
  lang: Language;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  supplier,
  initialMessage,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen || !supplier) return null;

  const lowStockMaterials = dbService
    .getMaterials()
    .filter((m) => m.currentStock <= m.minStock && (!m.supplierId || m.supplierId === supplier.id));

  const initialItemsList = lowStockMaterials
    .map((m) => `- ${m.name}: كمية مطلوبة ${Math.ceil(m.minStock * 2)} ${m.unit}`)
    .join('\n');

  const defaultTemplates = [
    {
      title: 'طلبية توريد مواد مستعجلة',
      type: 'order' as const,
      text: `السلام عليكم ورحمة الله،\nسيد ${supplier.name} (${supplier.companyName})،\nنرجو تزويد مطعم OBAYOLI بالمواد التالية في أقرب وقت:\n${
        initialItemsList || '- المواد حسب الاتفاق'
      }\n\nنرجو تأكيد موعد وصول الشاحنة.\nمع الشكر والتقدير، إدارة مطعم OBAYOLI.`,
    },
    {
      title: 'استفسار عن الأسعار وفاتورة التوريد',
      type: 'inquiry' as const,
      text: `السلام عليكم سيد ${supplier.name}،\nنرجو موافاتنا بجدول أسعار الأسبوع الحالي وفاتورة التوريد الأخيرة مع تفاصيل الضريبة TVA.\nشكراً جزيلاً - مطعم OBAYOLI.`,
    },
    {
      title: 'إشعار تحويل بنكي / دفع مستحقات',
      type: 'payment' as const,
      text: `مرحباً سيد ${supplier.name}،\nتم تحويل مبلغ المستحقات لحسابكم البنكي (RIB: ${
        supplier.rib || '...'
      }). نرجو إرسال وصل الاستلام.\nشكراً لتعاونكم - مطعم OBAYOLI.`,
    },
  ];

  const [message, setMessage] = useState(initialMessage || defaultTemplates[0].text);
  const [phone, setPhone] = useState(supplier.phone);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(initialMessage ? -1 : 0);

  React.useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
      setSelectedTemplateIndex(-1);
    } else {
      setMessage(defaultTemplates[0].text);
      setSelectedTemplateIndex(0);
    }
    setPhone(supplier.phone);
  }, [initialMessage, supplier.id]);

  const handleSend = () => {
    // Clean phone number: remove non-digits except +
    const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Log to DB
    dbService.logWhatsApp({
      recipientName: `${supplier.name} (${supplier.companyName})`,
      recipientPhone: phone,
      type: defaultTemplates[selectedTemplateIndex].type,
      message,
    });

    // Open WhatsApp
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <span>إرسال طلبية ومراسلة عبر WhatsApp</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">{supplier.companyName}</div>
              <div className="text-neutral-400">{supplier.name} · {supplier.categorySpecialty}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {supplier.phone}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              رقم الهاتف المستلم (مع الرمز الدولي):
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono"
            />
          </div>

          {/* Quick templates */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              قوالب الرسائل الجاهزة:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {defaultTemplates.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateIndex(idx);
                    setMessage(tpl.text);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                    selectedTemplateIndex === idx
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Area */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              نص الرسالة:
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg p-3 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال عبر WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
