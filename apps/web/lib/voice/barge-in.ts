/** Client + BFF shared barge-in marker. Empty blob posted to /voice/turn. */
export const BARGE_IN_MIME = "application/x-zeref-barge-in";

export function createBargeInBlob(): Blob {
  return new Blob([], { type: BARGE_IN_MIME });
}

export function isBargeInRequest(audio: Blob): boolean {
  return audio.type === BARGE_IN_MIME;
}
