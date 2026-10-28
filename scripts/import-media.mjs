#!/usr/bin/env node
// ===== 從資料夾匯入示範影片（不需要 Notion 金鑰） =====
// 用法：node scripts/import-media.mjs <資料夾>
//   資料夾可以是 Notion「匯出」解壓後的資料夾，或自己整理的資料夾。
//   依「檔名開頭 = 動作名稱」配對，例如 反向弓箭步.svg、戰士一式_WarriorI.svg、深蹲跳_SquatJump.svg。
//   檔案路徑含「重訓／瑜珈／有氧」時優先配對到該資料庫。
// 會更新：public/media/<資料庫>/<動作 id>.<副檔名>、src/data/notion/*.json 的「示範影片」欄位
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from './notion-lib.mjs';
import { matchMedia } from './media-match.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) {
  console.error('請指定資料夾：node scripts/import-media.mjs <資料夾>');
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const DBS = [
  { key: 'strength', folder: '重訓', titles: ['動作名稱'] },
  { key: 'yoga', folder: '瑜珈', titles: ['體式名稱', '英文名稱'] },
  { key: 'cardio', folder: '有氧', titles: ['動作名稱'] },
];

const data = {};
for (const db of DBS) data[db.key] = JSON.parse(await readFile(join(ROOT, 'src/data/notion', `${db.key}.json`), 'utf8'));

const files = (await walk(src)).map((p) => relative(src, p));
const { matched, unmatchedFiles, missing } = matchMedia(files, DBS, data);

for (const m of matched) {
  const dest = join(ROOT, 'public', m.path);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(join(src, m.file), dest);
  const row = data[m.db].find((r) => r.id === m.id);
  row['示範影片'] = m.path;
  console.log(`  ✓ ${m.name} ← ${m.file}`);
}
for (const db of DBS) await writeFile(join(ROOT, 'src/data/notion', `${db.key}.json`), formatJson(data[db.key]));

console.log(`\n匯入 ${matched.length} 個示範檔。`);
if (unmatchedFiles.length) console.log(`沒有配對到動作的檔案（${unmatchedFiles.length}）：\n  ${unmatchedFiles.join('\n  ')}`);
if (missing.length) console.log(`還沒有示範檔的動作（${missing.length}）：${missing.join('、')}`);
