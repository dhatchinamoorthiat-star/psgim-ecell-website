import { BlockNode } from '../../shared/blocks/block.types';

/**
 * Local-only unsaved-work recovery (task §19). Scoped to
 * `user + content item + draft version` so it can never leak across users
 * or content items sharing a browser profile, and never survives a
 * version change (a stale recovery record for a since-published/replaced
 * version is worthless and would be actively misleading). Stores only the
 * block document — no auth token, no session data, nothing sensitive.
 */

interface RecoveryRecord {
  blocks: BlockNode[];
  savedAt: string;
}

function key(userId: string, versionId: string): string {
  return `ecell-editor-recovery:${userId}:${versionId}`;
}

export function saveRecovery(userId: string, versionId: string, blocks: BlockNode[]): void {
  try {
    const record: RecoveryRecord = { blocks, savedAt: new Date().toISOString() };
    localStorage.setItem(key(userId, versionId), JSON.stringify(record));
  } catch {
    // Storage full/unavailable (private browsing, quota) — recovery is
    // best-effort only, never block the editor over it.
  }
}

export function readRecovery(userId: string, versionId: string): RecoveryRecord | null {
  try {
    const raw = localStorage.getItem(key(userId, versionId));
    return raw ? (JSON.parse(raw) as RecoveryRecord) : null;
  } catch {
    return null;
  }
}

export function clearRecovery(userId: string, versionId: string): void {
  try {
    localStorage.removeItem(key(userId, versionId));
  } catch {
    // ignore
  }
}
