// ===== 示範檔配對（純函式，可測試） =====
const MEDIA_EXT = ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp4', 'webm', 'mov', 'm4v'];

const norm = (s) => String(s ?? '').normalize('NFC').replace(/[\s_\-（）()]/g, '').toLowerCase();

/**
 * files：相對路徑清單；dbs：[{ key, folder, titles }]；data：{ key: rows[] }
 * 規則：檔名（去副檔名）以動作名稱開頭；有多個符合時，先選路徑含該資料庫名稱者，再選名稱最長者。
 * 每個動作只取第一個配對到的檔案。
 */
export function matchMedia(files, dbs, data) {
  const matched = [];
  const unmatchedFiles = [];
  const taken = new Set();

  for (const file of [...files].sort()) {
    const parts = file.split(/[\\/]/);
    const base = parts.at(-1);
    const dot = base.lastIndexOf('.');
    const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
    if (!MEDIA_EXT.includes(ext)) continue;
    const stem = norm(decodeURIComponent(base.slice(0, dot)));
    const dirPath = parts.slice(0, -1).join('/');

    const candidates = [];
    for (const db of dbs) {
      for (const row of data[db.key]) {
        for (const t of db.titles) {
          const title = norm(row[t]);
          if (title && stem.startsWith(title)) {
            candidates.push({ db, row, len: title.length, inFolder: dirPath.includes(db.folder) });
          }
        }
      }
    }
    candidates.sort((a, b) => Number(b.inFolder) - Number(a.inFolder) || b.len - a.len);
    const best = candidates.find((c) => !taken.has(`${c.db.key}/${c.row.id}`));
    if (!best) {
      unmatchedFiles.push(file);
      continue;
    }
    taken.add(`${best.db.key}/${best.row.id}`);
    matched.push({
      db: best.db.key,
      id: best.row.id,
      name: best.row[best.db.titles[0]],
      file,
      path: `media/${best.db.key}/${best.row.id}.${ext}`,
    });
  }

  const missing = dbs.flatMap((db) =>
    data[db.key].filter((r) => !taken.has(`${db.key}/${r.id}`)).map((r) => r[db.titles[0]]),
  );
  return { matched, unmatchedFiles, missing };
}
