import React, { useState, useEffect } from 'react';
import { Language, Material, Supplier, FicheTechnique, SupplierInvoice, StockAudit, PurchaseOrder } from './types';
import { translations } from './i18n/translations';
import { dbService } from './services/db';
import { Header } from './components/Header';
import { Sidebar, ViewTab } from './components/Sidebar';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { PrintDocumentModal, PrintableDocType } from './components/PrintDocumentModal';

// Views
import { DashboardView } from './views/DashboardView';
import { MaterialsView } from './views/MaterialsView';
import { StockMovementsView } from './views/StockMovementsView';
import { RecipesView } from './views/RecipesView';
import { PosSalesView } from './views/PosSalesView';
import { ConsumptionView } from './views/ConsumptionView';
import { WasteView } from './views/WasteView';
import { InvoicesView } from './views/InvoicesView';
import { SuppliersView } from './views/SuppliersView';
import { PurchaseOrdersView } from './views/PurchaseOrdersView';
import { StocktakingView } from './views/StocktakingView';
import { ReportsView } from './views/ReportsView';
import { CloudDbView } from './views/CloudDbView';
import { LoginView } from './views/LoginView';
import { authService } from './services/auth';
import { AuthUser } from './types';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setDbVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());

  // Subscribe to auth state
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // Modals state
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [selectedWhatsAppSupplier, setSelectedWhatsAppSupplier] = useState<Supplier | null>(null);
  const [whatsAppInitialMessage, setWhatsAppInitialMessage] = useState<string | undefined>(undefined);
  const [printableDoc, setPrintableDoc] = useState<PrintableDocType | null>(null);

  // Subscribe to DB mutations
  useEffect(() => {
    const unsubscribe = dbService.subscribe(() => {
      setDbVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Update HTML dir and lang attributes on language change
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang];
  const db = dbService.getSnapshot();
  const lowStockCount = db.materials.filter((m) => m.currentStock <= m.minStock).length;

  const handleScanResult = (barcode: string, foundMaterial?: Material) => {
    setScannedCode(barcode);
    setCurrentTab('materials');
  };

  const handleOpenWhatsAppForMaterial = (material: Material) => {
    const supplier = db.suppliers.find((s) => s.id === material.supplierId) || db.suppliers[0];
    if (supplier) {
      setWhatsAppInitialMessage(undefined);
      setSelectedWhatsAppSupplier(supplier);
    }
  };

  const handleOpenWhatsAppForOrder = (order: PurchaseOrder, supplier: Supplier) => {
    const cur = translations[lang].currency;
    const itemsText = order.items
      .map((it, idx) => `${idx + 1}. ${it.materialName}: ${it.quantity} ${it.unit} (~${it.totalEstimate} ${cur})`)
      .join('\n');
    const msg = `السلام عليكم ورحمة الله،\nسيد ${supplier.name} (${supplier.companyName})،\n\nنود تأكيد طلبية التوريد رقم: ${order.orderNumber}\nالمطلوب تسليمها بتاريخ: ${order.requestedDeliveryDate || 'في أقرب وقت'}\n\nقائمة المواد المطلوبة:\n${itemsText}\n\nالقيمة التقديرية: ${order.totalEstimatedAmount.toLocaleString()} ${cur}\n${order.notes ? `ملاحظات وتعليمات: ${order.notes}\n` : ''}\nنرجو تأكيد موعد وصول الشاحنة.\nمع الشكر، إدارة مطعم OBAYOLI.`;

    setWhatsAppInitialMessage(msg);
    setSelectedWhatsAppSupplier(supplier);
  };

  const getViewTitle = (): string => {
    switch (currentTab) {
      case 'dashboard':
        return t.dashboard;
      case 'materials':
        return t.materials;
      case 'stock_movements':
        return t.stockMovements;
      case 'recipes':
        return t.recipes;
      case 'pos_sales':
        return t.posSales;
      case 'consumption':
        return t.consumption;
      case 'waste':
        return t.waste;
      case 'invoices':
        return t.invoices;
      case 'suppliers':
        return t.suppliers;
      case 'purchase_orders':
        return t.purchaseOrders;
      case 'stocktaking':
        return t.stocktaking;
      case 'reports':
        return t.reports;
      case 'cloud_db':
        return t.cloudDb;
      default:
        return t.dashboard;
    }
  };

  const handleExportJson = () => {
    const dataStr = dbService.exportDatabaseJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obayoli_restaurant_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // If user is not logged in, show the Login View with Password / Firebase Auth
  if (!currentUser) {
    return (
      <LoginView
        lang={lang}
        onLanguageChange={setLang}
        onLoginSuccess={() => setCurrentUser(authService.getCurrentUser())}
      />
    );
  }

  const handleSelectTab = (tab: ViewTab) => {
    if (tab !== 'materials') {
      setScannedCode('');
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-amber-500 selection:text-neutral-950">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          lang={lang}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          lowStockCount={lowStockCount}
          currentUser={currentUser}
          onLogout={() => authService.logout()}
          onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header */}
          <Header
            lang={lang}
            onLanguageChange={setLang}
            activeViewTitle={getViewTitle()}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onPrintClick={() => window.print()}
            onExportClick={handleExportJson}
            currentUser={currentUser}
            onLogout={() => authService.logout()}
          />

          {/* View Container */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                lang={lang}
                onNavigate={handleSelectTab}
                onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
                onOpenWhatsApp={handleOpenWhatsAppForMaterial}
              />
            )}

            {currentTab === 'materials' && (
              <MaterialsView
                lang={lang}
                onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
                scannedCode={scannedCode}
                onClearScannedCode={() => setScannedCode('')}
              />
            )}

            {currentTab === 'stock_movements' && <StockMovementsView lang={lang} />}

            {currentTab === 'recipes' && (
              <RecipesView
                lang={lang}
                onPrintRecipe={(recipe: FicheTechnique) =>
                  setPrintableDoc({ type: 'recipe', data: recipe })
                }
              />
            )}

            {currentTab === 'pos_sales' && <PosSalesView lang={lang} />}

            {currentTab === 'consumption' && <ConsumptionView lang={lang} />}

            {currentTab === 'waste' && <WasteView lang={lang} />}

            {currentTab === 'invoices' && (
              <InvoicesView
                lang={lang}
                onPrintInvoice={(inv: SupplierInvoice) =>
                  setPrintableDoc({ type: 'invoice', data: inv })
                }
              />
            )}

            {currentTab === 'suppliers' && (
              <SuppliersView
                lang={lang}
                onOpenWhatsApp={(sup: Supplier) => {
                  setWhatsAppInitialMessage(undefined);
                  setSelectedWhatsAppSupplier(sup);
                }}
              />
            )}

            {currentTab === 'purchase_orders' && (
              <PurchaseOrdersView
                lang={lang}
                onPrintOrder={(order: PurchaseOrder) =>
                  setPrintableDoc({ type: 'purchase_order', data: order })
                }
                onSendWhatsApp={handleOpenWhatsAppForOrder}
              />
            )}

            {currentTab === 'stocktaking' && (
              <StocktakingView
                lang={lang}
                onPrintAudit={(audit: StockAudit) =>
                  setPrintableDoc({ type: 'audit', data: audit })
                }
              />
            )}

            {currentTab === 'reports' && <ReportsView lang={lang} />}

            {currentTab === 'cloud_db' && <CloudDbView lang={lang} />}
          </main>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScanResult={handleScanResult}
        materials={db.materials}
        lang={lang}
      />

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={!!selectedWhatsAppSupplier}
        onClose={() => {
          setSelectedWhatsAppSupplier(null);
          setWhatsAppInitialMessage(undefined);
        }}
        supplier={selectedWhatsAppSupplier}
        initialMessage={whatsAppInitialMessage}
        lang={lang}
      />

      {/* Printable Document Modal */}
      <PrintDocumentModal
        isOpen={!!printableDoc}
        onClose={() => setPrintableDoc(null)}
        document={printableDoc}
        lang={lang}
      />
    </div>
  );
}
