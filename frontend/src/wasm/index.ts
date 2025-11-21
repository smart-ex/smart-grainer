// WASM module initialization and wrapper
// This module handles loading and interfacing with the Rust WASM audio engine

import init, { 
  create_granular_instance,
  get_granular_waveform_ptr,
  render_granular,
  free_granular_instance,
  type InitOutput,
} from '../../../audio-engine/pkg/audio_engine';

let wasmInitialized = false;
let wasmModule: InitOutput | null = null;

/**
 * Initialize the WASM module
 * Must be called before using any WASM functions
 */
export async function initWasm(): Promise<void> {
  if (wasmInitialized) {
    return;
  }
  
  try {
    wasmModule = await init();
    wasmInitialized = true;
    console.log('WASM module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
    throw error;
  }
}

/**
 * Check if WASM module is initialized
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

/**
 * Granular synthesis instance wrapper
 */
export class GranularInstance {
  private instancePtr: number | null = null;

  constructor() {
    if (!wasmInitialized) {
      throw new Error('WASM module not initialized. Call initWasm() first.');
    }
    this.instancePtr = create_granular_instance();
  }

  /**
   * Set the waveform buffer from a Float32Array
   * @param waveform - Audio data as Float32Array
   */
  setWaveform(waveform: Float32Array): void {
    if (this.instancePtr === null) {
      throw new Error('Granular instance has been freed');
    }

    const len = waveform.length;
    const ptr = get_granular_waveform_ptr(this.instancePtr, len);
    
    // Copy the waveform data into the WASM memory
    // Get WASM memory from the module
    if (!wasmModule || !wasmModule.memory) {
      throw new Error('WASM module not initialized or memory not available');
    }
    
    const memoryBuffer = wasmModule.memory.buffer;
    const memoryView = new Float32Array(memoryBuffer);
    
    // Calculate offset in WASM memory
    const offset = ptr / 4; // Divide by 4 because f32 is 4 bytes
    
    for (let i = 0; i < len; i++) {
      memoryView[offset + i] = waveform[i];
    }
  }

  /**
   * Render a frame of 128 samples
   * @param params - Granular synthesis parameters
   * @returns Float32Array of 128 samples
   */
  renderFrame(params: GranularParams): Float32Array {
    if (this.instancePtr === null) {
      throw new Error('Granular instance has been freed');
    }

    const outputPtr = render_granular(
      this.instancePtr,
      params.selectionStartSampleIx,
      params.selectionEndSampleIx,
      params.grainSize,
      params.voice1FilterCutoff,
      params.voice2FilterCutoff,
      params.linearSlopeLength,
      params.slopeLinearity,
      params.voice1MovementSamplesPerSample,
      params.voice2MovementSamplesPerSample,
      params.voice1SampleSpeedRatio,
      params.voice2SampleSpeedRatio,
      params.voice1SamplesBetweenGrains,
      params.voice2SamplesBetweenGrains,
      params.voice1Gain,
      params.voice2Gain,
      params.voice1GrainStartRandomnessSamples,
      params.voice2GrainStartRandomnessSamples,
    );

    // Read the output from WASM memory
    if (!wasmModule || !wasmModule.memory) {
      throw new Error('WASM module not initialized or memory not available');
    }
    
    const memoryBuffer = wasmModule.memory.buffer;
    const memoryView = new Float32Array(memoryBuffer);
    const offset = outputPtr / 4; // Divide by 4 because f32 is 4 bytes
    const output = new Float32Array(128);
    
    for (let i = 0; i < 128; i++) {
      output[i] = memoryView[offset + i];
    }
    
    return output;
  }

  /**
   * Free the granular instance
   */
  free(): void {
    if (this.instancePtr !== null) {
      free_granular_instance(this.instancePtr);
      this.instancePtr = null;
    }
  }
}

/**
 * Granular synthesis parameters
 */
export interface GranularParams {
  // Selection range in the waveform buffer
  selectionStartSampleIx: number;
  selectionEndSampleIx: number;
  
  // Grain properties
  grainSize: number;
  
  // Filter cutoffs (positive = lowpass, negative = highpass)
  voice1FilterCutoff: number;
  voice2FilterCutoff: number;
  
  // Envelope parameters
  linearSlopeLength: number; // 0.0 to 1.0
  slopeLinearity: number; // 0.0 to 1.0
  
  // Voice movement speeds (samples per output sample)
  voice1MovementSamplesPerSample: number;
  voice2MovementSamplesPerSample: number;
  
  // Sample playback speed ratios
  voice1SampleSpeedRatio: number;
  voice2SampleSpeedRatio: number;
  
  // Density control (samples between grains)
  voice1SamplesBetweenGrains: number;
  voice2SamplesBetweenGrains: number;
  
  // Gain levels
  voice1Gain: number;
  voice2Gain: number;
  
  // Randomness in grain start positions
  voice1GrainStartRandomnessSamples: number;
  voice2GrainStartRandomnessSamples: number;
}

/**
 * Create a new granular synthesis instance
 */
export function createGranularInstance(): GranularInstance {
  if (!wasmInitialized) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }
  return new GranularInstance();
}
