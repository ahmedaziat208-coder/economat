export const CLOUDFLARE_WORKER_TS = `/**
 * OBAYOLI Restaurant ERP - Cloudflare Worker API
 * Deploy this on Cloudflare Workers with D1 Database or KV storage.
 * Provides high-speed, edge-cached REST API for restaurant inventory.
 */

export interface Env {
  DB: D1Database; // Cloudflare D1 SQL Database binding
  API_SECRET: string; // Set via: wrangler secret put API_SECRET
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');

    // Optional token validation if API_SECRET is set
    if (env.API_SECRET && authHeader !== \`Bearer \${env.API_SECRET}\`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    try {
      // 1. Health check & status
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({
          status: 'online',
          server: 'Cloudflare Workers (Edge)',
          system: 'OBAYOLI Restaurant & Inventory',
          timestamp: new Date().toISOString()
        }), { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
      }

      // 2. Full Database Sync (GET = download, POST = upload/merge)
      if (url.pathname === '/api/sync') {
        if (request.method === 'GET') {
          // Read full DB state from D1
          const snapshot = await env.DB.prepare('SELECT payload FROM snapshots ORDER BY id DESC LIMIT 1').first();
          return new Response(snapshot?.payload ? (snapshot.payload as string) : JSON.stringify({}), {
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        if (request.method === 'POST') {
          const body = await request.text();
          await env.DB.prepare(
            'INSERT INTO snapshots (payload, updated_at) VALUES (?, datetime("now"))'
          ).bind(body).run();

          return new Response(JSON.stringify({ success: true, syncedAt: new Date().toISOString() }), {
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
      }

      // 3. Materials API (Direct SQL query on Cloudflare D1)
      if (url.pathname === '/api/materials') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM materials ORDER BY name ASC').all();
          return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }
};
`;

export const CLOUDFLARE_WRANGLER_TOML = `name = "obayoli-restaurant-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[vars]
SYSTEM_NAME = "OBAYOLI_RESTAURANT_SYSTEM"

[[d1_databases]]
binding = "DB"
database_name = "obayoli_prod"
database_id = "your-cloudflare-d1-database-uuid"
`;

export const CLOUDFLARE_D1_SQL_SCHEMA = `-- OBAYOLI Database Schema for Cloudflare D1 / SQLite / PostgreSQL

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

-- 4. Supplier Invoices
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  supplier_id TEXT NOT NULL,
  subtotal_ht REAL NOT NULL,
  tva_rate REAL DEFAULT 19,
  tva_amount REAL NOT NULL,
  total_ttc REAL NOT NULL,
  status TEXT DEFAULT 'paid',
  payment_method TEXT DEFAULT 'bank_transfer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fiche Technique (Recipes)
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  portions INTEGER DEFAULT 1,
  selling_price REAL NOT NULL,
  tva_rate REAL DEFAULT 10,
  allergens TEXT,
  ingredients_json TEXT NOT NULL,
  steps_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Dish Sales
CREATE TABLE IF NOT EXISTS dish_sales (
  id TEXT PRIMARY KEY,
  sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  dish_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  calculated_cost REAL NOT NULL,
  gross_profit REAL NOT NULL,
  department TEXT NOT NULL,
  auto_deducted BOOLEAN DEFAULT 1
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
`;

export const GITHUB_DEPLOYMENT_GUIDE_MD = `# دليل رفع OBAYOLI على GitHub وربطه بـ Cloudflare Workers 🚀

## الخطوة 1: تجهيز مستودع GitHub (Repository)
1. افتح حسابك في [GitHub](https://github.com) وأنشئ مستودعاً جديداً باسم \`obayoli-restaurant-erp\`.
2. في جهازك، افتح مجلد المشروع ونفذ:
\`\`\`bash
git init
git add .
git commit -m "Initial commit: OBAYOLI Restaurant & Inventory System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/obayoli-restaurant-erp.git
git push -u origin main
\`\`\`

## الخطوة 2: ربط الواجهة مع Cloudflare Pages
1. ادخل إلى لوحة تحكم [Cloudflare Dashboard](https://dash.cloudflare.com).
2. اختر **Workers & Pages** -> **Create application** -> تبويب **Pages**.
3. اختر **Connect to Git** وحدد مستودعك \`obayoli-restaurant-erp\`.
4. إعدادات البناء (Build settings):
   - **Framework preset**: Vite
   - **Build command**: \`npm run build\`
   - **Build output directory**: \`dist\`
5. اضغط **Save and Deploy**؛ سيعمل موقعك عالمياً خلال ثوانٍ مع SSL مجاني وسرعة فائقة!

## الخطوة 3: إنشاء قاعدة بيانات Cloudflare D1
\`\`\`bash
npx wrangler d1 create obayoli_prod
\`\`\`
انسخ \`database_id\` وضعه في ملف \`wrangler.toml\`. ثم قم بتشغيل مخطط SQL:
\`\`\`bash
npx wrangler d1 execute obayoli_prod --file=./schema.sql
\`\`\`

## الخطوة 4: نشر الـ Worker وتشغيل الـ API
\`\`\`bash
npx wrangler deploy
\`\`\`
ستحصل على رابط الـ API الخاص بك مثل:
\`https://obayoli-restaurant-api.your-subdomain.workers.dev\`

ضع هذا الرابط في صفحة **قاعدة البيانات & الربط السحابي** في النظام، وسيتم عمل مزامنة سريعة وآمنة تلقائياً!
`;
