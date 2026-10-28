// ===== 數字輸入框 =====
// 用文字草稿保存使用者正在打的內容：可以整個刪空（不會自動變 0），也不會出現「059」。
// 只有在外部數值真的改變時（例如換一天）才覆蓋草稿。
import { useEffect, useRef, useState } from 'react';

export function parseNum(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (t === '' || t === '.' || t === '-') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** 只留數字與一個小數點，去掉前導 0（「059」→「59」，「0.5」保留） */
export function cleanNumText(s: string, decimal: boolean): string {
  let t = s.replace(',', '.').replace(decimal ? /[^\d.]/g : /[^\d]/g, '');
  if (decimal) {
    const i = t.indexOf('.');
    if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '');
  }
  t = t.replace(/^0+(?=\d)/, '');
  return t;
}

interface Props {
  value?: number;
  onChange: (v: number | undefined) => void;
  decimal?: boolean;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  id?: string;
}

export function NumInput({ value, onChange, decimal = true, placeholder, className = 'input num', id, ...rest }: Props) {
  const [draft, setDraft] = useState(value === undefined || value === 0 ? '' : String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      if (parseNum(draft) !== value) setDraft(value === undefined || value === 0 ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      placeholder={placeholder}
      aria-label={rest['aria-label']}
      value={draft}
      onChange={(e) => {
        const t = cleanNumText(e.target.value, decimal);
        setDraft(t);
        const n = parseNum(t);
        last.current = n;
        onChange(n);
      }}
    />
  );
}
