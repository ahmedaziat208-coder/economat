# 🍽️ نظام إدارة المطاعم والمخابز والمخزون | Restaurant & Inventory ERP

نظام متكامل واحترافي لإدارة المخزون، الوصفات وبطاقات التصنيع (Fiches Techniques)، فواتير الموردين، طلبات الشراء، ونقاط البيع POS، مبني بأحدث تقنيات React و Vite و Tailwind CSS.

## 🚀 النشر السريع (Deployment)
- للرفع على **GitHub** وربطه بشبكة **Cloudflare Pages** خطوة بخطوة، راجع ملف **[DEPLOYMENT.md](./DEPLOYMENT.md)**.
- تم تجهيز إعدادات البناء مسبقاً (`npm run build` -> `dist`) مع دعم كامل للـ SPA عبر `public/_redirects`.

## 🛠️ التشغيل المحلي (Local Development)
```bash
# تثبيت الحزم
npm install

# تشغيل بيئة التطوير
npm run dev

# بناء النسخة النهائية للإنتاج
npm run build
```

## 🌐 النشر على Cloudflare Pages
- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`
