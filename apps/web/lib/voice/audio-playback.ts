/** Decode base64 audio and return a Blob for playback. */
export function decodeAudioBase64(
  audioBase64: string,
  mimeType: string,
): Blob {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export type AudioLevelCallback = (level: number) => void;

/** Play audio blob; invoke onLevel with 0–1 RMS during playback. */
export function playAudioBlob(
  blob: Blob,
  onLevel?: AudioLevelCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    let rafId = 0;
    let audioContext: AudioContext | undefined;
    let analyser: AnalyserNode | undefined;
    let sourceNode: MediaElementAudioSourceNode | undefined;
    const sampleBuffer = new Uint8Array(256);

    const cleanup = (): void => {
      if (rafId) cancelAnimationFrame(rafId);
      sourceNode?.disconnect();
      analyser?.disconnect();
      void audioContext?.close();
      URL.revokeObjectURL(url);
    };

    const tickLevel = (): void => {
      if (analyser && onLevel) {
        analyser.getByteTimeDomainData(sampleBuffer);
        let sum = 0;
        for (let i = 0; i < sampleBuffer.length; i += 1) {
          const v = (sampleBuffer[i]! - 128) / 128;
          sum += v * v;
        }
        onLevel(Math.min(1, Math.sqrt(sum / sampleBuffer.length) * 4));
      }
      rafId = requestAnimationFrame(tickLevel);
    };

    audio.onended = () => {
      cleanup();
      onLevel?.(0);
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      onLevel?.(0);
      reject(new Error("audio playback failed"));
    };

    void audio.play().then(() => {
      try {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode = audioContext.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
        tickLevel();
      } catch {
        tickLevel();
      }
    }, reject);
  });
}
