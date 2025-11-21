// Audio utility functions

/**
 * Load audio file and convert to AudioBuffer
 */
export async function loadAudioFile(file: File, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Convert AudioBuffer to Float32Array (mono)
 */
export function audioBufferToFloat32Array(buffer: AudioBuffer): Float32Array {
  // If mono, return directly
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  
  // If stereo, mix to mono
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const mono = new Float32Array(left.length);
  
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }
  
  return mono;
}

/**
 * Create AudioBuffer from Float32Array
 */
export function float32ArrayToAudioBuffer(
  data: Float32Array,
  audioContext: AudioContext,
  sampleRate: number = 44100
): AudioBuffer {
  const buffer = audioContext.createBuffer(1, data.length, sampleRate);
  // Create a new Float32Array from the data to ensure it's backed by ArrayBuffer
  const channelData = new Float32Array(data.length);
  channelData.set(data);
  buffer.copyToChannel(channelData, 0);
  return buffer;
}
