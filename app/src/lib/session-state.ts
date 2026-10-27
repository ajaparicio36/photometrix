export interface StartInput {
  roomId: string;
  moduleId: string;
  placementNotes?: string;
}
export interface StartAttempt {
  key: string;
  input: StartInput;
}
/** Freeze normalized inputs with the key until the outcome is known. */
export function startAttempt(
  roomId: string,
  moduleId: string,
  placementNotes: string,
  key: string,
): StartAttempt {
  const notes = placementNotes.trim();
  return { key, input: { roomId, moduleId, ...(notes ? { placementNotes: notes } : {}) } };
}
