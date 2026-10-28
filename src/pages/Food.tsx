// ===== 分頁「飲食」：飲食紀錄與熱量計算（模組三 3-4、3-5；模組四為第二階段） =====
import { useMemo, useState } from 'react';
import { FoodArt } from '../components/FoodArt';
import { Sticker } from '../components/Sticker';
import { foodByName, FOODS, GRADE_LABEL, type FoodItem } from '../data/foods';
import { PhotoLog } from '../features/food/PhotoLog';
import { Macros, RecipeSuggest } from '../features/food/RecipeSuggest';
import { toKey } from '../lib/date';
import { useDay, useStore } from '../store/AppStore';
import type { FoodEntry, MealSlot } from '../types';

const MEALS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: '早餐' }, { id: 'lunch', label: '午餐' }, { id: 'dinner', label: '晚餐' }, { id: 'snack', label: '點心' },
];

function defaultMeal(): MealSlot {
  const h = new Date().getHours();
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

type Mode = 'photo' | 'search' | 'recent' | 'manual';

export function Food() {
  const today = toKey();
  const { data, summary, addFood, removeFood, updateFood } = useStore();
  const day = useDay(today);
  const [meal, setMeal] = useState<MealSlot>(defaultMeal);
  const [mode, setMode] = useState<Mode>('photo');
  const [q, setQ] = useState('');
  const [manual, setManual] = useState({ name: '', kcal: '', protein: '' });

  const results = useMemo(
    () => FOODS.filter((f) => !q || f.name.includes(q) || f.category.includes(q) || (f.where ?? '').includes(q) || (f.tip ?? '').includes(q)).slice(0, q ? 60 : 30),
    [q],
  );
  const recent = useMemo(() => {
    const seen = new Map<string, FoodEntry>();
    [...data.foods].reverse().forEach((f) => f.name !== '這一餐' && !seen.has(f.name) && seen.set(f.name, f));
    return [...seen.values()].slice(0, 12);
  }, [data.foods]);

  const add = (f: { name: string; kcal: number; proteinG?: number; carbsG?: number; fatG?: number }, source: FoodEntry['source']) =>
    addFood({ date: today, meal, name: f.name, kcal: f.kcal, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, source });

  const remaining = summary ? summary.targetKcal - day.eaten + (data.settings.addBackExerciseKcal ? day.burned : 0) : 0;

  return (
    <div className="page">
      <header className="page-head">
        <h1>飲食</h1>
        <span className="tag fill num">剩 {remaining} 大卡</span>
      </header>

      <section className="card">
        <h2>新增到</h2>
        <div className="chips">
          {MEALS.map((m) => (
            <button key={m.id} className="chip" aria-pressed={meal === m.id} onClick={() => setMeal(m.id)}>{m.label}</button>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <button className="chip" aria-pressed={mode === 'photo'} onClick={() => setMode('photo')}>拍照記錄</button>
          <button className="chip" aria-pressed={mode === 'search'} onClick={() => setMode('search')}>搜尋食物</button>
          <button className="chip" aria-pressed={mode === 'recent'} onClick={() => setMode('recent')}>常吃／最近</button>
          <button className="chip" aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}>手動輸入</button>
          <button className="chip" disabled title="第二階段">掃條碼</button>
        </div>

        {mode === 'photo' && <PhotoLog date={today} meal={meal} onSave={addFood} />}

        {mode === 'search' && (
          <div className="stack" style={{ marginTop: 12 }}>
            <input className="input" placeholder="搜尋：雞胸、便當、豆漿、手搖飲…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="list">
              {results.map((f) => <FoodRow key={f.id} f={f} onAdd={() => add(f, 'search')} />)}
              {!results.length && <p className="empty">找不到，改用手動輸入吧。</p>}
            </div>
          </div>
        )}

        {mode === 'recent' && (
          <div className="list" style={{ marginTop: 8 }}>
            {recent.map((f) => (
              <div key={f.name} className="list-item">
                <FoodArt art={foodByName(f.name)?.art} size={44} />
                <span className="grow"><span className="title">{f.name}</span><span className="muted" style={{ display: 'block' }}>{f.kcal} 大卡</span></span>
                <button className="btn sm" onClick={() => add(f, 'recent')}>＋</button>
              </div>
            ))}
            {!recent.length && <p className="empty">還沒有紀錄，記過的食物會出現在這裡。</p>}
          </div>
        )}

        {mode === 'manual' && (
          <form
            className="stack" style={{ marginTop: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!manual.name || !manual.kcal) return;
              add({ name: manual.name, kcal: +manual.kcal, proteinG: manual.protein ? +manual.protein : undefined }, 'manual');
              setManual({ name: '', kcal: '', protein: '' });
            }}
          >
            <input className="input" placeholder="食物名稱" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
            <div className="grid2">
              <input className="input num" type="number" placeholder="熱量（大卡）" value={manual.kcal} onChange={(e) => setManual({ ...manual, kcal: e.target.value })} />
              <input className="input num" type="number" placeholder="蛋白質（g）" value={manual.protein} onChange={(e) => setManual({ ...manual, protein: e.target.value })} />
            </div>
            <button className="btn primary" type="submit">加入</button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>今天吃了 <span className="num">{day.eaten} 大卡</span></h2>
        {MEALS.map((m) => {
          const items = day.foods.filter((f) => f.meal === m.id);
          if (!items.length) return null;
          return (
            <div key={m.id} className="stack" style={{ gap: 0, marginBottom: 8 }}>
              <span className="eyebrow">{m.label}</span>
              <div className="list">
                {items.map((f) => (
                  <div key={f.id} className="list-item">
                    {f.photoId ? <Sticker photoId={f.photoId} size={44} label={f.name} /> : foodByName(f.name)?.art && <FoodArt art={foodByName(f.name)!.art} size={40} />}
                    <span className="grow title">{f.name}</span>
                    {f.kcal > 0 ? (
                      <span className="num">{f.kcal}</span>
                    ) : (
                      <input
                        className="input num kcal-fill"
                        type="number"
                        inputMode="numeric"
                        placeholder="補熱量"
                        aria-label={`${f.name} 的熱量`}
                        onBlur={(e) => e.target.value && updateFood(f.id, { kcal: Math.max(0, +e.target.value) })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                    )}
                    <button className="link" onClick={() => removeFood(f.id)} aria-label={`刪除 ${f.name}`}>刪除</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!day.foods.length && <p className="empty">今天還沒記錄，從上方新增第一餐。</p>}
      </section>

      <RecipeSuggest date={today} meal={meal} onMeal={setMeal} />
    </div>
  );
}

function FoodRow({ f, onAdd }: { f: FoodItem; onAdd: () => void }) {
  return (
    <div className="list-item food-row">
      <FoodArt art={f.art} size={56} label={f.name} />
      <span className="grow">
        <span className="row wrap" style={{ gap: 6 }}>
          <span className="title">{f.name}</span>
          <span className={`tag grade-${f.grade}`}>{GRADE_LABEL[f.grade]}</span>
        </span>
        <span className="muted" style={{ display: 'block' }}>{f.serving}</span>
        <Macros f={f} />
      </span>
      <button className="btn sm" onClick={onAdd} aria-label={`加入 ${f.name}`}>＋</button>
    </div>
  );
}
