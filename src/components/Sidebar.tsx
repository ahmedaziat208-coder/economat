import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  UtensilsCrossed,
  ShoppingCart,
  Flame,
  Trash2,
  Receipt,
  Truck,
  ClipboardCheck,
  BarChart3,
  Database,
  X,
  PhoneCall,
  ShoppingBag,
  User,
  LogOut,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { AuthUser } from '../types';

export type ViewTab =
  | 'dashboard'
  | 'materials'
  | 'stock_movements'
  | 'recipes'
  | 'pos_sales'
  | 'consumption'
  | 'waste'
  | 'invoices'
  | 'suppliers'
  | 'purchase_orders'
  | 'stocktaking'
  | 'reports'
  | 'cloud_db';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  lowStockCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenBarcodeModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  lang,
  isOpen,
  onClose,
  lowStockCount,
  currentUser,
  onLogout,
  onOpenBarcodeModal,
}) => {
  const t = translations[lang];

  const navItems = [
    { id: 'dashboard' as ViewTab, label: t.dashboard, icon: LayoutDashboard },
    { 
      id: 'materials' as ViewTab, 
      label: t.materials, 
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'stock_movements' as ViewTab, label: t.stockMovements, icon: ArrowLeftRight },
    { id: 'recipes' as ViewTab, label: t.recipes, icon: UtensilsCrossed },
    { id: 'pos_sales' as ViewTab, label: t.posSales, icon: ShoppingCart },
    { id: 'consumption' as ViewTab, label: t.consumption, icon: Flame },
    { id: 'waste' as ViewTab, label: t.waste, icon: Trash2 },
    { id: 'invoices' as ViewTab, label: t.invoices, icon: Receipt },
    { id: 'suppliers' as ViewTab, label: t.suppliers, icon: Truck },
    { id: 'purchase_orders' as ViewTab, label: t.purchaseOrders, icon: ShoppingBag },
    { id: 'stocktaking' as ViewTab, label: t.stocktaking, icon: ClipboardCheck },
    { id: 'reports' as ViewTab, label: t.reports, icon: BarChart3 },
    { id: 'cloud_db' as ViewTab, label: t.cloudDb, icon: Database },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print fixed lg:static top-0 bottom-0 ${
          lang === 'ar' ? 'right-0' : 'left-0'
        } z-50 w-72 bg-neutral-900 border-x border-neutral-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen
            ? 'translate-x-0'
            : lang === 'ar'
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-lg">
              🍽️
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight leading-none">
                {t.brandName}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5 font-medium">
                {t.brandSubtitle}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {onOpenBarcodeModal && (
            <button
              onClick={() => {
                onOpenBarcodeModal();
                onClose();
              }}
              className="w-full mb-2.5 flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm group"
            >
              <div className="flex items-center gap-2.5">
                <BarcodeIcon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>{lang === 'ar' ? 'قارئ ومسح الباركود' : 'Scan Barcode'}</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                {lang === 'ar' ? 'كاميرا / USB' : 'Camera / USB'}
              </span>
            </button>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-right ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                    : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-neutral-950' : 'text-neutral-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      isActive
                        ? 'bg-neutral-950 text-amber-400'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & WhatsApp quick access */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/40 space-y-2">
          {currentUser && (
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono">
                    {currentUser.role === 'admin' ? 'المدير العام' : currentUser.role}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-neutral-800/60 border border-neutral-700/50 text-[11px] text-neutral-400 space-y-1">
            <div className="flex items-center justify-between font-semibold text-neutral-200">
              <span>نظام المطاعم المتكامل</span>
              <span className="text-[10px] text-amber-500">v1.2.0</span>
            </div>
            <div className="text-[10px] text-neutral-500 leading-relaxed">
              محمي بكلمة المرور وقاعدة بيانات سحابية
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
