import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DATABASES, buildRows, extOf, formatJson, propValue } from './notion-lib.mjs';

const strengthJson = readFileSync(new URL('../src/data/notion/strength.json', import.meta.url), 'utf8');
const existing = JSON.parse(strengthJson);
const db = DATABASES.find((d) => d.key === 'strength');

const rt = (s) => [{ plain_text: s }];
const dashed = (id) => `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

/** 依目前 JSON 反向組出 Notion API 的回傳格式（模擬重訓資料庫） */
function toApiPage(r, created = '2026-10-19T07:24:14.000Z') {
  return {
    id: dashed(r.notionId),
    created_time: created,
    archived: false,
    properties: {
      動作名稱: { type: 'title', title: rt(r.動作名稱) },
      主要肌群: { type: 'rich_text', rich_text: rt(r.主要肌群) },
      動作要點: { type: 'rich_text', rich_text: rt(r.動作要點) },
      器材: { type: 'select', select: { name: r.器材 } },
      常見錯誤: { type: 'rich_text', rich_text: rt(r.常見錯誤) },
      建議次數組數: { type: 'rich_text', rich_text: rt(r.建議次數組數) },
      訓練部位: { type: 'multi_select', multi_select: r.訓練部位.map((name) => ({ name })) },
      難度: { type: 'select', select: { name: r.難度 } },
      示範影片: {
        type: 'files',
        files: [{ type: 'file', name: `${r.動作名稱}.svg`, file: { url: `https://prod-files-secure.s3.us-west-2.amazonaws.com/x/${encodeURIComponent(r.動作名稱)}.svg?X-Amz-Expires=300` } }],
      },
    },
  };
}

describe('Notion 同步：重訓資料庫', () => {
  it('同步結果與目前 strength.json 完全一致（18 個動作、固定 id、示範檔路徑）', () => {
    const pages = [...existing].reverse().map((r) => toApiPage(r)); // 打亂順序也要維持原排序
    const { rows, downloads } = buildRows(pages, existing, db);
    expect(rows).toHaveLength(18);
    expect(formatJson(rows)).toBe(strengthJson);
    expect(downloads).toHaveLength(18);
    expect(downloads[0]).toMatchObject({ path: 'media/strength/s01.svg', name: '反向弓箭步' });
  });

  it('Notion 新增動作：接續編號 s19，排在最後', () => {
    const extra = { ...existing[0], notionId: 'aaaaaaaabbbbccccddddeeeeeeeeeeee', 動作名稱: '保加利亞分腿蹲' };
    const pages = [...existing.map((r) => toApiPage(r)), toApiPage(extra, '2026-10-21T00:00:00.000Z')];
    const { rows } = buildRows(pages, existing, db);
    expect(rows.at(-1)).toMatchObject({ id: 's19', 動作名稱: '保加利亞分腿蹲', 示範影片: 'media/strength/s19.svg' });
  });

  it('Notion 刪除動作：從清單移除，其他動作 id 不變', () => {
    const pages = existing.filter((r) => r.id !== 's02').map((r) => toApiPage(r));
    const { rows } = buildRows(pages, existing, db);
    expect(rows).toHaveLength(17);
    expect(rows.find((r) => r.動作名稱 === '啞鈴肩推').id).toBe('s03');
  });

  it('沒有示範影片時不產生路徑', () => {
    const p = toApiPage(existing[0]);
    p.properties.示範影片.files = [];
    const { rows, downloads } = buildRows([p], existing, db);
    expect(rows[0].示範影片).toBeUndefined();
    expect(downloads).toHaveLength(0);
  });
});

describe('欄位轉換', () => {
  it('勾選框、外部連結影片、副檔名判斷', () => {
    expect(propValue({ type: 'checkbox', checkbox: true })).toBe(true);
    expect(extOf({ name: 'demo.MP4', url: 'https://x/y' })).toBe('mp4');
    expect(extOf({ name: '', url: 'https://cdn.example.com/a/%E6%A3%92.webm?sig=1' })).toBe('webm');
    expect(extOf({ name: 'youtube', url: 'https://youtu.be/abc' })).toBeUndefined();
  });
});
