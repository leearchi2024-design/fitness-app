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
        files: r.示範影片 ? [{ type: 'file', name: `${r.動作名稱}.${r.示範影片.split('.').pop()}`, file: { url: `https://prod-files-secure.s3.us-west-2.amazonaws.com/x/${encodeURIComponent(r.動作名稱)}.${r.示範影片.split('.').pop()}?X-Amz-Expires=300` } }] : [],
      },
    },
  };
}

describe('Notion 同步：重訓資料庫', () => {
  it('同步結果與目前 strength.json 完全一致（18 個動作、固定 id、示範檔路徑）', () => {
    const pages = [...existing].reverse().map((r) => toApiPage(r)); // 打亂順序也要維持原排序
    const { rows, downloads } = buildRows(pages, existing, db);
    expect(rows).toHaveLength(existing.length);
    expect(rows).toEqual(existing); // 比對資料內容（不受欄位順序影響）
    expect(downloads).toHaveLength(existing.filter((r) => r.示範影片).length);
    expect(downloads[0]).toMatchObject({ path: 'media/strength/s01.svg', name: '反向弓箭步' });
  });

  it('Notion 新增動作：接續編號 s19，排在最後', () => {
    const extra = { ...existing[0], notionId: 'aaaaaaaabbbbccccddddeeeeeeeeeeee', 動作名稱: '保加利亞分腿蹲', 示範影片: 'x.svg' };
    const nextId = `s${String(existing.length + 1).padStart(2, '0')}`;
    const pages = [...existing.map((r) => toApiPage(r)), toApiPage(extra, '2026-10-21T00:00:00.000Z')];
    const { rows } = buildRows(pages, existing, db);
    expect(rows.at(-1)).toMatchObject({ id: nextId, 動作名稱: '保加利亞分腿蹲', 示範影片: `media/strength/${nextId}.svg` });
  });

  it('Notion 刪除動作：從清單移除，其他動作 id 不變', () => {
    const pages = existing.filter((r) => r.id !== 's02').map((r) => toApiPage(r));
    const { rows } = buildRows(pages, existing, db);
    expect(rows).toHaveLength(existing.length - 1);
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

describe('欄位順序', () => {
  it('Notion 回傳的欄位順序不同時，仍沿用現有檔案的順序', () => {
    const shuffled = toApiPage(existing[0]);
    shuffled.properties = Object.fromEntries(Object.entries(shuffled.properties).reverse());
    const { rows } = buildRows([shuffled], existing, db);
    expect(Object.keys(rows[0])).toEqual(Object.keys(existing[0]));
    expect(formatJson(rows).split('\n')[1]).toBe(strengthJson.split('\n')[1].replace(/,$/, ''));
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

import { blocksToMarkdown } from './notion-lib.mjs';

const t = (s, bold = false) => [{ plain_text: s, annotations: { bold } }];

describe('頁面內文轉換（副作用資料庫）', () => {
  it('引言、標題、表格、清單、粗體都轉成 Markdown', () => {
    const blocks = [
      { type: 'quote', quote: { rich_text: t('補充品不是必需品。') } },
      { type: 'heading_2', heading_2: { rich_text: t('常見補充品與副作用') } },
      {
        type: 'table', has_children: true, table: {},
        children: [
          { type: 'table_row', table_row: { cells: [t('補充品'), t('常見副作用')] } },
          { type: 'table_row', table_row: { cells: [t('肌酸'), t('初期體重上升約 1–2 公斤')] } },
        ],
      },
      { type: 'numbered_list_item', numbered_list_item: { rich_text: [...t('動態恢復', true), ...t('：散步、伸展')] } },
      { type: 'numbered_list_item', numbered_list_item: { rich_text: t('放鬆') } },
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: t('雷射') }, children: [
        { type: 'bulleted_list_item', bulleted_list_item: { rich_text: t('紅紋：脈衝染料雷射') } },
      ] },
      { type: 'image', image: {} },
    ];
    expect(blocksToMarkdown(blocks)).toBe([
      '> 補充品不是必需品。',
      '## 常見補充品與副作用',
      '| 補充品 | 常見副作用 |',
      '| --- | --- |',
      '| 肌酸 | 初期體重上升約 1–2 公斤 |',
      '1. **動態恢復**：散步、伸展',
      '2. 放鬆',
      '- 雷射',
      '  - 紅紋：脈衝染料雷射',
    ].join('\n'));
  });

  it('副作用資料庫的欄位格式（每筆都有必要欄位、嚴重程度合法）', () => {
    const rows = JSON.parse(readFileSync(new URL('../src/data/notion/side-effects.json', import.meta.url), 'utf8'));
    const levels = ['輕微・多為暫時', '無害・外觀問題', '需調整訓練', '需留意就醫', '危險・立即就醫'];
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) {
      expect(levels).toContain(r.嚴重程度);
      expect(r.副作用 && r.主要原因 && r.改善方式 && r.何時就醫).toBeTruthy();
      expect(Array.isArray(r.常見族群)).toBe(true);
    }
  });

  it('飲食資料庫：id 直接使用 Notion「APP代號」，新食物沒有代號時自動編號', () => {
    const foods = DATABASES.find((d) => d.key === 'foods');
    const page = (id, name, code) => ({
      id: dashed(id), created_time: '2026-10-20T00:00:00.000Z', archived: false,
      properties: {
        食物名稱: { type: 'title', title: rt(name) },
        APP代號: { type: 'rich_text', rich_text: code ? rt(code) : [] },
        熱量: { type: 'number', number: 520 },
        類型: { type: 'select', select: { name: '自煮' } },
      },
    });
    const { rows } = buildRows([page('a'.repeat(32), '舒肥雞胸糙米餐', 'home_lunch_01'), page('b'.repeat(32), '新菜色', '')], [], foods);
    expect(rows[0]).toMatchObject({ id: 'home_lunch_01', 食物名稱: '舒肥雞胸糙米餐', 熱量: 520 });
    expect(rows[1].id).toBe('f01');
  });

  it('飲食資料庫 foods.json：每筆有名稱、熱量、代號不重複', () => {
    const rows = JSON.parse(readFileSync(new URL('../src/data/notion/foods.json', import.meta.url), 'utf8'));
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) expect(r.食物名稱 && typeof r.熱量 === 'number').toBeTruthy();
  });
});
