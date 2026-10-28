// ===== 備份／還原面板（「我的」頁與歡迎頁共用） =====
import { useRef, useState } from 'react';
import {
  BackupError, backupFileName, blobToDataUrl, buildBackup, dataUrlToBlob, describeBackup, parseBackup,
  requestPersistentStorage, type BackupFile,
} from '../../lib/backup';
import { getPhotoBlob, savePhoto } from '../../lib/photoStore';
import { useStore } from '../../store/AppStore';

export function BackupPanel({ mode = 'full' }: { mode?: 'full' | 'restore-only' }) {
  const { data, replaceAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    setMsg(null);
    try {
      const photos: Record<string, string> = {};
      for (const f of data.foods) {
        if (!f.photoId || photos[f.photoId]) continue;
        const blob = await getPhotoBlob(f.photoId);
        if (blob) photos[f.photoId] = await blobToDataUrl(blob);
      }
      const backup = buildBackup(data, photos);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setMsg({ ok: true, text: `已下載備份檔：${describeBackup(backup)}。請存到雲端硬碟或傳給自己保存。` });
    } catch {
      setMsg({ ok: false, text: '備份失敗，請再試一次。' });
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file?: File) {
    if (!file) return;
    setMsg(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BackupError ? e.message : '讀取檔案失敗，請再試一次。' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      // 先存貼紙、最後才取代紀錄：中途失敗時紀錄維持原狀
      for (const [id, url] of Object.entries(pending.photos)) await savePhoto(id, await dataUrlToBlob(url));
      replaceAll(pending.data);
      requestPersistentStorage();
      setMsg({ ok: true, text: '還原完成。' });
      setPending(null);
    } catch {
      setMsg({ ok: false, text: '還原失敗，紀錄沒有變動，請再試一次。' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <input ref={fileRef} id="backup-file" type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {pending ? (
        <div className="notice stack" style={{ gap: 8 }}>
          <b>要用這個備份取代目前的資料嗎？</b>
          <span>{describeBackup(pending)}</span>
          {mode === 'full' && <span>目前這支手機上的紀錄會被取代，建議先按「下載備份」留一份。</span>}
          <div className="row">
            <button className="btn sm dark" onClick={confirmRestore} disabled={busy}>{busy ? '還原中…' : '確定還原'}</button>
            <button className="btn sm" onClick={() => setPending(null)} disabled={busy}>取消</button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {mode === 'full' && (
            <button className="btn sm primary" onClick={exportBackup} disabled={busy}>{busy ? '準備中…' : '下載備份'}</button>
          )}
          <button className="btn sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {mode === 'full' ? '從備份還原' : '已經有備份檔？從備份還原'}
          </button>
        </div>
      )}
      {msg && <p className={msg.ok ? 'muted' : 'notice'} role="status">{msg.text}</p>}
    </div>
  );
}
