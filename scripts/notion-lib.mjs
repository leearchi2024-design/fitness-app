// ===== Notion 同步：純函式（可單元測試，不連網路） =====

/** 要同步的 Notion 資料庫（withBody：連頁面內文一起抓，存成「內文」欄位） */
export const DATABASES = [
  { key: 'strength', prefix: 's', title: '動作名稱', databaseId: 'f4c9011abf354b7d9515b4524afaebcb' },
  { key: 'yoga', prefix: 'y', title: '體式名稱', databaseId: 'd36753cca9da4eee99bfe3638cbc6edb' },
  { key: 'cardio', prefix: 'c', title: '動作名稱', databaseId: 'ba310c08be884b01bac42fc1fe8bb0eb' },
  { key: 'side-effects', prefix: 'e', title: '副作用', databaseId: '36a23f3986434c4b911900648c1267e4', withBody: true },
];

/** 頁面內文存放的欄位名稱 */
export const BODY_PROP = '內文';

/** 示範影片欄位名稱 */
export const MEDIA_PROP = '示範影片';

const MEDIA_EXT = ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp4', 'webm', 'mov', 'm4v'];

const plain = (arr = []) => arr.map((t) => t.plain_text ?? '').join('');

/** 把 Notion API 的屬性值轉成 APP JSON 使用的值 */
export function propValue(prop) {
  if (!prop) return undefined;
  switch (prop.type) {
    case 'title': return plain(prop.title);
    case 'rich_text': return plain(prop.rich_text);
    case 'select': return prop.select?.name ?? '';
    case 'status': return prop.status?.name ?? '';
    case 'multi_select': return prop.multi_select.map((o) => o.name);
    case 'checkbox': return !!prop.checkbox;
    case 'number': return prop.number;
    case 'url': return prop.url ?? '';
    case 'files': return prop.files.map(fileRef).filter(Boolean);
    default: return undefined; // 公式、關聯等暫不匯入
  }
}

/** files 欄位的單一檔案 → { name, url } */
export function fileRef(f) {
  const url = f.type === 'file' ? f.file?.url : f.type === 'external' ? f.external?.url : undefined;
  return url ? { name: f.name ?? '', url } : undefined;
}

/** 取副檔名（優先用檔名，其次網址路徑） */
export function extOf(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase();
  if (fromName && MEDIA_EXT.includes(fromName)) return fromName;
  try {
    const p = decodeURIComponent(new URL(file.url).pathname);
    const e = p.split('.').pop()?.toLowerCase();
    if (e && MEDIA_EXT.includes(e)) return e;
  } catch {
    /* ignore */
  }
  return undefined;
}

const cleanId = (id) => id.replace(/-/g, '');

/**
 * 把 Notion 頁面清單轉成 APP 的 JSON 列。
 * - 已存在的動作沿用原本的 id（例如 s01），使用者的歷史紀錄不會錯亂
 * - 新動作接續編號；Notion 刪除的動作會移除
 * - 排序：舊動作維持原順序，新動作依建立時間排在後面
 * 回傳 rows 與 downloads（要下載的示範檔）。
 */
export function buildRows(pages, existing, db) {
  const idByNotion = new Map(existing.filter((r) => r.notionId).map((r) => [r.notionId, r.id]));
  const orderOf = new Map(existing.map((r, i) => [r.notionId, i]));
  let next = Math.max(0, ...existing.map((r) => Number(String(r.id).slice(db.prefix.length)) || 0)) + 1;

  const sorted = [...pages].sort((a, b) => {
    const oa = orderOf.get(cleanId(a.id)) ?? Infinity;
    const ob = orderOf.get(cleanId(b.id)) ?? Infinity;
    if (oa !== ob) return oa - ob;
    return String(a.created_time).localeCompare(String(b.created_time));
  });

  const rows = [];
  const downloads = [];
  for (const page of sorted) {
    if (page.archived || page.in_trash) continue;
    const notionId = cleanId(page.id);
    const id = idByNotion.get(notionId) ?? `${db.prefix}${String(next++).padStart(2, '0')}`;
    const row = { id, notionId };
    for (const [name, prop] of Object.entries(page.properties)) {
      if (name === MEDIA_PROP) continue;
      const v = propValue(prop);
      if (v !== undefined) row[name] = v;
    }
    if (!row[db.title]) continue; // 沒有名稱的空白列略過

    const files = page.properties[MEDIA_PROP] ? propValue(page.properties[MEDIA_PROP]) : [];
    const file = files.find((f) => extOf(f));
    if (file) {
      const path = `media/${db.key}/${id}.${extOf(file)}`;
      row[MEDIA_PROP] = path;
      downloads.push({ url: file.url, path, name: row[db.title] });
    }
    rows.push(row);
  }
  return { rows, downloads };
}

/** 與現有 JSON 相同的排版：一列一個動作 */
export function formatJson(rows) {
  return '[\n' + rows.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n]\n';
}

// ===== 頁面內文：Notion 區塊 → 精簡 Markdown =====
// 支援：段落、標題、項目／編號清單（含一層子項目）、引言、提示框、表格、分隔線、粗體

/** rich_text 陣列 → 文字（粗體保留為 **字**） */
export function richText(arr = []) {
  return arr
    .map((t) => {
      const text = t.plain_text ?? '';
      return t.annotations?.bold && text.trim() ? `**${text}**` : text;
    })
    .join('');
}

/**
 * blocks：Notion 區塊陣列，若有子區塊請先放在 block.children（表格的列、清單的子項目）。
 * 回傳 Markdown 字串。
 */
export function blocksToMarkdown(blocks = [], depth = 0) {
  const out = [];
  const indent = '  '.repeat(depth);
  let n = 0; // 編號清單計數
  for (const b of blocks) {
    const v = b[b.type] ?? {};
    if (b.type !== 'numbered_list_item') n = 0;
    switch (b.type) {
      case 'paragraph': {
        const t = richText(v.rich_text);
        if (t.trim()) out.push(indent + t);
        break;
      }
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        out.push('## ' + richText(v.rich_text));
        break;
      case 'bulleted_list_item':
        out.push(`${indent}- ${richText(v.rich_text)}`);
        if (b.children?.length) out.push(blocksToMarkdown(b.children, depth + 1));
        break;
      case 'numbered_list_item':
        n += 1;
        out.push(`${indent}${n}. ${richText(v.rich_text)}`);
        if (b.children?.length) out.push(blocksToMarkdown(b.children, depth + 1));
        break;
      case 'quote':
      case 'callout':
        out.push('> ' + richText(v.rich_text).replace(/\n/g, ' '));
        break;
      case 'divider':
        out.push('---');
        break;
      case 'table': {
        const rows = (b.children ?? []).map((r) => (r.table_row?.cells ?? []).map((c) => richText(c).replace(/\|/g, '／')));
        if (rows.length) {
          out.push('| ' + rows[0].join(' | ') + ' |');
          out.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
          for (const r of rows.slice(1)) out.push('| ' + r.join(' | ') + ' |');
        }
        break;
      }
      default:
        break; // 圖片、嵌入等暫不轉換
    }
  }
  return out.filter((l) => l !== '').join('\n');
}
