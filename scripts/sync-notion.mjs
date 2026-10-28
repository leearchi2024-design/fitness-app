#!/usr/bin/env node
// ===== 從 Notion 同步動作資料與示範影片 =====
// 用法：NOTION_TOKEN=secret_xxx npm run sync
//   只同步重訓：NOTION_TOKEN=secret_xxx npm run sync -- strength
//
// 會更新：
//   src/data/notion/{strength,yoga,cardio,side-effects}.json   （欄位名稱與 Notion 相同；副作用含頁面內文）
//   public/media/{strength,yoga,cardio}/<id>.<副檔名>   （示範影片／動畫）
// 需要 Node.js 18 以上，不需另外安裝套件。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BODY_PROP, DATABASES, blocksToMarkdown, buildRows, formatJson } from './notion-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.NOTION_TOKEN;
const API = process.env.NOTION_API_BASE ?? 'https://api.notion.com/v1'; // 測試時可改成本機模擬伺服器
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

if (!TOKEN) {
  console.error('缺少 NOTION_TOKEN。請先建立 Notion 整合（integration）並把金鑰設為環境變數，詳見 README「從 Notion 同步」。');
  process.exit(1);
}

process.on('uncaughtException', (e) => {
  console.error(`同步失敗：${e.message}`);
  process.exit(1);
});

const only = process.argv.slice(2);
const targets = only.length ? DATABASES.filter((d) => only.includes(d.key)) : DATABASES;

async function queryAll(databaseId) {
  const pages = [];
  let cursor;
  do {
    const res = await fetch(`${API}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) throw new Error('NOTION_TOKEN 金鑰無效，請重新複製 Notion 整合的金鑰。');
      if (res.status === 404)
        throw new Error(`找不到資料庫 ${databaseId}。請到 Notion「健身APP」頁面 → 右上「…」→ 連線（Connections），加入你的整合。`);
      throw new Error(`Notion API ${res.status}：${body}`);
    }
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

/** 讀取區塊與子區塊（表格列、清單子項目） */
async function getBlocks(blockId) {
  const blocks = [];
  let cursor;
  do {
    const q = new URLSearchParams({ page_size: '100', ...(cursor ? { start_cursor: cursor } : {}) });
    const res = await fetch(`${API}/blocks/${blockId}/children?${q}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`讀取頁面內文失敗 ${res.status}`);
    const data = await res.json();
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  for (const b of blocks) if (b.has_children) b.children = await getBlocks(b.id);
  return blocks;
}

async function download(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下載失敗 ${res.status}`);
  const full = join(ROOT, 'public', path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await res.arrayBuffer()));
}

let failed = 0;
for (const db of targets) {
  const jsonPath = join(ROOT, 'src/data/notion', `${db.key}.json`);
  const existing = JSON.parse(await readFile(jsonPath, 'utf8').catch(() => '[]'));
  const pages = await queryAll(db.databaseId);
  const { rows, downloads } = buildRows(pages, existing, db);

  if (db.withBody) {
    for (const row of rows) {
      const md = blocksToMarkdown(await getBlocks(row.notionId));
      if (md) row[BODY_PROP] = md;
    }
  }

  for (const d of downloads) {
    try {
      await download(d.url, d.path);
      console.log(`  ✓ ${d.name} → public/${d.path}`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${d.name}：${e.message}`);
    }
  }
  await writeFile(jsonPath, formatJson(rows));
  const added = rows.filter((r) => !existing.some((x) => x.notionId === r.notionId)).length;
  const removed = existing.filter((x) => !rows.some((r) => r.notionId === x.notionId)).length;
  console.log(`${db.key}：${rows.length} 筆（新增 ${added}、移除 ${removed}）、示範檔 ${downloads.length} 個`);
}

if (failed) {
  console.error(`有 ${failed} 個示範檔下載失敗，請重新執行一次。`);
  process.exit(1);
}
console.log('同步完成。接著執行 npm test 與 npm run build。');
