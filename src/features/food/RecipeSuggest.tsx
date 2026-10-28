// ===== 建議吃什麼（模組四・食譜建議）：資料來自 Notion 飲食資料庫 =====
import { useMemo, useState } from 'react';
import { FoodArt } from '../../components/FoodArt';
import { comboItems, DRINK_SUGAR, DRINK_TOPPINGS, GRADE_LABEL, type FoodItem, type FoodWhere } from '../../data/foods';
import { mealBudget, suggestCombos, suggestMeals } from '../../lib/recipes';
import { MODE_LABEL } from '../onboarding/options';
import { useDay, useStore } from '../../store/AppStore';
import type { FoodEntry, MealSlot } from '../../types';

const MEAL_LABEL: Record<MealSlot, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };
type Tab = 'meal' | 'combo';

export function RecipeSuggest({ date, meal, onMeal }: { date: string; meal: MealSlot; onMeal: (m: MealSlot) => void }) {
  const { data, summary, addFood } = useStore();
  const day = useDay(date);
  const [tab, setTab] = useState<Tab>('meal');
  const [where, setWhere] = useState<FoodWhere | null>(null);
  const [page, setPage] = useState(0);
  const [added, setAdded] = useState<string | null>(null);

  const remaining = summary ? summary.targetKcal - day.eaten + (data.settings.addBackExerciseKcal ? day.burned : 0) : 0;
  const proteinLeft = summary ? Math.max(0, summary.protein[0] - day.protein) : 0;
  const mode = summary?.mode ?? 'maintain';
  const eatenMeals = [...new Set(day.foods.map((f) => f.meal))];
  const ctx = { meal, remainingKcal: remaining, proteinLeftG: proteinLeft, mode, eatenMeals, where, dailyKcal: summary?.targetKcal };
  const budget = mealBudget(ctx);
  const all = useMemo(() => suggestMeals(ctx, 15), [meal, remaining, proteinLeft, mode, where, eatenMeals.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = all.slice((page * 5) % Math.max(5, all.length), ((page * 5) % Math.max(5, all.length)) + 5);
  const combos = useMemo(() => suggestCombos(meal, mode), [meal, mode]);

  const add = (f: FoodItem) => {
    const entry: Omit<FoodEntry, 'id'> = { date, meal, name: f.name, kcal: f.kcal, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, source: 'search' };
    addFood(entry);
    setAdded(f.name);
    window.setTimeout(() => setAdded(null), 1600);
  };

  return (
    <section className="card recipe">
      <div className="between">
        <h2>建議吃什麼</h2>
        <span className="tag">{MODE_LABEL[mode]}</span>
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {(Object.keys(MEAL_LABEL) as MealSlot[]).map((m) => (
          <button key={m} className="chip" aria-pressed={meal === m} onClick={() => { onMeal(m); setPage(0); }}>{MEAL_LABEL[m]}</button>
        ))}
      </div>

      <div className="budget">
        {remaining > 0 ? (
          <>
            <span>這餐建議</span>
            <b className="num">約 {budget}</b>
            <span>大卡</span>
            <small>今天還剩 {remaining} 大卡・蛋白質還差 {Math.round(proteinLeft)} g</small>
          </>
        ) : (
          <small>今天的熱量已經吃滿了，下面優先列出低熱量、高蛋白的選擇。</small>
        )}
      </div>

      {meal !== 'snack' && (
        <div className="chips">
          <button className="chip sm" aria-pressed={tab === 'meal' && !where} onClick={() => { setTab('meal'); setWhere(null); setPage(0); }}>全部</button>
          <button className="chip sm" aria-pressed={tab === 'meal' && where === '外食'} onClick={() => { setTab('meal'); setWhere('外食'); setPage(0); }}>外食</button>
          <button className="chip sm" aria-pressed={tab === 'meal' && where === '自煮'} onClick={() => { setTab('meal'); setWhere('自煮'); setPage(0); }}>自己煮</button>
          <button className="chip sm" aria-pressed={tab === 'combo'} onClick={() => setTab('combo')}>超商組合</button>
        </div>
      )}

      {(tab === 'meal' || meal === 'snack') && (
        <>
          <div className="list">
            {shown.map(({ food, reasons }) => (
              <div key={food.id} className="list-item food-row">
                <FoodArt art={food.art} size={64} label={food.name} />
                <span className="grow">
                  <span className="row wrap" style={{ gap: 6 }}>
                    <span className="title">{food.name}</span>
                    {food.where && <span className="tag">{food.where}</span>}
                  </span>
                  <span className="muted" style={{ display: 'block' }}>{food.serving}</span>
                  <Macros f={food} />
                  {reasons.length > 0 && (
                    <span className="reasons">{reasons.map((r) => <i key={r} className={r === '會超過' ? 'bad' : ''}>{r}</i>)}</span>
                  )}
                  {food.tip && <span className="tip">{food.tip}</span>}
                </span>
                <button className="btn sm primary" onClick={() => add(food)} aria-label={`加入 ${food.name} 到${MEAL_LABEL[meal]}`}>＋</button>
              </div>
            ))}
            {!shown.length && <p className="empty">沒有符合的餐點</p>}
          </div>
          {all.length > 5 && (
            <button className="btn sm block" style={{ marginTop: 8 }} onClick={() => setPage((p) => p + 1)}>換一批</button>
          )}
        </>
      )}

      {tab === 'combo' && meal !== 'snack' && (
        <div className="stack">
          {combos.map((c) => (
            <div key={c.id} className="card flat combo">
              <div className="between">
                <b>{c.title}</b>
                <span className={`tag ${c.goal === '增肌' ? 'fill' : c.goal === '減脂' ? 'dark' : ''}`}>{c.goal}</span>
              </div>
              <div className="combo-items">
                {comboItems(c).map((f, i) => (
                  <span key={i} className="combo-item"><FoodArt art={f.art} size={52} /><small>{f.name}</small></span>
                ))}
              </div>
              <span className="macros">
                <b className="num">{c.totals.kcal}</b><span>大卡</span>
                <i>蛋白 <b className="num">{c.totals.proteinG}</b>g</i>
                <i>碳水 <b className="num">{c.totals.carbsG}</b>g</i>
                <i>脂肪 <b className="num">{c.totals.fatG}</b>g</i>
              </span>
              <p className="muted">{c.note}</p>
              <button
                className="btn sm primary"
                onClick={() => {
                  comboItems(c).forEach((f) => addFood({ date, meal, name: f.name, kcal: f.kcal, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, source: 'search' }));
                  setAdded(c.title);
                  window.setTimeout(() => setAdded(null), 1600);
                }}
              >
                整組加入{MEAL_LABEL[meal]}
              </button>
            </div>
          ))}
        </div>
      )}

      {meal === 'snack' && (
        <details className="drink-ref">
          <summary>手搖飲速查（大杯 700ml）</summary>
          <div className="ref-grid">
            <div>
              <b>甜度多加</b>
              {DRINK_SUGAR.map((s) => <div key={s.label} className="between"><span>{s.label}</span><span className="num">+{s.kcal}</span></div>)}
            </div>
            <div>
              <b>加料一份</b>
              {DRINK_TOPPINGS.map((s) => <div key={s.label} className="between"><span>{s.label}</span><span className="num">+{s.kcal}</span></div>)}
            </div>
          </div>
        </details>
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>資料來源：Notion 飲食資料庫（數值為常見份量估計，誤差約 ±15%）</p>
      {added && <div className="toast" role="status">已加入{MEAL_LABEL[meal]}：{added}</div>}
    </section>
  );
}

export function Macros({ f }: { f: Pick<FoodItem, 'kcal' | 'proteinG' | 'carbsG' | 'fatG'> }) {
  return (
    <span className="macros">
      <b className="num">{f.kcal}</b><span>大卡</span>
      <i>蛋白 <b className="num">{f.proteinG}</b>g</i>
      <i>碳水 <b className="num">{f.carbsG}</b>g</i>
      <i>脂肪 <b className="num">{f.fatG}</b>g</i>
    </span>
  );
}

export { GRADE_LABEL };
