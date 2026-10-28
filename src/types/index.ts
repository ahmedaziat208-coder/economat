export type Language = 'ar' | 'en' | 'fr';

export type MaterialCategory =
  | 'meats'
  | 'dairy_cheese'
  | 'vegetables_fruits'
  | 'bakery_bread'
  | 'beverages'
  | 'liquids_oils'
  | 'canned_dry'
  | 'sauces_spices'
  | 'packaging'
  | 'cleaning';

export type UnitType = 'kg' | 'g' | 'l' | 'cl' | 'ml' | 'piece' | 'box' | 'portion';

export interface Material {
  id: string;
  sku: string;
  barcode: string; // EAN-13, EAN-8, UPC
  name: string;
  nameFr?: string;
  nameEn?: string;
  category: MaterialCategory;
  unit: UnitType;
  fexPrice: number; // Prix FEX de référence (seuil d'alerte)
  purchasePrice: number; // Dernier prix d'achat HT
  unitCost: number; // Coût unitaire réel
  currentStock: number;
  minStock: number; // Seuil de sécurité / réapprovisionnement
  maxStock: number;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  updatedAt: string;
}

export type MovementType =
  | 'in_purchase'
  | 'out_kitchen'
  | 'out_bar'
  | 'out_dish_sale'
  | 'out_waste'
  | 'adjustment_positive'
  | 'adjustment_negative'
  | 'audit_reconciliation';

export interface StockMovement {
  id: string;
  date: string;
  materialId: string;
  type: MovementType;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  referenceId?: string; // invoiceId, saleId, wasteId, auditId
  reason?: string;
  operatorName?: string;
}

export type WasteReason =
  | 'expired'
  | 'storage_damage'
  | 'breakage'
  | 'prep_defect'
  | 'temperature_abuse'
  | 'other';

export interface WasteRecord {
  id: string;
  date: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  reason: WasteReason;
  department: 'cuisine' | 'bar' | 'stock';
  notes?: string;
  reportedBy: string;
}

export interface ConsumptionRecord {
  id: string;
  date: string;
  department: 'cuisine' | 'bar';
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  shift: 'morning' | 'evening' | 'full';
  notes?: string;
  requestedBy?: string;
}

export interface RecipeIngredient {
  materialId: string;
  quantity: number;
  unit: UnitType;
  notes?: string;
}

export interface CompositeItem {
  dishId: string; // Reference to another Fiche Technique (e.g. Pain Cheesena or Sauce Maison)
  quantity: number; // Number of portions needed
}

export type DishCategory =
  | 'burger'
  | 'pizza'
  | 'main'
  | 'appetizer'
  | 'dessert'
  | 'cocktail'
  | 'coffee'
  | 'sub_recipe';

export interface FicheTechnique {
  id: string;
  code: string;
  name: string;
  nameFr?: string;
  category: DishCategory;
  department: 'cuisine' | 'bar';
  portions: number;
  prepTimeMin: number;
  cookTimeMin: number;
  sellingPrice: number; // Prix de vente TTC
  tvaRate: number; // e.g. 10 or 19%
  ingredients: RecipeIngredient[];
  compositeItems?: CompositeItem[];
  steps: string[];
  equipment: string[];
  allergens: string[]; // Gluten, Lait, Oeufs, Crustacés, etc.
  notes?: string;
  photoUrl?: string;
  updatedAt: string;
}

export interface DishSale {
  id: string;
  date: string;
  dishId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  calculatedCost: number;
  grossProfit: number;
  marginPercent: number;
  department: 'cuisine' | 'bar';
  autoDeducted: boolean;
  notes?: string;
}

export interface InvoiceItem {
  materialId: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  items: InvoiceItem[];
  subtotalHT: number;
  tvaRate: number; // e.g., 19% or custom
  tvaAmount: number;
  totalTTC: number;
  status: 'paid' | 'pending' | 'partially_paid';
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit';
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  address?: string;
  deliveryDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  rib?: string; // Relevé d'identité bancaire
  taxId?: string; // Matricule fiscal / NIF
  categorySpecialty?: string;
  notes?: string;
  active: boolean;
}

export interface StockAuditItem {
  materialId: string;
  systemStock: number;
  countedStock: number;
  variance: number; // countedStock - systemStock
  unitPrice: number;
  varianceValue: number; // variance * unitPrice
  notes?: string;
}

export interface StockAudit {
  id: string;
  auditNumber: string;
  date: string;
  auditorName: string;
  status: 'draft' | 'completed' | 'reconciled';
  department?: 'cuisine' | 'bar' | 'all';
  items: StockAuditItem[];
  totalPositiveVarianceValue: number;
  totalNegativeVarianceValue: number;
  netVarianceValue: number;
  reconciledAt?: string;
  notes?: string;
}

export interface WhatsAppLog {
  id: string;
  date: string;
  recipientName: string;
  recipientPhone: string;
  type: 'order' | 'inquiry' | 'payment' | 'general';
  message: string;
}

export interface CloudflareConfig {
  workerUrl: string;
  apiToken: string;
  autoSync: boolean;
  lastSync?: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastError?: string;
}

export interface PurchaseOrderItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  totalEstimate: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // e.g. BDC-2026-001
  createdAt: string;
  requestedDeliveryDate?: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  totalEstimatedAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled';
  notes?: string;
  sentViaWhatsApp?: boolean;
}

export interface RestaurantDatabase {
  version: string;
  lastBackupDate: string;
  materials: Material[];
  movements: StockMovement[];
  wasteRecords: WasteRecord[];
  consumptionRecords: ConsumptionRecord[];
  recipes: FicheTechnique[];
  dishSales: DishSale[];
  invoices: SupplierInvoice[];
  suppliers: Supplier[];
  audits: StockAudit[];
  whatsappLogs: WhatsAppLog[];
  purchaseOrders: PurchaseOrder[];
  cloudflareConfig: CloudflareConfig;
  currency?: string;
}

export type UserRole = 'admin' | 'manager' | 'stock_officer' | 'cashier';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  loginMethod: 'firebase' | 'master_password' | 'pin';
  loginAt: string;
}
