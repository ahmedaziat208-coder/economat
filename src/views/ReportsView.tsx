import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { BarChart3, TrendingUp, Calendar, FileText, ArrowRight, Layers } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ReportsViewProps {
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [, forceUpdate] = useState(0);
  useEffect(() => dbService.subscribe(() => forceUpdate((c) => c + 1)), []);
  const db = dbService.getSnapshot();

  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  // Compute category breakdown
  const categoryValues: Record<string, number> = {};
  db.materials.forEach((m) => {
    const val = m.currentStock * m.unitCost;
    categoryValues[m.category] = (categoryValues[m.category] || 0) + val;
  });

  const categoryLabels = Object.keys(categoryValues).map(
    (c) => t[`cat_${c}` as keyof typeof t] || c
  );
  const categoryDataPoints = Object.values(categoryValues);

  const doughnutData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryDataPoints,
        backgroundColor: [
          '#f59e0b',
          '#10b981',
          '#3b82f6',
          '#ec4899',
          '#8b5cf6',
          '#06b6d4',
          '#f97316',
          '#14b8a6',
          '#64748b',
        ],
        borderColor: '#171717',
        borderWidth: 2,
      },
    ],
  };

  // Top Consumed items
  const consumptionByMaterial: Record<string, number> = {};
  db.consumptionRecords.forEach((c) => {
    consumptionByMaterial[c.materialId] =
      (consumptionByMaterial[c.materialId] || 0) + c.totalValue;
  });
  db.dishSales.forEach((s) => {
    // Also include sales consumption
    consumptionByMaterial[s.dishId] = (consumptionByMaterial[s.dishId] || 0) + s.calculatedCost;
  });

  const sortedTopMaterials = Object.entries(consumptionByMaterial)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const topLabels = sortedTopMaterials.map(([id]) => {
    const mat = db.materials.find((m) => m.id === id);
    const dish = db.recipes.find((r) => r.id === id);
    return mat?.name || dish?.name || id;
  });

  const topValues = sortedTopMaterials.map(([, val]) => val);

  const barChartData = {
    labels: topLabels,
    datasets: [
      {
        label: `قيمة الاستهلاك (${t.currency})`,
        data: topValues,
        backgroundColor: '#f59e0b',
        borderRadius: 6,
      },
    ],
  };

  // Waste reasons breakdown
  const wasteByReason: Record<string, number> = {};
  db.wasteRecords.forEach((w) => {
    wasteByReason[w.reason] = (wasteByReason[w.reason] || 0) + w.totalCost;
  });

  const wasteLabels = Object.keys(wasteByReason).map(
    (r) => t[`reason_${r}` as keyof typeof t] || r
  );
  const wasteData = Object.values(wasteByReason);

  const wasteChartData = {
    labels: wasteLabels,
    datasets: [
      {
        data: wasteData,
        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#6366f1', '#64748b'],
        borderColor: '#171717',
        borderWidth: 2,
      },
    ],
  };

  // Monthly Equation
  const startingStockValue = 185000;
  const monthlyPurchases = db.invoices.reduce((a, inv) => a + inv.subtotalHT, 0);
  const monthlyConsumptions = db.consumptionRecords.reduce((a, c) => a + c.totalValue, 0);
  const monthlySalesCost = db.dishSales.reduce((a, s) => a + s.calculatedCost, 0);
  const monthlyWaste = db.wasteRecords.reduce((a, w) => a + w.totalCost, 0);
  const estimatedClosingStock =
    startingStockValue + monthlyPurchases - (monthlyConsumptions + monthlySalesCost) - monthlyWaste;

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold text-white">{t.reportsTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="2026-10">أكتوبر 2026 (الشهر الحالي)</option>
            <option value="2026-09">سبتمبر 2026</option>
            <option value="2026-08">أوت 2026</option>
          </select>
        </div>
      </div>

      {/* Monthly Balance Equation Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="font-bold text-xs text-white">{t.monthlyBalanceEquation}</h3>
          <span className="text-[11px] text-neutral-400 font-mono">دورة المخزون المحاسبية</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500">{t.openingStock}</div>
            <div className="text-sm font-bold font-mono text-white tabular-nums mt-1">
              {startingStockValue.toLocaleString()} {t.currency}
            </div>
          </div>

          <div className="p-3 bg-neutral-950 rounded-lg border border-emerald-900/30">
            <div className="text-[10px] text-emerald-400">{t.entriesPurchases}</div>
            <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums mt-1">
              +{monthlyPurchases.toLocaleString()} {t.currency}
            </div>
          </div>

          <div className="p-3 bg-neutral-950 rounded-lg border border-amber-900/30">
            <div className="text-[10px] text-amber-400">{t.exitsSales}</div>
            <div className="text-sm font-bold font-mono text-amber-400 tabular-nums mt-1">
              -{(monthlyConsumptions + monthlySalesCost).toLocaleString()} {t.currency}
            </div>
          </div>

          <div className="p-3 bg-neutral-950 rounded-lg border border-rose-900/30">
            <div className="text-[10px] text-rose-400">{t.wasteDeduction}</div>
            <div className="text-sm font-bold font-mono text-rose-400 tabular-nums mt-1">
              -{monthlyWaste.toLocaleString()} {t.currency}
            </div>
          </div>

          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-700 col-span-2 md:col-span-1">
            <div className="text-[10px] text-neutral-300 font-semibold">{t.closingStock}</div>
            <div className="text-base font-bold font-mono text-amber-400 tabular-nums mt-1">
              {Math.round(estimatedClosingStock).toLocaleString()} {t.currency}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Consumed Materials Bar Chart */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
          <h3 className="font-bold text-xs text-white">{t.topConsumedMaterials}</h3>
          <div className="h-64 flex items-center justify-center">
            {topLabels.length > 0 ? (
              <Bar
                data={barChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${(ctx.parsed.y ?? 0).toLocaleString()} ${t.currency}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#a3a3a3', font: { size: 10 } },
                      grid: { display: false },
                    },
                    y: {
                      ticks: { color: '#a3a3a3', font: { size: 10 } },
                      grid: { color: '#262626' },
                    },
                  },
                }}
              />
            ) : (
              <div className="text-xs text-neutral-500">لا توجد بيانات استهلاك كافية</div>
            )}
          </div>
        </div>

        {/* Stock Valuation by Category Doughnut */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
          <h3 className="font-bold text-xs text-white">{t.consumptionByCategory}</h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#d4d4d4', font: { size: 10 }, boxWidth: 12 },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
