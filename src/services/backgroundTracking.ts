/** Web : le navigateur ne permet pas le suivi GPS en arrière-plan — rien à faire (voir backgroundTracking.native.ts). */
export async function startBackgroundTracking(): Promise<boolean> {
  return false;
}

export async function stopBackgroundTracking(): Promise<void> {
  /* rien */
}
