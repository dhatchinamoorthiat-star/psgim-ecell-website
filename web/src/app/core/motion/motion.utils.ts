export function safeExecuteInBrowser<T>(callback: () => T, fallback: T): T {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      return callback();
    } catch {
      return fallback;
    }
  }
  return fallback;
}
