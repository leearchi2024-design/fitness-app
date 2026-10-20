// ===== Notion 同步：純函式（可單元測試，不連網路） =====

/** 三個動作資料庫的設定 */
export const DATABASES = [
  { key: 'strength', prefix: 's', title: '動作名稱', databaseId: 'f4c9011abf354b7d9515b4524afaebcb' },
  { key: 'yoga', prefix: 'y', title: '體式名稱', databaseId: 'd36753cca9da4eee99bfe3638cbc6edb' },
  { key: 'cardio', prefix: 'c', title: '動作名稱', databaseId: 'ba310c08be884b01bac42fc1fe8bb0eb' },
];

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
