// 模組 3-5：今日熱量環
export function CalorieRing({ target, eaten, burned, addBack }: { target: number; eaten: number; burned: number; addBack: boolean }) {
  const budget = target + (addBack ? burned : 0);
  const remaining = budget - eaten;
  const pct = Math.min(1, budget > 0 ? eaten / budget : 0);
  const r = 58;
  const c = 2 * Math.PI * r;
  const over = remaining < 0;
  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 148 148" width="148" height="148" role="img" aria-label={`剩餘 ${remaining} 大卡`}>
        <defs>
          <pattern id="ringdots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill="#9a9a9a" />
          </pattern>
        </defs>
        <circle cx="74" cy="74" r={r} fill="none" stroke="url(#ringdots)" strokeWidth="18" />
        <circle cx="74" cy="74" r={r + 9} fill="none" stroke="#111" strokeWidth="2.5" />
        <circle cx="74" cy="74" r={r - 9} fill="none" stroke="#111" strokeWidth="2.5" />
        <circle
          cx="74" cy="74" r={r} fill="none" stroke={over ? '#111' : '#ff5a1f'} strokeWidth="15"
          strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 74 74)" strokeLinecap="butt"
        />
        <text x="74" y="72" textAnchor="middle" className="ring-center" fill="#111">{Math.abs(remaining)}</text>
        <text x="74" y="94" textAnchor="middle" fontSize="12" fontWeight="700" fill="#4a4740">
          {over ? '已超過（大卡）' : '剩餘（大卡）'}
        </text>
      </svg>
      <div className="stack">
        <div className="stat"><b>{target}</b><span>每日目標</span></div>
        <div className="stat"><b>{eaten}</b><span>已攝取</span></div>
        <div className="stat"><b>{burned}</b><span>運動消耗{addBack ? '（已加回）' : ''}</span></div>
      </div>
    </div>
  );
}
