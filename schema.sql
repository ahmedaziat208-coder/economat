-- OBAYOLI Database Schema for Cloudflare D1 / SQLite
-- Run: npx wrangler d1 execute obayoli_prod --file=./schema.sql

-- 1. Database snapshots (instant sync & full backup)
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Materials & Inventory
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  fex_price REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  current_stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  max_stock REAL DEFAULT 0,
  supplier_id TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Stock Movements Log
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  material_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_value REAL NOT NULL,
  reference_id TEXT,
  reason TEXT,
  operator_name TEXT,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- 4. Technical Sheets (Fiches Techniques)
CREATE TABLE IF NOT EXISTS technical_sheets (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  portions INTEGER NOT NULL,
  selling_price REAL NOT NULL,
  total_cost REAL NOT NULL,
  portion_cost REAL NOT NULL,
  food_cost_percentage REAL NOT NULL,
  gross_margin REAL NOT NULL,
  ingredients TEXT NOT NULL, -- JSON array
  instructions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Supplier Invoices
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  total_ht REAL NOT NULL,
  total_tva REAL NOT NULL,
  total_ttc REAL NOT NULL,
  payment_status TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. POS Sales
CREATE TABLE IF NOT EXISTS pos_sales (
  id TEXT PRIMARY KEY,
  sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  ticket_number TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  total_cost REAL NOT NULL,
  margin REAL NOT NULL,
  cashier_name TEXT,
  FOREIGN KEY (recipe_id) REFERENCES technical_sheets(id)
);

-- 7. Waste & Loss
CREATE TABLE IF NOT EXISTS waste_records (
  id TEXT PRIMARY KEY,
  record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  material_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_cost REAL NOT NULL,
  reason TEXT NOT NULL,
  department TEXT NOT NULL,
  reported_by TEXT NOT NULL
);

-- 8. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  delivery_days TEXT,
  rib TEXT,
  tax_id TEXT,
  active BOOLEAN DEFAULT 1
);

-- 9. Purchase Orders (Bons de commande)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE,
  status TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
