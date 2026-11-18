export const IME_GUARD_VERSION: number;
export function createImeGuard(o: { host?: Element | null; active: () => boolean; lazy?: boolean; force?: boolean }): { sync(): void; [k: string]: unknown };
