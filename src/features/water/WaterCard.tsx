// ===== 喝水：快速加減、自訂毫升數、自訂每日目標（低於建議量時提醒） =====
import { useState } from 'react';
import { NumInput } from '../../components/NumInput';
import { useStore } from '../../store/AppStore';

export const WATER_MIN_ML = 1000;
export const WATER_MAX_ML = 6000;

/** 實際使用的每日目標：自訂優先，否則用建議量 */
export function waterTarget(custom: number | undefined, recommended: number): number {
  return custom && custom >= 300 ? custom : recommended;
}

export function WaterCard({ date, current }: { date: string; current: number }) {
  const { data, summary, addWater, setSettings } = useStore();
  const [amount, setAmount] = useState<number | undefined>(300);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | undefined>(data.settings.waterTargetMl);
  if (!summary) return null;

  const recommended = summary.waterMl;
  const custom = data.settings.waterTargetMl;
  const target = waterTarget(custom, recommended);
  const low = !!custom && custom < recommended;
  const validAmount = !!amount && amount > 0 && amount <= 3000;
  const draftLow = !!draft && draft < recommended;
  const draftValid = !!draft && draft >= 300 && draft <= WATER_MAX_ML;

  const save = () => {
    setSettings({ waterTargetMl: draft && draft !== recommended ? draft : undefined });
    setEditing(false);
  };

  return (
    <section className="card">
      <h2>
        喝水
        <span className="num" style={{ fontSize: 15 }}>{current} / {target} ml</span>
      </h2>
      <div className="bar accent" style={{ marginBottom: 12 }}>
        <i style={{ width: `${Math.min(100, (current / target) * 100)}%` }} />
      </div>

      <div className="row wrap">
        <button className="btn sm" onClick={() => addWater(250, date)}>+250</button>
        <button className="btn sm" onClick={() => addWater(500, date)}>+500</button>
        <button className="btn sm" onClick={() => addWater(-250, date)} disabled={current <= 0}>−250</button>
      </div>

      <div className="water-custom">
        <NumInput value={amount} decimal={false} onChange={setAmount} aria-label="自訂毫升數" placeholder="自訂" />
        <span className="muted">ml</span>
        <button className="btn sm primary" disabled={!validAmount} onClick={() => addWater(amount!, date)}>加</button>
        <button className="btn sm" disabled={!validAmount || current <= 0} onClick={() => addWater(-amount!, date)}>減</button>
      </div>

      {low && !editing && (
        <p className="water-warn" role="status">
          ⚠ 你的目標 {custom} ml 低於建議量 {recommended} ml（依體重 × 30 ml 計算）。運動、流汗多的日子請再多喝一點。
        </p>
      )}

      {editing ? (
        <div className="water-target">
          <label className="eyebrow" htmlFor="water-target">每日目標（ml）</label>
          <div className="row">
            <NumInput id="water-target" value={draft} decimal={false} onChange={setDraft} aria-label="每日喝水目標" placeholder={String(recommended)} />
            <button className="btn sm dark" disabled={!draftValid} onClick={save}>儲存</button>
            <button className="btn sm" onClick={() => { setDraft(custom); setEditing(false); }}>取消</button>
          </div>
          <p className="muted">建議量：{recommended} ml（體重 {data.profile?.body.weightKg} kg × 30 ml）</p>
          {draftLow && (
            <p className="water-warn" role="alert">
              ⚠ 低於建議量 {recommended} ml，長期喝太少容易疲勞、頭暈、便秘，運動表現也會變差。建議至少設定 {recommended} ml。
            </p>
          )}
          {draft !== undefined && !draftValid && <p className="warn-text">請輸入 300–{WATER_MAX_ML} ml。</p>}
          {custom && (
            <button className="link" onClick={() => { setSettings({ waterTargetMl: undefined }); setDraft(undefined); setEditing(false); }}>
              改回建議量
            </button>
          )}
        </div>
      ) : (
        <button className="link" style={{ marginTop: 10 }} onClick={() => { setDraft(custom ?? recommended); setEditing(true); }}>
          調整每日目標{custom ? `（目前自訂 ${custom} ml）` : `（目前用建議量）`}
        </button>
      )}
    </section>
  );
}
