import {
  RestaurantDatabase,
  Material,
  StockMovement,
  WasteRecord,
  ConsumptionRecord,
  FicheTechnique,
  DishSale,
  SupplierInvoice,
  Supplier,
  StockAudit,
  WhatsAppLog,
  PurchaseOrder,
  PurchaseOrderItem,
  CloudflareConfig,
  MovementType,
} from '../types';
import { firestore, handleFirestoreError, OperationType, testConnection } from './firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'OBAYOLI_RESTAURANT_DB_V3_MAD';

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    name: 'كريم بنجلون (Boucherie d\'Or Maroc)',
    companyName: 'شركة اللحوم الذهبية المغربية',
    phone: '+212661123456',
    email: 'contact@boucheriedor.ma',
    address: 'المنطقة الصناعية عين السبع، الدار البيضاء',
    deliveryDays: [1, 3, 5], // Lun, Mer, Ven
    rib: '011 780 0001212345678901 44',
    taxId: '001523456000089',
    categorySpecialty: 'اللحوم الطازجة، لحم العجل، والدواجن المفرومة',
    notes: 'توصيل شاحنة مبردة صباحاً بين 07:00 و 09:00',
    active: true,
  },
  {
    id: 'sup_2',
    name: 'طارق مزياني (Fromagerie Atlas Maroc)',
    companyName: 'ألبان وأجبان الأطلس المغربي',
    phone: '+212662789012',
    email: 'commercial@fromagerie-atlas.ma',
    address: 'طريق بنسليمان، المحمدية / الدار البيضاء',
    deliveryDays: [0, 2, 4], // Dim, Mar, Jeu
    rib: '007 780 0045098765432100 12',
    taxId: '001689234000078',
    categorySpecialty: 'شيدر أحمر، موزاريلا، غودا، قشطة طازجة وجبن بلدي',
    notes: 'دفع بالفاتورة نهاية كل شهر',
    active: true,
  },
  {
    id: 'sup_3',
    name: 'سمير التازي (Monin & Bar Supplies Maroc)',
    companyName: 'مؤسسة التازي لتجهيز المقاهي والبار',
    phone: '+212663223344',
    email: 'samir@barsupplies-maroc.com',
    address: 'حي المعاريف، الدار البيضاء',
    deliveryDays: [2, 4], // Mar, Jeu
    rib: '022 780 0089055443322110 78',
    taxId: '001745678000045',
    categorySpecialty: 'سيروب مونين، بن كولومبي مختص، عصائر ومركزات',
    notes: 'موزع رسمي لعلامات Monin و Lavazza بالمغرب',
    active: true,
  },
  {
    id: 'sup_4',
    name: 'سفيان الفاسي (Boulangerie Le Moulin Casa)',
    companyName: 'مخبزة وطواحين لومولان الحرفية',
    phone: '+212664998877',
    email: 'lemoulin.casa@gmail.com',
    address: 'شارع الزرقطوني، الدار البيضاء',
    deliveryDays: [0, 1, 2, 3, 4, 5, 6], // Daily delivery
    rib: '013 780 0012077889900110 33',
    taxId: '001890123000012',
    categorySpecialty: 'خبز بريوش للبرغر، خبز بانيني، توست فاخر',
    notes: 'توصيل يومي الساعة 06:30 صباحاً ساخن وطازج',
    active: true,
  },
];

export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'mat_1',
    sku: 'MT-BEEF-01',
    barcode: '6131112223334',
    name: 'لحم بقري مفروم طازج (Black Angus)',
    nameFr: 'Viande Hachée Bœuf Black Angus',
    nameEn: 'Minced Beef Black Angus',
    category: 'meats',
    unit: 'kg',
    fexPrice: 120, // Reference max FEX price (DH)
    purchasePrice: 115, // Actual purchase price HT (DH)
    unitCost: 115,
    currentStock: 38.5,
    minStock: 15,
    maxStock: 80,
    supplierId: 'sup_1',
    notes: 'نسبة دهن 18-20% مثالية للبرغر',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_2',
    sku: 'MT-CHED-02',
    barcode: '6132223334445',
    name: 'جبن شيدر أحمر إنجليزي معتق',
    nameFr: 'Fromage Cheddar Rouge Affiné',
    nameEn: 'Mature Red Cheddar Cheese',
    category: 'dairy_cheese',
    unit: 'kg',
    fexPrice: 105,
    purchasePrice: 95,
    unitCost: 95,
    currentStock: 14.2,
    minStock: 8,
    maxStock: 40,
    supplierId: 'sup_2',
    notes: 'كتل 2.5 كغ، سهل الذوبان',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_3',
    sku: 'MT-BUN-03',
    barcode: '6133334445556',
    name: 'خبز برغر بريوش سمسم (Pain Cheesena)',
    nameFr: 'Pain Burger Brioché Artisanal',
    nameEn: 'Artisan Brioche Burger Bun',
    category: 'bakery_bread',
    unit: 'piece',
    fexPrice: 4.0,
    purchasePrice: 3.5,
    unitCost: 3.5,
    currentStock: 140,
    minStock: 50,
    maxStock: 300,
    supplierId: 'sup_4',
    notes: 'قطر 11 سم، لمعة بيض وسمسم محمص',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_4',
    sku: 'MT-SAUCE-04',
    barcode: '6134445556667',
    name: 'صلصة مايونيز بالكمأة الخاصة (Sauce Truffe)',
    nameFr: 'Sauce Mayonnaise à la Truffe Noire',
    nameEn: 'Truffle Mayo House Sauce',
    category: 'sauces_spices',
    unit: 'kg',
    fexPrice: 75,
    purchasePrice: 65,
    unitCost: 65,
    currentStock: 8.5,
    minStock: 4,
    maxStock: 25,
    supplierId: 'sup_3',
    notes: 'عبوات ضغط سعة 1 كغ للمطبخ',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_5',
    sku: 'MT-OIL-05',
    barcode: '6135556667778',
    name: 'زيت قلي نباتي عالي الجودة (Friture Pro)',
    nameFr: 'Huile de Tournesol Haute Température 5L',
    nameEn: 'High Heat Cooking Oil 5L',
    category: 'liquids_oils',
    unit: 'l',
    fexPrice: 20,
    purchasePrice: 18,
    unitCost: 18,
    currentStock: 65,
    minStock: 30,
    maxStock: 150,
    supplierId: 'sup_2',
    notes: 'صناديق 4 × 5 لتر',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_6',
    sku: 'MT-TOM-06',
    barcode: '6136667778889',
    name: 'طماطم طازجة صلبة للتقطيع',
    nameFr: 'Tomates Fraîches Calibre Moyen',
    nameEn: 'Fresh Slicing Tomatoes',
    category: 'vegetables_fruits',
    unit: 'kg',
    fexPrice: 7.5,
    purchasePrice: 8.5,
    unitCost: 8.5,
    currentStock: 6.2,
    minStock: 10,
    maxStock: 50,
    supplierId: 'sup_1',
    notes: 'تنبيه: سعر الشراء الأخير 8.5 درهم تجاوز سعر FEX (7.5 درهم)',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_7',
    sku: 'MT-COF-07',
    barcode: '6137778889990',
    name: 'حبوب قهوة كولومبيا مختصة (Café Grain 1kg)',
    nameFr: 'Café en Grains Colombie Supremo 1kg',
    nameEn: 'Colombian Supremo Coffee Beans 1kg',
    category: 'beverages',
    unit: 'kg',
    fexPrice: 195,
    purchasePrice: 180,
    unitCost: 180,
    currentStock: 16.0,
    minStock: 8,
    maxStock: 50,
    supplierId: 'sup_3',
    notes: 'تحميص إيطالي متوسط مخصص للإسبريسو',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_8',
    sku: 'MT-MONIN-08',
    barcode: '6138889990001',
    name: 'شراب مركز مونين كراميل (Sirop Monin 70cl)',
    nameFr: 'Sirop Monin Caramel Beurre Salé 70cl',
    nameEn: 'Monin Salted Caramel Syrup 70cl',
    category: 'beverages',
    unit: 'cl',
    fexPrice: 1.3,
    purchasePrice: 1.2,
    unitCost: 1.2,
    currentStock: 350,
    minStock: 140,
    maxStock: 1000,
    supplierId: 'sup_3',
    notes: 'زجاجات 70 سنتيلتر لمشروبات البار والقهوة',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_9',
    sku: 'MT-MILK-09',
    barcode: '6139990001112',
    name: 'حليب كامل الدسم مبستر للبار (Lait Entier Barista)',
    nameFr: 'Lait Entier Barista 1L',
    nameEn: 'Whole Milk Barista 1L',
    category: 'dairy_cheese',
    unit: 'l',
    fexPrice: 10.5,
    purchasePrice: 9.5,
    unitCost: 9.5,
    currentStock: 22,
    minStock: 15,
    maxStock: 100,
    supplierId: 'sup_2',
    notes: 'رغوة متماسكة للكابتشينو واللاتيه',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_10',
    sku: 'MT-PACK-10',
    barcode: '6130001112223',
    name: 'علب برغر كرافت صديقة للبيئة (Boîtes Burger Kraft)',
    nameFr: 'Boîtes Burger Kraft Écologiques',
    nameEn: 'Eco Kraft Burger Boxes',
    category: 'packaging',
    unit: 'piece',
    fexPrice: 1.8,
    purchasePrice: 1.5,
    unitCost: 1.5,
    currentStock: 480,
    minStock: 200,
    maxStock: 1500,
    supplierId: 'sup_4',
    notes: 'صناديق كرتون مضلع عازل للحرارة',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_11',
    sku: 'MT-CHICK-11',
    barcode: '6131113335557',
    name: 'صدر دجاج مقرمش متبل (Filet Poulet Mariné)',
    nameFr: 'Filet de Poulet Pané Croustillant',
    nameEn: 'Crispy Marinated Chicken Breast',
    category: 'meats',
    unit: 'kg',
    fexPrice: 75,
    purchasePrice: 68,
    unitCost: 68,
    currentStock: 4.8,
    minStock: 12,
    maxStock: 60,
    supplierId: 'sup_1',
    notes: 'تتبيلة سرية جاهزة للقلي',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'mat_12',
    sku: 'MT-MOZZ-12',
    barcode: '6132224446668',
    name: 'جبن موزاريلا إيطالية مبشورة للبيتزا',
    nameFr: 'Mozzarella Râpée Italienne 2.5kg',
    nameEn: 'Shredded Mozzarella 2.5kg',
    category: 'dairy_cheese',
    unit: 'kg',
    fexPrice: 95,
    purchasePrice: 85,
    unitCost: 85,
    currentStock: 18.0,
    minStock: 10,
    maxStock: 50,
    supplierId: 'sup_2',
    notes: 'تذوب بانتظام وتتحمل درجات الحرارة العالية',
    updatedAt: '2026-10-14T10:00:00Z',
  },
];

export const INITIAL_RECIPES: FicheTechnique[] = [
  {
    id: 'rec_sub_cheesena_bun',
    code: 'SUB-BUN-01',
    name: 'خبز بريوش Cheesena محمص بالزبدة',
    nameFr: 'Pain Cheesena Toasté au Beurre (Sous-Recette)',
    category: 'sub_recipe',
    department: 'cuisine',
    portions: 1,
    prepTimeMin: 2,
    cookTimeMin: 2,
    sellingPrice: 80,
    tvaRate: 10,
    ingredients: [
      { materialId: 'mat_3', quantity: 1, unit: 'piece', notes: 'خبز البرغر الحرفي' },
    ],
    steps: [
      'قطع خبز البريوش إلى نصفين متساويين.',
      'دهن السطح الداخلي بمسحة زبدة خفيفة.',
      'التحميص على البلانشا حتى الحصول على لون ذهبي محمر وطبقة مقرمشة عازلة للصلصة.',
    ],
    equipment: ['بلانشا كهربائية (Toaster/Salamandre)', 'سكين خبز مسنن', 'فرشاة دهن'],
    allergens: ['غلوتين (Gluten)', 'حليب (Lactose)', 'بيض (Eggs)', 'سمسم (Sesame)'],
    notes: 'مكون مركب أساسي يدخل في تحضير جميع برغرات Cheesena',
    updatedAt: '2026-10-14T12:00:00Z',
  },
  {
    id: 'rec_burger_cheesena',
    code: 'BUR-CHEE-01',
    name: 'برغر تشيزينا سيغناتشر (Le Cheesena Burger)',
    nameFr: 'Le Cheesena Burger Signature',
    category: 'burger',
    department: 'cuisine',
    portions: 1,
    prepTimeMin: 6,
    cookTimeMin: 5,
    sellingPrice: 85, // Selling price in MAD
    tvaRate: 20,
    ingredients: [
      { materialId: 'mat_1', quantity: 0.16, unit: 'kg', notes: 'شريحة لحم بلاك أنغوس 160 غرام' },
      { materialId: 'mat_2', quantity: 0.05, unit: 'kg', notes: 'شريحتان من جبن الشيدر المعتق 50 غ' },
      { materialId: 'mat_4', quantity: 0.03, unit: 'kg', notes: 'صلصة مايونيز الكمأة 30 غ' },
      { materialId: 'mat_6', quantity: 0.04, unit: 'kg', notes: 'شريحتان طماطم طازجة 40 غ' },
      { materialId: 'mat_10', quantity: 1, unit: 'piece', notes: 'علبة برغر كرافت للتقديم' },
    ],
    compositeItems: [
      { dishId: 'rec_sub_cheesena_bun', quantity: 1 }, // Uses Pain Cheesena Sub-Recipe!
    ],
    steps: [
      'تسخين البلانشا إلى 220 درجة مئوية.',
      'تحميص خبز Cheesena المدهون بالزبدة (الوصفة الفرعية).',
      'تشكيل وسمك شريحة لحم بلاك أنغوس (Smash technique) لمدة دقيقتين لكل وجه.',
      'وضع شرائح جبن الشيدر المعتق فوق اللحم في الدقيقة الأخيرة مع غطاء البخار ليذوب.',
      'دهن قاعدة الخبز بصلصة مايونيز الكمأة، ثم وضع الطماطم واللحم بالجبن الذائب.',
      'إغلاق الخبز ووضعه داخل علبة الكرافت الفاخرة للتقديم الفوري.',
    ],
    equipment: ['بلانشا حديد الزهر (Cast Iron Plancha)', 'مكبس البرغر (Smash Press)', 'غطاء إذابة الجبن (Melting Dome)'],
    allergens: ['غلوتين (Gluten)', 'حليب ومشتقاته (Lactose)', 'بيض (Eggs)', 'سمسم (Sesame)'],
    notes: 'الطبق الأكثر مبيعاً في المطعم بهامش ربح ممتاز يتجاوز 55%',
    photoUrl: '/src/assets/images/recipe_cheesena_burger_1792109209389.jpg',
    updatedAt: '2026-10-14T14:30:00Z',
  },
  {
    id: 'rec_pizza_truffle',
    code: 'PIZ-TRUF-02',
    name: 'بيتزا كوين بالكمأة والموزاريلا',
    nameFr: 'Pizza Reine à la Truffe & Mozzarella',
    category: 'pizza',
    department: 'cuisine',
    portions: 1,
    prepTimeMin: 8,
    cookTimeMin: 3,
    sellingPrice: 95,
    tvaRate: 20,
    ingredients: [
      { materialId: 'mat_12', quantity: 0.18, unit: 'kg', notes: 'موزاريلا مبشورة 180 غ' },
      { materialId: 'mat_4', quantity: 0.04, unit: 'kg', notes: 'قاعدة صلصة الكمأة 40 غ' },
      { materialId: 'mat_6', quantity: 0.05, unit: 'kg', notes: 'طماطم كرزية مقطعة' },
    ],
    steps: [
      'فرد عجينة البيتزا النابولية يدوياً للحفاظ على الحواف الهوائية.',
      'توزيع صلصة الكمأة بتجانس دون الاقتراب من الحواف.',
      'رش جبن الموزاريلا وتوزيع الطماطم.',
      'الخبز في فرن الحطب/الغاز على حرارة 430 مئوية لمدة 90 إلى 120 ثانية مع التدوير.',
    ],
    equipment: ['فرن بيتزا ناري 450°C', 'مجرفة بيتزا مثقبة', 'سكين تقطيع البيتزا الدائري'],
    allergens: ['غلوتين (Gluten)', 'حليب (Lactose)', 'بيض (Eggs)'],
    notes: 'تحضير العجينة بالتخمير البطيء 48 ساعة مسبقاً',
    photoUrl: '/src/assets/images/recipe_pizza_truffle_1792109209959.jpg',
    updatedAt: '2026-10-14T15:00:00Z',
  },
  {
    id: 'rec_caramel_latte',
    code: 'BAR-LAT-03',
    name: 'كراميل ماكياتو لاتيه فاخر (Bar Signature)',
    nameFr: 'Caramel Macchiato Latte Gourmand',
    category: 'coffee',
    department: 'bar',
    portions: 1,
    prepTimeMin: 3,
    cookTimeMin: 1,
    sellingPrice: 28,
    tvaRate: 20,
    ingredients: [
      { materialId: 'mat_7', quantity: 0.018, unit: 'kg', notes: 'جرعة دوبل إسبريسو 18 غرام قهوة' },
      { materialId: 'mat_9', quantity: 0.22, unit: 'l', notes: 'حليب باريستا كامل الدسم 220 مل' },
      { materialId: 'mat_8', quantity: 2.5, unit: 'cl', notes: 'شراب مونين كراميل مملح 25 مل' },
    ],
    steps: [
      'استخلاص جرعة الإسبريسو المضاعفة (36 مل خلال 26 ثانية).',
      'صب شراب مونين كراميل في قاع الكوب الزجاجي.',
      'تبخير الحليب بدرجة حرارة 65 مئوية لإنشاء رغوة مخملية ميكروفوم.',
      'صب الحليب المبخر فوق الكراميل ثم إضافة الإسبريسو في المنتصف لعمل طبقات متناسقة.',
    ],
    equipment: ['آلة إسبريسو احترافية ثنائية المجموعات', 'مطحنة قهوة On-Demand', 'إبريق تبخير الحليب Pitcher'],
    allergens: ['حليب ومشتقاته (Lactose)'],
    notes: 'مشروب البار المفضل صباحاً وبعد الظهيرة',
    photoUrl: '/src/assets/images/recipe_cocktail_latte_1792109210272.jpg',
    updatedAt: '2026-10-14T16:00:00Z',
  },
];

export const INITIAL_INVOICES: SupplierInvoice[] = [
  {
    id: 'inv_2026_10_01',
    invoiceNumber: 'FAC-2026-0881',
    date: '2026-10-10',
    supplierId: 'sup_1',
    items: [
      { materialId: 'mat_1', quantity: 20, unitPriceHT: 115, totalHT: 2300 },
      { materialId: 'mat_11', quantity: 15, unitPriceHT: 68, totalHT: 1020 },
    ],
    subtotalHT: 3320,
    tvaRate: 20,
    tvaAmount: 664,
    totalTTC: 3984,
    status: 'paid',
    paymentMethod: 'bank_transfer',
    notes: 'فاتورة توريد لحوم أسبوعية معتمدة ومطابقة للشروط الصحية (الدار البيضاء)',
  },
  {
    id: 'inv_2026_10_02',
    invoiceNumber: 'FAC-ATLAS-442',
    date: '2026-10-12',
    supplierId: 'sup_2',
    items: [
      { materialId: 'mat_2', quantity: 10, unitPriceHT: 95, totalHT: 950 },
      { materialId: 'mat_12', quantity: 15, unitPriceHT: 85, totalHT: 1275 },
      { materialId: 'mat_5', quantity: 40, unitPriceHT: 18, totalHT: 720 },
      { materialId: 'mat_9', quantity: 30, unitPriceHT: 9.5, totalHT: 285 },
    ],
    subtotalHT: 3230,
    tvaRate: 20,
    tvaAmount: 646,
    totalTTC: 3876,
    status: 'paid',
    paymentMethod: 'check',
    notes: 'توريد أجبان وزيوت وحليب طازج لمخزن المطعم',
  },
  {
    id: 'inv_2026_10_03',
    invoiceNumber: 'FAC-BAR-091',
    date: '2026-10-14',
    supplierId: 'sup_3',
    items: [
      { materialId: 'mat_7', quantity: 10, unitPriceHT: 180, totalHT: 1800 },
      { materialId: 'mat_8', quantity: 140, unitPriceHT: 1.2, totalHT: 168 },
      { materialId: 'mat_4', quantity: 10, unitPriceHT: 65, totalHT: 650 },
    ],
    subtotalHT: 2618,
    tvaRate: 20,
    tvaAmount: 523.6,
    totalTTC: 3141.6,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    notes: 'مستلزمات البار والقهوة وصلصة الكمأة',
  },
];

export const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov_1',
    date: '2026-10-10T09:30:00Z',
    materialId: 'mat_1',
    type: 'in_purchase',
    quantity: 20,
    unitPrice: 115,
    totalValue: 2300,
    referenceId: 'inv_2026_10_01',
    reason: 'توريد فاتورة رقم FAC-2026-0881',
    operatorName: 'سفيان (أمين المخزن)',
  },
  {
    id: 'mov_2',
    date: '2026-10-11T11:15:00Z',
    materialId: 'mat_1',
    type: 'out_kitchen',
    quantity: 5,
    unitPrice: 115,
    totalValue: 575,
    reason: 'صرف للمطبخ لخدمة الغداء',
    operatorName: 'الشيف رفيق',
  },
  {
    id: 'mov_3',
    date: '2026-10-12T14:00:00Z',
    materialId: 'mat_7',
    type: 'out_bar',
    quantity: 2,
    unitPrice: 180,
    totalValue: 360,
    reason: 'صرف بن كولومبي للبار',
    operatorName: 'الباريستا أمين',
  },
  {
    id: 'mov_4',
    date: '2026-10-13T17:30:00Z',
    materialId: 'mat_6',
    type: 'out_waste',
    quantity: 1.5,
    unitPrice: 8.5,
    totalValue: 12.75,
    referenceId: 'wst_1',
    reason: 'تلف بسبب الرطوبة والحرارة',
    operatorName: 'مساعد الطاهي وليد',
  },
];

export const INITIAL_WASTE: WasteRecord[] = [
  {
    id: 'wst_1',
    date: '2026-10-13T17:30:00Z',
    materialId: 'mat_6',
    quantity: 1.5,
    unitPrice: 8.5,
    totalCost: 12.75,
    reason: 'storage_damage',
    department: 'cuisine',
    notes: 'طماطم طرية جداً غير صالحة للتقطيع بعد النقل',
    reportedBy: 'مساعد الطاهي وليد',
  },
  {
    id: 'wst_2',
    date: '2026-10-14T21:00:00Z',
    materialId: 'mat_3',
    quantity: 6,
    unitPrice: 3.5,
    totalCost: 21,
    reason: 'prep_defect',
    department: 'cuisine',
    notes: 'احتراق الخبز على البلانشا أثناء ضغط الطلبيات',
    reportedBy: 'الشيف رفيق',
  },
];

export const INITIAL_CONSUMPTIONS: ConsumptionRecord[] = [
  {
    id: 'cns_1',
    date: '2026-10-13T11:00:00Z',
    department: 'cuisine',
    materialId: 'mat_1',
    quantity: 6.5,
    unitPrice: 115,
    totalValue: 747.5,
    shift: 'morning',
    notes: 'تحضير لحم برغر وجبة الغداء',
    requestedBy: 'الشيف رفيق',
  },
  {
    id: 'cns_2',
    date: '2026-10-14T08:30:00Z',
    department: 'bar',
    materialId: 'mat_9',
    quantity: 8,
    unitPrice: 9.5,
    totalValue: 76,
    shift: 'morning',
    notes: 'حليب كامل الدسم لمشروبات القهوة الصباحية',
    requestedBy: 'الباريستا أمين',
  },
];

export const INITIAL_SALES: DishSale[] = [
  {
    id: 'sale_1',
    date: '2026-10-14T13:45:00Z',
    dishId: 'rec_burger_cheesena',
    quantity: 14,
    unitPrice: 85,
    totalAmount: 1190,
    calculatedCost: 448,
    grossProfit: 742,
    marginPercent: 62.3,
    department: 'cuisine',
    autoDeducted: true,
    notes: 'طلبيات صالة الغداء - تم خصم اللحم والجبن والخبز والصلصة',
  },
  {
    id: 'sale_2',
    date: '2026-10-14T15:20:00Z',
    dishId: 'rec_caramel_latte',
    quantity: 18,
    unitPrice: 28,
    totalAmount: 504,
    calculatedCost: 144,
    grossProfit: 360,
    marginPercent: 71.4,
    department: 'bar',
    autoDeducted: true,
    notes: 'مبيعات الكافيتريا - تم خصم القهوة والحليب وسيروب الكراميل',
  },
];

export const INITIAL_AUDITS: StockAudit[] = [
  {
    id: 'aud_2026_10',
    auditNumber: 'JRD-2026-W41',
    date: '2026-10-12',
    auditorName: 'حميد قادري (مراقب الجودة والمخازن)',
    status: 'reconciled',
    department: 'all',
    items: [
      {
        materialId: 'mat_1',
        systemStock: 40,
        countedStock: 38.5,
        variance: -1.5,
        unitPrice: 115,
        varianceValue: -172.5,
        notes: 'فارق طفيف بسبب التقطيع والرطوبة المفقودة',
      },
      {
        materialId: 'mat_2',
        systemStock: 14.2,
        countedStock: 14.2,
        variance: 0,
        unitPrice: 95,
        varianceValue: 0,
        notes: 'مطابق تماماً',
      },
      {
        materialId: 'mat_3',
        systemStock: 145,
        countedStock: 140,
        variance: -5,
        unitPrice: 3.5,
        varianceValue: -17.5,
        notes: 'تلف بسيط أثناء الاستلام',
      },
      {
        materialId: 'mat_5',
        systemStock: 65,
        countedStock: 65,
        variance: 0,
        unitPrice: 18,
        varianceValue: 0,
        notes: 'مطابق تماماً',
      },
    ],
    totalPositiveVarianceValue: 0,
    totalNegativeVarianceValue: 190,
    netVarianceValue: -190,
    reconciledAt: '2026-10-12T18:00:00Z',
    notes: 'تمت مصادقة الجرد الأسبوعي واعتماد التسويات المحاسبية في المخزون (بالدرهم المغربي)',
  },
];

export const INITIAL_WHATSAPP_LOGS: WhatsAppLog[] = [
  {
    id: 'wa_1',
    date: '2026-10-14T08:15:00Z',
    recipientName: 'كريم بنجلون (Boucherie d\'Or Maroc)',
    recipientPhone: '+212661123456',
    type: 'order',
    message: 'السلام عليكم سي كريم، نرجو توريد 30 كغ لحم مفروم بلاك أنغوس و 15 كغ صدر دجاج متبل غداً صباحاً الساعة 07:30. شكراً - مطعم OBAYOLI الدار البيضاء',
  },
];

export const EMPTY_DATABASE: RestaurantDatabase = {
  version: '1.2.0',
  currency: 'MAD',
  lastBackupDate: new Date().toISOString(),
  materials: [],
  movements: [],
  wasteRecords: [],
  consumptionRecords: [],
  recipes: [],
  dishSales: [],
  invoices: [],
  suppliers: [],
  audits: [],
  whatsappLogs: [],
  purchaseOrders: [],
  cloudflareConfig: {
    workerUrl: '',
    apiToken: '',
    autoSync: false,
    syncStatus: 'idle',
  },
};

export const DEFAULT_DATABASE: RestaurantDatabase = {
  version: '1.2.0',
  currency: 'MAD',
  lastBackupDate: new Date().toISOString(),
  materials: INITIAL_MATERIALS,
  movements: INITIAL_MOVEMENTS,
  wasteRecords: INITIAL_WASTE,
  consumptionRecords: INITIAL_CONSUMPTIONS,
  recipes: INITIAL_RECIPES,
  dishSales: INITIAL_SALES,
  invoices: INITIAL_INVOICES,
  suppliers: INITIAL_SUPPLIERS,
  audits: INITIAL_AUDITS,
  whatsappLogs: INITIAL_WHATSAPP_LOGS,
  purchaseOrders: [],
  cloudflareConfig: {
    workerUrl: '',
    apiToken: '',
    autoSync: false,
    syncStatus: 'idle',
  },
};

// Database Service with local persistence, auto-save, and real-time cloud Firestore sync
class DBService {
  private db: RestaurantDatabase;
  private listeners: Array<() => void> = [];
  private clientId: string = 'client_' + Math.random().toString(36).substring(2, 9);
  private firestoreStatus: 'idle' | 'syncing' | 'synced' | 'error' = 'idle';
  private firestoreLastSync: string | null = null;
  private firestoreError: string | null = null;
  private syncTimer: any = null;

  constructor() {
    this.db = this.loadDatabase();
    this.initFirestoreSync();
  }

  private initFirestoreSync() {
    try {
      const docRef = doc(firestore, 'system_snapshots', 'latest');

      // 1. Fetch initial remote state
      getDoc(docRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && data.dataJson) {
              try {
                const remoteDb = JSON.parse(data.dataJson);
                if (remoteDb && Array.isArray(remoteDb.materials)) {
                  if (remoteDb.currency !== 'MAD' || (remoteDb.materials[0] && remoteDb.materials[0].purchasePrice > 500)) {
                    // Outdated remote currency, seed current Moroccan Dirham database
                    this.syncToFirestore().catch(console.warn);
                  } else if (remoteDb.materials.length === 0 && this.db.materials && this.db.materials.length > 0) {
                    // Prevent accidental wipeout from empty remote snapshot; push local materials to Firestore
                    console.log('Preserving local materials over empty remote snapshot');
                    this.syncToFirestore().catch(console.warn);
                  } else {
                    this.db = {
                      ...this.db,
                      ...remoteDb,
                      currency: 'MAD',
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
                    this.firestoreStatus = 'synced';
                    this.firestoreLastSync = data.timestamp || new Date().toISOString();
                    this.notifyListeners();
                  }
                }
              } catch (parseErr) {
                console.warn('Failed parsing Firestore initial data', parseErr);
              }
            }
          } else {
            // If Firestore is empty and we have local data, seed it
            if (this.db.materials && this.db.materials.length > 0) {
              this.syncToFirestore().catch((err) =>
                console.warn('Initial Firestore seed failed:', err)
              );
            }
          }
        })
        .catch((err) => {
          console.warn('Initial Firestore getDoc error:', err);
        });

      // 2. Real-time subscription for live updates across browser tabs & devices
      onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            // Ignore updates originating from this specific tab instance
            if (data && data.dataJson && data.clientId !== this.clientId) {
              try {
                const remoteDb = JSON.parse(data.dataJson);
                if (remoteDb && Array.isArray(remoteDb.materials)) {
                  if (remoteDb.materials.length === 0 && this.db.materials && this.db.materials.length > 0) {
                    console.log('Ignored remote snapshot with 0 materials');
                  } else {
                    this.db = {
                      ...this.db,
                      ...remoteDb,
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
                    this.firestoreStatus = 'synced';
                    this.firestoreLastSync = data.timestamp || new Date().toISOString();
                    this.notifyListeners();
                  }
                }
              } catch (err) {
                console.error('Failed to parse incoming Firestore snapshot', err);
              }
            }
          }
        },
        (error) => {
          this.firestoreStatus = 'error';
          this.firestoreError = error.message;
          handleFirestoreError(error, OperationType.GET, 'system_snapshots/latest');
        }
      );
    } catch (e) {
      console.warn('Firestore initialization failed:', e);
    }
  }

  public async syncToFirestore(): Promise<{ success: boolean; message: string }> {
    try {
      this.firestoreStatus = 'syncing';
      this.notifyListeners();

      const docRef = doc(firestore, 'system_snapshots', 'latest');
      const now = new Date().toISOString();
      const payload = {
        id: 'latest',
        timestamp: now,
        clientId: this.clientId,
        materialsCount: this.db.materials.length,
        version: this.db.version,
        dataJson: JSON.stringify(this.db),
      };

      await setDoc(docRef, payload);
      this.firestoreStatus = 'synced';
      this.firestoreLastSync = now;
      this.firestoreError = null;
      this.notifyListeners();

      return {
        success: true,
        message: 'تمت مزامنة وحفظ البيانات سحابياً في Firestore بنجاح!',
      };
    } catch (err: any) {
      this.firestoreStatus = 'error';
      this.firestoreError = err?.message || 'خطأ أثناء الاتصال بقاعدة البيانات';
      this.notifyListeners();
      handleFirestoreError(err, OperationType.WRITE, 'system_snapshots/latest');
    }
  }

  public async loadFromFirestore(): Promise<{ success: boolean; message: string }> {
    try {
      this.firestoreStatus = 'syncing';
      this.notifyListeners();
      const docRef = doc(firestore, 'system_snapshots', 'latest');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.dataJson) {
          const remoteDb = JSON.parse(data.dataJson);
          if (remoteDb && Array.isArray(remoteDb.materials)) {
            this.db = {
              ...this.db,
              ...remoteDb,
            };
            this.firestoreStatus = 'synced';
            this.firestoreLastSync = data.timestamp || new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
            this.notifyListeners();
            return {
              success: true,
              message: `تم بنجاح تحميل واستعادة البيانات من قاعدة بيانات Firestore السحابية (${this.db.materials.length} مادة)!`,
            };
          }
        }
      }
      return {
        success: false,
        message: 'لم يتم العثور على نسخة سحابية سابقة في Firestore.',
      };
    } catch (err: any) {
      this.firestoreStatus = 'error';
      this.firestoreError = err?.message || 'فشل الاتصال بقاعدة البيانات';
      this.notifyListeners();
      handleFirestoreError(err, OperationType.GET, 'system_snapshots/latest');
    }
  }

  public async checkFirestoreConnection(): Promise<boolean> {
    return await testConnection();
  }

  public getFirestoreInfo() {
    return {
      status: this.firestoreStatus,
      lastSync: this.firestoreLastSync,
      error: this.firestoreError,
      databaseId: 'ai-studio-obayoli-b6ddc7d1-1f93-46a7-8ff8-edd476cebbad',
      projectId: 'decisive-glyph-7zbz0',
    };
  }

  private loadDatabase(): RestaurantDatabase {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.materials) && parsed.materials.length > 0) {
          // If stored data has old DZD values or no currency set, calibrate to Moroccan Dirham (MAD)
          if (parsed.currency !== 'MAD' || (parsed.materials[0] && parsed.materials[0].purchasePrice > 500)) {
            parsed = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
          return {
            ...EMPTY_DATABASE,
            ...parsed,
            currency: 'MAD',
            cloudflareConfig: {
              ...EMPTY_DATABASE.cloudflareConfig,
              ...(parsed.cloudflareConfig || {}),
            },
          };
        }
      }
    } catch (e) {
      console.warn('Could not load stored database, using default database', e);
    }
    const initial = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  private saveDatabase() {
    try {
      this.db.lastBackupDate = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      this.notifyListeners();

      // Automatically sync to cloud Firestore in background (debounced 1.5s)
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
      }
      this.syncTimer = setTimeout(() => {
        this.syncToFirestore().catch((err) => {
          console.warn('Background Firestore sync caught:', err);
        });
      }, 1500);
    } catch (e) {
      console.error('Failed to save database to localStorage', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public getSnapshot(): RestaurantDatabase {
    return this.db;
  }

  // --- Materials ---
  public getMaterials(): Material[] {
    return this.db.materials;
  }

  public saveMaterial(mat: Omit<Material, 'id' | 'updatedAt'> & { id?: string }): Material {
    const now = new Date().toISOString();
    let saved: Material;
    if (mat.id) {
      this.db.materials = this.db.materials.map((m) => {
        if (m.id === mat.id) {
          saved = { ...m, ...mat, updatedAt: now };
          return saved;
        }
        return m;
      });
      // @ts-ignore
      if (!saved) {
        saved = { ...mat, id: mat.id, updatedAt: now } as Material;
        this.db.materials.push(saved);
      }
    } else {
      saved = {
        ...mat,
        id: 'mat_' + Date.now(),
        updatedAt: now,
      } as Material;
      this.db.materials.push(saved);
    }
    this.saveDatabase();
    return saved!;
  }

  public deleteMaterial(id: string) {
    this.db.materials = this.db.materials.filter((m) => m.id !== id);
    this.saveDatabase();
  }

  // Manual Stock Adjustment
  public adjustStock(
    materialId: string,
    newQuantity: number,
    reason: string,
    operatorName: string
  ) {
    const mat = this.db.materials.find((m) => m.id === materialId);
    if (!mat) return;

    const diff = newQuantity - mat.currentStock;
    if (diff === 0) return;

    const type = diff > 0 ? 'adjustment_positive' : 'adjustment_negative';
    const movement: StockMovement = {
      id: 'mov_' + Date.now(),
      date: new Date().toISOString(),
      materialId,
      type,
      quantity: Math.abs(diff),
      unitPrice: mat.unitCost,
      totalValue: Math.abs(diff) * mat.unitCost,
      reason,
      operatorName,
    };

    mat.currentStock = Number(newQuantity.toFixed(3));
    mat.updatedAt = new Date().toISOString();
    this.db.movements.unshift(movement);
    this.saveDatabase();
  }

  public recordStockMovement(data: {
    materialId: string;
    type: MovementType;
    quantity: number;
    unitPrice?: number;
    reason?: string;
    operatorName?: string;
    date?: string;
  }): StockMovement {
    const mat = this.db.materials.find((m) => m.id === data.materialId);
    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : mat?.unitCost || mat?.purchasePrice || 0;
    const totalValue = Number((data.quantity * unitPrice).toFixed(2));
    const movId = 'mov_' + Date.now();

    const movement: StockMovement = {
      id: movId,
      date: data.date || new Date().toISOString(),
      materialId: data.materialId,
      type: data.type,
      quantity: Number(data.quantity),
      unitPrice,
      totalValue,
      reason: data.reason || 'حركة مخزون يدوية',
      operatorName: data.operatorName || 'أمين المخزن',
    };

    if (mat) {
      if (data.type === 'in_purchase' || data.type === 'adjustment_positive') {
        mat.currentStock = Number((mat.currentStock + data.quantity).toFixed(3));
      } else if (
        data.type === 'out_kitchen' ||
        data.type === 'out_bar' ||
        data.type === 'out_waste' ||
        data.type === 'out_dish_sale' ||
        data.type === 'adjustment_negative'
      ) {
        mat.currentStock = Number(Math.max(0, mat.currentStock - data.quantity).toFixed(3));
      }
      mat.updatedAt = new Date().toISOString();
    }

    this.db.movements.unshift(movement);
    this.saveDatabase();
    return movement;
  }

  public deleteStockMovement(id: string, reverseStock: boolean = true) {
    const mov = this.db.movements.find((m) => m.id === id);
    if (mov && reverseStock) {
      const mat = this.db.materials.find((m) => m.id === mov.materialId);
      if (mat) {
        if (mov.type === 'in_purchase' || mov.type === 'adjustment_positive') {
          mat.currentStock = Number(Math.max(0, mat.currentStock - mov.quantity).toFixed(3));
        } else if (
          mov.type === 'out_kitchen' ||
          mov.type === 'out_bar' ||
          mov.type === 'out_waste' ||
          mov.type === 'out_dish_sale' ||
          mov.type === 'adjustment_negative'
        ) {
          mat.currentStock = Number((mat.currentStock + mov.quantity).toFixed(3));
        }
        mat.updatedAt = new Date().toISOString();
      }
    }
    this.db.movements = this.db.movements.filter((m) => m.id !== id);
    this.saveDatabase();
  }

  // --- Suppliers ---
  public getSuppliers(): Supplier[] {
    return this.db.suppliers;
  }

  public saveSupplier(sup: Omit<Supplier, 'id'> & { id?: string }): Supplier {
    let saved: Supplier;
    if (sup.id) {
      this.db.suppliers = this.db.suppliers.map((s) => {
        if (s.id === sup.id) {
          saved = { ...s, ...sup };
          return saved;
        }
        return s;
      });
      // @ts-ignore
      if (!saved) {
        saved = { ...sup, id: sup.id } as Supplier;
        this.db.suppliers.push(saved);
      }
    } else {
      saved = {
        ...sup,
        id: 'sup_' + Date.now(),
      } as Supplier;
      this.db.suppliers.push(saved);
    }
    this.saveDatabase();
    return saved!;
  }

  public deleteSupplier(id: string) {
    this.db.suppliers = this.db.suppliers.filter((s) => s.id !== id);
    this.saveDatabase();
  }

  // --- Invoices ---
  public getInvoices(): SupplierInvoice[] {
    return this.db.invoices;
  }

  public saveInvoice(invoiceData: Omit<SupplierInvoice, 'id'> & { id?: string }): SupplierInvoice {
    const isNew = !invoiceData.id;
    const invoiceId = invoiceData.id || 'inv_' + Date.now();
    const invoice: SupplierInvoice = {
      ...invoiceData,
      id: invoiceId,
    };

    // If editing existing invoice, first reverse old movements
    if (!isNew) {
      this.revertInvoiceStock(invoiceId);
    }

    // Apply new movements and update material current stock & purchase prices
    invoice.items.forEach((item) => {
      const mat = this.db.materials.find((m) => m.id === item.materialId);
      if (mat) {
        mat.currentStock = Number((mat.currentStock + item.quantity).toFixed(3));
        mat.purchasePrice = item.unitPriceHT;
        mat.unitCost = item.unitPriceHT;
        mat.updatedAt = new Date().toISOString();

        // Create movement record
        const mov: StockMovement = {
          id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          date: invoice.date ? new Date(invoice.date).toISOString() : new Date().toISOString(),
          materialId: mat.id,
          type: 'in_purchase',
          quantity: item.quantity,
          unitPrice: item.unitPriceHT,
          totalValue: item.totalHT,
          referenceId: invoice.id,
          reason: `توريد فاتورة رقم ${invoice.invoiceNumber}`,
          operatorName: 'المحاسبة / التوريد',
        };
        this.db.movements.unshift(mov);
      }
    });

    if (isNew) {
      this.db.invoices.unshift(invoice);
    } else {
      this.db.invoices = this.db.invoices.map((inv) => (inv.id === invoice.id ? invoice : inv));
    }

    this.saveDatabase();
    return invoice;
  }

  private revertInvoiceStock(invoiceId: string) {
    const existing = this.db.invoices.find((inv) => inv.id === invoiceId);
    if (!existing) return;

    // Deduct previously added items
    existing.items.forEach((item) => {
      const mat = this.db.materials.find((m) => m.id === item.materialId);
      if (mat) {
        mat.currentStock = Math.max(0, Number((mat.currentStock - item.quantity).toFixed(3)));
      }
    });

    // Remove movements related to this invoice
    this.db.movements = this.db.movements.filter((m) => m.referenceId !== invoiceId);
  }

  public deleteInvoice(id: string) {
    this.revertInvoiceStock(id);
    this.db.invoices = this.db.invoices.filter((inv) => inv.id !== id);
    this.saveDatabase();
  }

  // --- Recipes / Fiche Technique ---
  public getRecipes(): FicheTechnique[] {
    return this.db.recipes;
  }

  // Recursive food cost calculation including sub-recipes
  public calculateRecipeFoodCost(recipeId: string, visited: Set<string> = new Set()): number {
    if (visited.has(recipeId)) return 0; // Prevent infinite loop
    visited.add(recipeId);

    const recipe = this.db.recipes.find((r) => r.id === recipeId);
    if (!recipe) return 0;

    let totalCost = 0;

    // Direct ingredients
    recipe.ingredients.forEach((ing) => {
      const mat = this.db.materials.find((m) => m.id === ing.materialId);
      if (mat) {
        totalCost += ing.quantity * mat.unitCost;
      }
    });

    // Composite items (sub-recipes)
    if (recipe.compositeItems && recipe.compositeItems.length > 0) {
      recipe.compositeItems.forEach((comp) => {
        const subCost = this.calculateRecipeFoodCost(comp.dishId, new Set(visited));
        totalCost += subCost * comp.quantity;
      });
    }

    return Number(totalCost.toFixed(2));
  }

  public saveRecipe(recipe: Omit<FicheTechnique, 'id' | 'updatedAt'> & { id?: string }): FicheTechnique {
    const now = new Date().toISOString();
    let saved: FicheTechnique;

    if (recipe.id) {
      this.db.recipes = this.db.recipes.map((r) => {
        if (r.id === recipe.id) {
          saved = { ...r, ...recipe, updatedAt: now };
          return saved;
        }
        return r;
      });
      // @ts-ignore
      if (!saved) {
        saved = { ...recipe, id: recipe.id, updatedAt: now } as FicheTechnique;
        this.db.recipes.push(saved);
      }
    } else {
      saved = {
        ...recipe,
        id: 'rec_' + Date.now(),
        updatedAt: now,
      } as FicheTechnique;
      this.db.recipes.push(saved);
    }

    this.saveDatabase();
    return saved!;
  }

  public deleteRecipe(id: string) {
    this.db.recipes = this.db.recipes.filter((r) => r.id !== id);
    this.saveDatabase();
  }

  // --- Dish Sales & Automatic Stock Deduction ---
  public getDishSales(): DishSale[] {
    return this.db.dishSales;
  }

  // Recursively collect all raw ingredient deductions for a recipe
  private collectRawIngredientsDeductions(
    recipeId: string,
    portionsMultiplier: number
  ): Map<string, number> {
    const deductions = new Map<string, number>();
    const recipe = this.db.recipes.find((r) => r.id === recipeId);
    if (!recipe) return deductions;

    // Direct ingredients
    recipe.ingredients.forEach((ing) => {
      const qty = ing.quantity * portionsMultiplier;
      deductions.set(ing.materialId, (deductions.get(ing.materialId) || 0) + qty);
    });

    // Composite items
    if (recipe.compositeItems) {
      recipe.compositeItems.forEach((comp) => {
        const subDeductions = this.collectRawIngredientsDeductions(
          comp.dishId,
          comp.quantity * portionsMultiplier
        );
        subDeductions.forEach((qty, matId) => {
          deductions.set(matId, (deductions.get(matId) || 0) + qty);
        });
      });
    }

    return deductions;
  }

  public recordDishSale(
    dishId: string,
    quantity: number,
    unitPrice: number,
    department: 'cuisine' | 'bar',
    notes?: string
  ): DishSale {
    const recipe = this.db.recipes.find((r) => r.id === dishId);
    const unitFoodCost = recipe ? this.calculateRecipeFoodCost(dishId) : 0;
    const totalCost = Number((unitFoodCost * quantity).toFixed(2));
    const totalAmount = Number((unitPrice * quantity).toFixed(2));
    const grossProfit = Number((totalAmount - totalCost).toFixed(2));
    const marginPercent = totalAmount > 0 ? Number(((grossProfit / totalAmount) * 100).toFixed(1)) : 0;

    const saleId = 'sale_' + Date.now();
    const sale: DishSale = {
      id: saleId,
      date: new Date().toISOString(),
      dishId,
      quantity,
      unitPrice,
      totalAmount,
      calculatedCost: totalCost,
      grossProfit,
      marginPercent,
      department,
      autoDeducted: true,
      notes,
    };

    // Auto-deduct raw materials from stock & log stock movements
    const deductions = this.collectRawIngredientsDeductions(dishId, quantity);
    deductions.forEach((qty, matId) => {
      const mat = this.db.materials.find((m) => m.id === matId);
      if (mat) {
        mat.currentStock = Number(Math.max(0, mat.currentStock - qty).toFixed(3));
        mat.updatedAt = new Date().toISOString();

        const mov: StockMovement = {
          id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          date: new Date().toISOString(),
          materialId: mat.id,
          type: 'out_dish_sale',
          quantity: Number(qty.toFixed(3)),
          unitPrice: mat.unitCost,
          totalValue: Number((qty * mat.unitCost).toFixed(2)),
          referenceId: saleId,
          reason: `مبيعات أطباق: ${recipe?.name || 'طبق'} (الكمية: ${quantity})`,
          operatorName: 'نظام المبيعات (POS)',
        };
        this.db.movements.unshift(mov);
      }
    });

    this.db.dishSales.unshift(sale);
    this.saveDatabase();
    return sale;
  }

  public deleteDishSale(id: string, restoreIngredientsStock: boolean = true) {
    const sale = this.db.dishSales.find((s) => s.id === id);
    if (sale && restoreIngredientsStock) {
      // Restore deducted raw materials
      const relatedMovs = this.db.movements.filter((m) => m.referenceId === id);
      relatedMovs.forEach((mov) => {
        const mat = this.db.materials.find((m) => m.id === mov.materialId);
        if (mat) {
          mat.currentStock = Number((mat.currentStock + mov.quantity).toFixed(3));
          mat.updatedAt = new Date().toISOString();
        }
      });
    }
    // Remove related movement records
    this.db.movements = this.db.movements.filter((m) => m.referenceId !== id);
    this.db.dishSales = this.db.dishSales.filter((s) => s.id !== id);
    this.saveDatabase();
  }

  // --- Waste Tracking ---
  public getWasteRecords(): WasteRecord[] {
    return this.db.wasteRecords;
  }

  public recordWaste(data: Omit<WasteRecord, 'id' | 'totalCost'>): WasteRecord {
    const mat = this.db.materials.find((m) => m.id === data.materialId);
    const unitPrice = data.unitPrice || mat?.unitCost || 0;
    const totalCost = Number((data.quantity * unitPrice).toFixed(2));
    const wasteId = 'wst_' + Date.now();

    const record: WasteRecord = {
      ...data,
      id: wasteId,
      unitPrice,
      totalCost,
    };

    // Deduct from stock
    if (mat) {
      mat.currentStock = Number(Math.max(0, mat.currentStock - data.quantity).toFixed(3));
      mat.updatedAt = new Date().toISOString();

      const mov: StockMovement = {
        id: 'mov_' + Date.now(),
        date: data.date || new Date().toISOString(),
        materialId: mat.id,
        type: 'out_waste',
        quantity: data.quantity,
        unitPrice,
        totalValue: totalCost,
        referenceId: wasteId,
        reason: `هدر وتالف (${data.reason}) - ${data.notes || ''}`,
        operatorName: data.reportedBy,
      };
      this.db.movements.unshift(mov);
    }

    this.db.wasteRecords.unshift(record);
    this.saveDatabase();
    return record;
  }

  public deleteWasteRecord(id: string, restoreStock: boolean = true) {
    const record = this.db.wasteRecords.find((w) => w.id === id);
    if (record && restoreStock) {
      const mat = this.db.materials.find((m) => m.id === record.materialId);
      if (mat) {
        mat.currentStock = Number((mat.currentStock + record.quantity).toFixed(3));
        mat.updatedAt = new Date().toISOString();
      }
    }
    this.db.movements = this.db.movements.filter((m) => m.referenceId !== id);
    this.db.wasteRecords = this.db.wasteRecords.filter((w) => w.id !== id);
    this.saveDatabase();
  }

  // --- Consumption Tracking ---
  public getConsumptions(): ConsumptionRecord[] {
    return this.db.consumptionRecords;
  }

  public recordConsumption(data: Omit<ConsumptionRecord, 'id' | 'totalValue'>): ConsumptionRecord {
    const mat = this.db.materials.find((m) => m.id === data.materialId);
    const unitPrice = data.unitPrice || mat?.unitCost || 0;
    const totalValue = Number((data.quantity * unitPrice).toFixed(2));
    const consumptionId = 'cns_' + Date.now();

    const record: ConsumptionRecord = {
      ...data,
      id: consumptionId,
      unitPrice,
      totalValue,
    };

    if (mat) {
      mat.currentStock = Number(Math.max(0, mat.currentStock - data.quantity).toFixed(3));
      mat.updatedAt = new Date().toISOString();

      const mov: StockMovement = {
        id: 'mov_' + Date.now(),
        date: data.date || new Date().toISOString(),
        materialId: mat.id,
        type: data.department === 'bar' ? 'out_bar' : 'out_kitchen',
        quantity: data.quantity,
        unitPrice,
        totalValue,
        referenceId: consumptionId,
        reason: `صرف استهلاك ${data.department === 'bar' ? 'البار' : 'المطبخ'} (${data.shift})`,
        operatorName: data.requestedBy || 'أمين المخزن',
      };
      this.db.movements.unshift(mov);
    }

    this.db.consumptionRecords.unshift(record);
    this.saveDatabase();
    return record;
  }

  public deleteConsumptionRecord(id: string, restoreStock: boolean = true) {
    const record = this.db.consumptionRecords.find((c) => c.id === id);
    if (record && restoreStock) {
      const mat = this.db.materials.find((m) => m.id === record.materialId);
      if (mat) {
        mat.currentStock = Number((mat.currentStock + record.quantity).toFixed(3));
        mat.updatedAt = new Date().toISOString();
      }
    }
    this.db.movements = this.db.movements.filter((m) => m.referenceId !== id);
    this.db.consumptionRecords = this.db.consumptionRecords.filter((c) => c.id !== id);
    this.saveDatabase();
  }

  // --- Stock Audits ---
  public getAudits(): StockAudit[] {
    return this.db.audits;
  }

  public saveAudit(audit: StockAudit): StockAudit {
    const existingIndex = this.db.audits.findIndex((a) => a.id === audit.id);
    if (existingIndex >= 0) {
      this.db.audits[existingIndex] = audit;
    } else {
      this.db.audits.unshift(audit);
    }
    this.saveDatabase();
    return audit;
  }

  public reconcileAudit(auditId: string): StockAudit | null {
    const audit = this.db.audits.find((a) => a.id === auditId);
    if (!audit || audit.status === 'reconciled') return audit || null;

    audit.items.forEach((item) => {
      const mat = this.db.materials.find((m) => m.id === item.materialId);
      if (mat && item.variance !== 0) {
        const prevStock = mat.currentStock;
        mat.currentStock = item.countedStock;
        mat.updatedAt = new Date().toISOString();

        const mov: StockMovement = {
          id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          date: new Date().toISOString(),
          materialId: mat.id,
          type: 'audit_reconciliation',
          quantity: Math.abs(item.variance),
          unitPrice: item.unitPrice,
          totalValue: Math.abs(item.varianceValue),
          referenceId: audit.id,
          reason: `تسوية جرد فعلي (${audit.auditNumber}): من ${prevStock} إلى ${item.countedStock}`,
          operatorName: audit.auditorName,
        };
        this.db.movements.unshift(mov);
      }
    });

    audit.status = 'reconciled';
    audit.reconciledAt = new Date().toISOString();
    this.saveDatabase();
    return audit;
  }

  public deleteAudit(id: string) {
    this.db.audits = this.db.audits.filter((a) => a.id !== id);
    this.saveDatabase();
  }

  // --- WhatsApp Logs ---
  public getWhatsAppLogs(): WhatsAppLog[] {
    return this.db.whatsappLogs;
  }

  public logWhatsApp(log: Omit<WhatsAppLog, 'id' | 'date'>) {
    this.db.whatsappLogs.unshift({
      ...log,
      id: 'wa_' + Date.now(),
      date: new Date().toISOString(),
    });
    this.saveDatabase();
  }

  // --- Cloudflare Sync & Config ---
  public getCloudflareConfig(): CloudflareConfig {
    return this.db.cloudflareConfig;
  }

  public saveCloudflareConfig(config: Partial<CloudflareConfig>) {
    this.db.cloudflareConfig = {
      ...this.db.cloudflareConfig,
      ...config,
    };
    this.saveDatabase();
  }

  public async syncWithCloudflare(): Promise<{ success: boolean; message: string }> {
    const { workerUrl, apiToken } = this.db.cloudflareConfig;
    if (!workerUrl) {
      return { success: false, message: 'يرجى إدخال رابط Cloudflare Worker أولاً' };
    }

    try {
      this.db.cloudflareConfig.syncStatus = 'syncing';
      this.saveDatabase();

      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(this.db),
      });

      if (!res.ok) {
        throw new Error(`خطأ من الخادم: ${res.status} ${res.statusText}`);
      }

      this.db.cloudflareConfig.syncStatus = 'synced';
      this.db.cloudflareConfig.lastSync = new Date().toISOString();
      this.db.cloudflareConfig.lastError = undefined;
      this.saveDatabase();
      return { success: true, message: 'تمت المزامنة بنجاح مع Cloudflare Worker و D1 Database!' };
    } catch (err: any) {
      this.db.cloudflareConfig.syncStatus = 'error';
      this.db.cloudflareConfig.lastError = err.message;
      this.saveDatabase();
      return { success: false, message: `فشلت المزامنة: ${err.message}` };
    }
  }

  // --- Purchase Orders (طلب المواد من الموردين) ---
  public getPurchaseOrders(): PurchaseOrder[] {
    return this.db.purchaseOrders || [];
  }

  public savePurchaseOrder(order: Omit<PurchaseOrder, 'id'> & { id?: string }): PurchaseOrder {
    if (!this.db.purchaseOrders) this.db.purchaseOrders = [];
    let saved: PurchaseOrder;

    if (order.id) {
      this.db.purchaseOrders = this.db.purchaseOrders.map((o) => {
        if (o.id === order.id) {
          saved = { ...o, ...order };
          return saved;
        }
        return o;
      });
      // @ts-ignore
      if (!saved) {
        saved = { ...order, id: order.id } as PurchaseOrder;
        this.db.purchaseOrders.unshift(saved);
      }
    } else {
      saved = {
        ...order,
        id: 'ord_' + Date.now(),
      } as PurchaseOrder;
      this.db.purchaseOrders.unshift(saved);
    }

    this.saveDatabase();
    return saved!;
  }

  public deletePurchaseOrder(id: string) {
    if (!this.db.purchaseOrders) return;
    this.db.purchaseOrders = this.db.purchaseOrders.filter((o) => o.id !== id);
    this.saveDatabase();
  }

  public updateOrderStatus(id: string, status: PurchaseOrder['status']) {
    if (!this.db.purchaseOrders) return;
    const ord = this.db.purchaseOrders.find((o) => o.id === id);
    if (ord) {
      ord.status = status;
      this.saveDatabase();
    }
  }

  public convertOrderToInvoice(orderId: string): SupplierInvoice | null {
    if (!this.db.purchaseOrders) return null;
    const order = this.db.purchaseOrders.find((o) => o.id === orderId);
    if (!order) return null;

    const invoiceItems = order.items.map((item) => {
      const mat = this.db.materials.find((m) => m.id === item.materialId);
      const unitPrice = item.estimatedPrice || mat?.purchasePrice || 0;
      return {
        materialId: item.materialId,
        quantity: item.quantity,
        unitPriceHT: unitPrice,
        totalHT: Number((item.quantity * unitPrice).toFixed(2)),
      };
    });

    const subtotalHT = invoiceItems.reduce((acc, it) => acc + it.totalHT, 0);
    const tvaRate = 19;
    const tvaAmount = Number(((subtotalHT * tvaRate) / 100).toFixed(2));
    const totalTTC = Number((subtotalHT + tvaAmount).toFixed(2));

    const invoice = this.saveInvoice({
      invoiceNumber: 'FAC-REC-' + order.orderNumber,
      date: new Date().toISOString().split('T')[0],
      supplierId: order.supplierId,
      items: invoiceItems,
      subtotalHT,
      tvaRate,
      tvaAmount,
      totalTTC,
      status: 'paid',
      paymentMethod: 'bank_transfer',
      notes: `تم توليد الفاتورة آلياً بناءً على طلبية التوريد المستلمة رقم ${order.orderNumber}`,
    });

    order.status = 'delivered';
    this.saveDatabase();
    return invoice;
  }

  // --- Backup & Restore ---
  public exportDatabaseJson(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importDatabaseJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.materials)) {
        this.db = {
          ...DEFAULT_DATABASE,
          ...parsed,
        };
        this.saveDatabase();
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON database format', e);
    }
    return false;
  }

  public resetToDemoData() {
    this.db = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    this.saveDatabase();
  }

  public clearAllData() {
    this.db = JSON.parse(JSON.stringify(EMPTY_DATABASE));
    this.saveDatabase();
  }
}

export const dbService = new DBService();
