import React, { useState, useEffect } from 'react';
import { FicheTechnique, DishCategory, UnitType, Language } from '../types';
import { translations } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  UtensilsCrossed,
  Plus,
  Printer,
  Edit2,
  Trash2,
  Clock,
  Flame,
  AlertCircle,
  Layers,
  Percent,
  Coins,
  X,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface RecipesViewProps {
  lang: Language;
  onPrintRecipe: (recipe: FicheTechnique) => void;
}

export const RecipesView: React.FC<RecipesViewProps> = ({ lang, onPrintRecipe }) => {
  const t = translations[lang];
  const db = dbService.getSnapshot();
  const [, setTick] = useState(0);

  useEffect(() => {
    return dbService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<FicheTechnique | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  // Form State
  const initialForm: Omit<FicheTechnique, 'id' | 'updatedAt'> = {
    code: '',
    name: '',
    nameFr: '',
    category: 'burger',
    department: 'cuisine',
    portions: 1,
    prepTimeMin: 5,
    cookTimeMin: 5,
    sellingPrice: 1000,
    tvaRate: 10,
    ingredients: [],
    compositeItems: [],
    steps: [''],
    equipment: [''],
    allergens: ['غلوتين (Gluten)'],
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const filteredRecipes = db.recipes.filter(
    (r) => selectedCategory === 'all' || r.category === selectedCategory
  );

  const handleOpenAdd = () => {
    setEditingRecipe(null);
    setFormData({
      ...initialForm,
      code: 'REC-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: FicheTechnique) => {
    setEditingRecipe(r);
    setFormData({
      code: r.code,
      name: r.name,
      nameFr: r.nameFr || '',
      category: r.category,
      department: r.department,
      portions: r.portions,
      prepTimeMin: r.prepTimeMin,
      cookTimeMin: r.cookTimeMin,
      sellingPrice: r.sellingPrice,
      tvaRate: r.tvaRate,
      ingredients: [...r.ingredients],
      compositeItems: r.compositeItems ? [...r.compositeItems] : [],
      steps: [...r.steps],
      equipment: [...r.equipment],
      allergens: [...r.allergens],
      notes: r.notes || '',
      photoUrl: r.photoUrl,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    dbService.saveRecipe({
      id: editingRecipe ? editingRecipe.id : undefined,
      ...formData,
      ingredients: formData.ingredients.filter((i) => i.materialId && i.quantity > 0),
      steps: formData.steps.filter((s) => s.trim().length > 0),
      equipment: formData.equipment.filter((eq) => eq.trim().length > 0),
    });

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (recipeToDelete) {
      dbService.deleteRecipe(recipeToDelete);
      setRecipeToDelete(null);
    }
  };

  // Dynamic ingredient row additions
  const addIngredientRow = () => {
    const firstMat = db.materials[0];
    if (!firstMat) return;
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { materialId: firstMat.id, quantity: 0.1, unit: firstMat.unit, notes: '' },
      ],
    });
  };

  const removeIngredientRow = (idx: number) => {
    const updated = [...formData.ingredients];
    updated.splice(idx, 1);
    setFormData({ ...formData, ingredients: updated });
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold text-white">{t.ficheTechniqueTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الأصناف ({db.recipes.length})</option>
            <option value="burger">{t.dish_burger}</option>
            <option value="pizza">{t.dish_pizza}</option>
            <option value="main">{t.dish_main}</option>
            <option value="appetizer">{t.dish_appetizer}</option>
            <option value="dessert">{t.dish_dessert}</option>
            <option value="coffee">{t.dish_coffee}</option>
            <option value="cocktail">{t.dish_cocktail}</option>
            <option value="sub_recipe">{t.dish_sub_recipe}</option>
          </select>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewRecipe}</span>
          </button>
        </div>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRecipes.map((recipe) => {
          const foodCost = dbService.calculateRecipeFoodCost(recipe.id);
          const margin = recipe.sellingPrice - foodCost;
          const foodCostPct =
            recipe.sellingPrice > 0 ? ((foodCost / recipe.sellingPrice) * 100).toFixed(1) : '0';

          return (
            <div
              key={recipe.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col hover:border-neutral-700 transition-all shadow-sm group"
            >
              {/* Photo Banner if available */}
              {recipe.photoUrl && (
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-950 border-b border-neutral-800">
                  <img
                    src={recipe.photoUrl}
                    alt={recipe.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-neutral-900/85 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-400">
                    {recipe.code}
                  </div>
                  <div className="absolute top-2 right-2 bg-neutral-900/85 backdrop-blur px-2 py-0.5 rounded text-[10px] text-neutral-300">
                    {t[`dish_${recipe.category}` as keyof typeof t] || recipe.category}
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Title & Metadata */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                        {recipe.name}
                      </h3>
                      {recipe.nameFr && (
                        <div className="text-xs text-neutral-400 italic mt-0.5">
                          {recipe.nameFr}
                        </div>
                      )}
                    </div>
                    {!recipe.photoUrl && (
                      <span className="font-mono text-[10px] bg-neutral-950 px-2 py-0.5 rounded text-neutral-400 border border-neutral-800">
                        {recipe.code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{recipe.prepTimeMin + recipe.cookTimeMin} دقيقة</span>
                    </span>
                    <span>·</span>
                    <span>{recipe.portions} حصة</span>
                    <span>·</span>
                    <span>{recipe.department === 'bar' ? 'بار' : 'مطبخ'}</span>
                  </div>
                </div>

                {/* Financial KPI Strip */}
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-500">Food Cost</div>
                    <div className="font-mono font-bold text-amber-400 tabular-nums">
                      {foodCost} {t.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500">سعر البيع</div>
                    <div className="font-mono font-bold text-emerald-400 tabular-nums">
                      {recipe.sellingPrice} {t.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500">النسبة %</div>
                    <div className="font-mono font-bold text-neutral-200 tabular-nums">
                      {foodCostPct}%
                    </div>
                  </div>
                </div>

                {/* Composite Sub-Recipe notice */}
                {recipe.compositeItems && recipe.compositeItems.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>يحتوي على {recipe.compositeItems.length} وصفات فرعية مركبة</span>
                  </div>
                )}

                {/* Allergens tags */}
                {recipe.allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.allergens.map((alg, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-900/40 px-1.5 py-0.5 rounded"
                      >
                        {alg}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <button
                    onClick={() => onPrintRecipe(recipe)}
                    className="flex items-center gap-1 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.printFiche}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(recipe)}
                      className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRecipeToDelete(recipe.id)}
                      title={t.delete}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingRecipe ? 'تعديل البطاقة التقنية' : t.addNewRecipe}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.dishName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: برغر تشيزينا"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    الاسم بالفرنسية
                  </label>
                  <input
                    type="text"
                    value={formData.nameFr}
                    onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                    placeholder="Burger Cheesena"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.recipeCode}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.dishCategory}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as DishCategory })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="burger">{t.dish_burger}</option>
                    <option value="pizza">{t.dish_pizza}</option>
                    <option value="main">{t.dish_main}</option>
                    <option value="appetizer">{t.dish_appetizer}</option>
                    <option value="dessert">{t.dish_dessert}</option>
                    <option value="coffee">{t.dish_coffee}</option>
                    <option value="cocktail">{t.dish_cocktail}</option>
                    <option value="sub_recipe">{t.dish_sub_recipe}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.department}
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department: e.target.value as 'cuisine' | 'bar',
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="cuisine">{t.dept_cuisine}</option>
                    <option value="bar">{t.dept_bar}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.sellingPriceTTC} ({t.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Ingredients List Builder */}
              <div className="space-y-2 border-t border-neutral-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400">
                    {t.ingredientsList}
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addIngredient}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800"
                    >
                      <select
                        value={ing.materialId}
                        onChange={(e) => {
                          const mat = db.materials.find((m) => m.id === e.target.value);
                          const updated = [...formData.ingredients];
                          updated[idx] = {
                            ...updated[idx],
                            materialId: e.target.value,
                            unit: mat ? mat.unit : updated[idx].unit,
                          };
                          setFormData({ ...formData, ingredients: updated });
                        }}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white px-2 py-1.5"
                      >
                        {db.materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unitCost} {t.currency}/{m.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.001"
                        value={ing.quantity}
                        onChange={(e) => {
                          const updated = [...formData.ingredients];
                          updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                          setFormData({ ...formData, ingredients: updated });
                        }}
                        placeholder="الكمية"
                        className="w-20 bg-neutral-900 border border-neutral-700 rounded text-xs text-white px-2 py-1.5 font-mono text-center"
                      />

                      <span className="text-xs text-neutral-400 font-mono w-10">
                        {ing.unit}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeIngredientRow(idx)}
                        className="p-1 text-neutral-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Composite Sub-Recipes selection */}
              <div className="border-t border-neutral-800 pt-3">
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  {t.compositeItems}
                </label>
                <p className="text-[11px] text-neutral-400 mb-2">{t.compositeItemsHelp}</p>
                <div className="flex flex-wrap gap-2">
                  {db.recipes
                    .filter((r) => r.category === 'sub_recipe' && r.id !== editingRecipe?.id)
                    .map((sub) => {
                      const isLinked = formData.compositeItems?.some((c) => c.dishId === sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            let updated = formData.compositeItems ? [...formData.compositeItems] : [];
                            if (isLinked) {
                              updated = updated.filter((c) => c.dishId !== sub.id);
                            } else {
                              updated.push({ dishId: sub.id, quantity: 1 });
                            }
                            setFormData({ ...formData, compositeItems: updated });
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                            isLinked
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          {isLinked && <Check className="w-3.5 h-3.5" />}
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Steps & Allergens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-neutral-800 pt-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.prepSteps} (خطوة لكل سطر)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.steps.join('\n')}
                    onChange={(e) =>
                      setFormData({ ...formData, steps: e.target.value.split('\n') })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.allergens} (مفصولة بفاصلة)
                  </label>
                  <input
                    type="text"
                    value={formData.allergens.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allergens: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="غلوتين, حليب, بيض..."
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Recipe Confirmation Modal */}
      <ConfirmModal
        isOpen={!!recipeToDelete}
        title="تأكيد حذف الوصفة / الطبق"
        message={t.confirmDelete || 'هل أنت متأكد من رغبتك في حذف هذه الوصفة نهائياً؟'}
        onConfirm={handleConfirmDelete}
        onClose={() => setRecipeToDelete(null)}
      />
    </div>
  );
};
