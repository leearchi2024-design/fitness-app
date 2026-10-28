// 精簡 Markdown 顯示：對應同步程式產生的格式（引言、標題、清單、表格、粗體）
import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part,
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      out.push(<h3 key={i} className="md-h">{inline(line.slice(3))}</h3>);
      i++;
    } else if (line.startsWith('> ')) {
      out.push(<p key={i} className="md-quote">{inline(line.slice(2))}</p>);
      i++;
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].slice(1, -1).split('|').map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      out.push(
        <div key={`t${i}`} className="md-table">
          <table>
            <thead><tr>{rows[0].map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else if (/^\s*(-|\d+\.) /.test(line)) {
      const ordered = /^\d+\./.test(line.trim());
      const items: { text: string; sub: string[] }[] = [];
      while (i < lines.length && /^\s*(-|\d+\.) /.test(lines[i])) {
        const l = lines[i];
        const body = l.trim().replace(/^(-|\d+\.) /, '');
        if (/^\s{2,}/.test(l) && items.length) items[items.length - 1].sub.push(body);
        else items.push({ text: body, sub: [] });
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={`l${i}`} className="md-list">
          {items.map((it, k) => (
            <li key={k}>
              {inline(it.text)}
              {it.sub.length > 0 && <ul>{it.sub.map((s, j) => <li key={j}>{inline(s)}</li>)}</ul>}
            </li>
          ))}
        </Tag>,
      );
    } else if (line.trim() === '---') {
      out.push(<hr key={i} />);
      i++;
    } else {
      if (line.trim()) out.push(<p key={i}>{inline(line)}</p>);
      i++;
    }
  }
  return <div className="md">{out}</div>;
}
