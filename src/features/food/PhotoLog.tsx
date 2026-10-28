// ===== 拍照記錄：拍照或選照片 → 做成圓形貼紙 → 填名稱與熱量 → 存到今天、貼到日曆 =====
import { useEffect, useRef, useState } from 'react';
import { FOODS } from '../../data/foods';
import { uid } from '../../lib/date';
import { deletePhoto, makeSticker, savePhoto } from '../../lib/photoStore';
import type { FoodEntry, MealSlot } from '../../types';

interface Props {
  date: string;
  meal: MealSlot;
  onSave: (entry: Omit<FoodEntry, 'id'>) => void;
}

export function PhotoLog({ date, meal, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [saved, setSaved] = useState(false);

  // 離開畫面時，沒儲存的貼紙就刪掉
  const pending = useRef<string | null>(null);
  useEffect(() => () => {
    if (pending.current) deletePhoto(pending.current);
  }, []);

  async function onFile(file?: File) {
    if (!file) return;
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      const blob = await makeSticker(file);
      const id = `p_${uid()}`;
      await savePhoto(id, blob);
      if (pending.current) deletePhoto(pending.current);
      pending.current = id;
      setPreview({ id, url: URL.createObjectURL(blob) });
    } catch {
      setError('這張照片沒辦法讀取，請換一張試試。');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // 輸入的名稱剛好是資料庫裡的食物時，自動帶入熱量與蛋白質
  function onName(v: string) {
    setName(v);
    const hit = FOODS.find((f) => f.name === v);
    if (hit) {
      setKcal(String(hit.kcal));
      setProtein(String(hit.proteinG));
    }
  }

  function save() {
    if (!preview) return;
    onSave({
      date,
      meal,
      name: name.trim() || '這一餐',
      kcal: kcal ? Math.max(0, +kcal) : 0,
      proteinG: protein ? +protein : undefined,
      source: 'photo',
      photoId: preview.id,
    });
    pending.current = null; // 已儲存，不要刪
    setPreview(null);
    setName('');
    setKcal('');
    setProtein('');
    setSaved(true);
  }

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <input
        ref={fileRef}
        id="food-photo"
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {!preview ? (
        <button className="photo-drop halftone" onClick={() => fileRef.current?.click()} disabled={busy}>
          <span className="photo-drop-inner">
            <b>{busy ? '製作貼紙中…' : '拍照或選一張照片'}</b>
            <span className="muted">照片會變成圓形貼紙，貼在日曆上</span>
          </span>
        </button>
      ) : (
        <div className="photo-form">
          <img className="sticker sticker-pop" src={preview.url} alt="新的飲食貼紙" width={132} height={132} />
          <div className="stack" style={{ flex: 1, minWidth: 0 }}>
            <input className="input" list="food-names" placeholder="吃了什麼？（可留空）" value={name} onChange={(e) => onName(e.target.value)} aria-label="食物名稱" />
            <datalist id="food-names">{FOODS.map((f) => <option key={f.name} value={f.name} />)}</datalist>
            <div className="grid2">
              <input className="input num" type="number" inputMode="numeric" placeholder="熱量 大卡" value={kcal} onChange={(e) => setKcal(e.target.value)} aria-label="熱量（大卡）" />
              <input className="input num" type="number" inputMode="numeric" placeholder="蛋白質 g" value={protein} onChange={(e) => setProtein(e.target.value)} aria-label="蛋白質（克）" />
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="row">
          <button className="btn primary" style={{ flex: 1 }} onClick={save}>貼到今天的日曆</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>重拍</button>
        </div>
      )}
      {error && <p className="notice">{error}</p>}
      {saved && <p className="muted">已貼上！到「日曆」可以看到今天的貼紙。</p>}
      <p className="muted" style={{ fontSize: 13 }}>
        照片只存在這支手機的瀏覽器裡，不會上傳。熱量可以先空著，之後在「今天吃了」清單補上；自動辨識食物與熱量為第二階段功能。
      </p>
    </div>
  );
}
