# 🚀 دليل رفع النظام على GitHub وربطه بـ Cloudflare Pages

تم تجهيز هذا المشروع بالكامل ليكون جاهزاً للرفع الفوري على **GitHub** والنشر السريع على شبكة **Cloudflare** العالمية مجاناً وبسرعة فائقة.

---

## 📌 الجزء الأول: رفع المشروع على GitHub

### 1. إنشاء مستودع جديد على GitHub
1. ادخل إلى حسابك في [GitHub](https://github.com).
2. اضغط على الزر الأخضر **New** لإنشاء مستودع جديد (Repository).
3. اختر اسماً للمستودع، مثلاً: `obayoli-erp` أو `restaurant-inventory`.
4. اختر **Public** أو **Private** (حسب رغبتك).
5. **مهم:** لا تضع علامة صح أمام "Initialize with README" لأن المشروع جاهز ومجهز بالفعل محلياً.
6. اضغط **Create repository**.

### 2. رفع الكود من جهازك إلى GitHub
افتح موجه الأوامر (Terminal / PowerShell / Git Bash) في مجلد المشروع، وقم بنسخ وتشغيل الأوامر التالية (مع استبدال `YOUR_USERNAME` باسم حسابك على GitHub، و `YOUR_REPO_NAME` باسم المستودع):

```bash
# 1. ربط المشروع بالمستودع البعيد
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 2. التأكد من اسم الفرع الرئيسي main
git branch -M main

# 3. رفع كافة الملفات إلى GitHub
git push -u origin main
```

---

## 📌 الجزء الثاني: ربطه بـ Cloudflare Pages (النشر المباشر)

Cloudflare Pages هي الخدمة الرسمية والمثالية لنشر تطبيقات Vite و React بسرعة استجابة فائقة حول العالم وبشهادة SSL مجانية وتحديث تلقائي عند كل `git push`.

### الخطوات:
1. افتح حسابك في [Cloudflare Dashboard](https://dash.cloudflare.com).
2. من القائمة الجانبية، اضغط على **Compute (Workers & Pages)**.
3. اضغط على زر **Create application**.
4. اختر تبويب **Pages** (وليس Workers).
5. اضغط على زر **Connect to Git**.
6. اختر حسابك على GitHub، ثم حدد المستودع الذي رفعته للتو (`YOUR_REPO_NAME`).
7. في صفحة **Set up builds and deployments**، املأ الإعدادات التالية:
   - **Project name**: اتركه كما هو أو اختر اسماً للموقع (مثلاً: `obayoli-erp`).
   - **Production branch**: `main`
   - **Framework preset**: اختر **Vite** من القائمة المنسدلة.
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: اتركها فارغة (أو `/`).
8. اضغط على زر **Save and Deploy**.
9. ستبدأ Cloudflare ببناء الموقع، وخلال أقل من دقيقة ستحصل على رابط رسمي فوري مثل:
   `https://obayoli-erp.pages.dev`

---

## 📌 الجزء الثالث: ميزات إضافية تم تجهيزها مسبقاً لك

1. **ملف `public/_redirects`**:
   تمت إضافته مسبقاً (`/* /index.html 200`) لضمان عمل كافة الروابط والتنقل الداخلي في Cloudflare Pages بدون أي أخطاء 404 عند تحديث الصفحة.
2. **ملف `.github/workflows/deploy.yml`**:
   إذا كنت تفضل النشر التلقائي عبر GitHub Actions بواسطة Cloudflare API Token.
3. **ملفات `wrangler.toml` و `schema.sql`**:
   جاهزة وموجودة في المجلد الرئيسي إذا رغبت مستقبلاً في تشغيل قاعدة بيانات سحابية سريعة جداً على Cloudflare D1.

---

## 💡 أوامر التحديث لاحقاً بعد إجراء أي تعديلات:
كلما قمت بتعديل أي كود في مشروعك وتريد تحديث الموقع على Cloudflare تلقائياً:
```bash
git add .
git commit -m "تحديث النظام"
git push
```
ستقوم Cloudflare بسحب التحديثات وبناء النسخة الجديدة فوراً ونشرها بدون أي تدخل منك!
