// Zustand store for granular sampler state management

import { create } from 'zustand';
import { GranularInstance, GranularParams } from '../wasm';

interface GranularState {
  // Audio buffer
  audioBuffer: AudioBuffer | null;
  processedBuffer: Float32Array | null;
  
  // Granular instance
  granularInstance: GranularInstance | null;
  
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
  
  // Legacy parameters (for backwards compatibility during migration)
  density: number;
  
  // Playback state
  isPlaying: boolean;
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  workletNode: AudioWorkletNode | null;
  
  // Actions
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  setProcessedBuffer: (buffer: Float32Array | null) => void;
  setGranularInstance: (instance: GranularInstance | null) => void;
  setSelectionStartSampleIx: (value: number) => void;
  setSelectionEndSampleIx: (value: number) => void;
  setGrainSize: (size: number) => void;
  setVoice1FilterCutoff: (value: number) => void;
  setVoice2FilterCutoff: (value: number) => void;
  setLinearSlopeLength: (value: number) => void;
  setSlopeLinearity: (value: number) => void;
  setVoice1MovementSamplesPerSample: (value: number) => void;
  setVoice2MovementSamplesPerSample: (value: number) => void;
  setVoice1SampleSpeedRatio: (value: number) => void;
  setVoice2SampleSpeedRatio: (value: number) => void;
  setVoice1SamplesBetweenGrains: (value: number) => void;
  setVoice2SamplesBetweenGrains: (value: number) => void;
  setVoice1Gain: (value: number) => void;
  setVoice2Gain: (value: number) => void;
  setVoice1GrainStartRandomnessSamples: (value: number) => void;
  setVoice2GrainStartRandomnessSamples: (value: number) => void;
  setDensity: (density: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudioContext: (ctx: AudioContext | null) => void;
  setSourceNode: (node: AudioBufferSourceNode | null) => void;
  setWorkletNode: (node: AudioWorkletNode | null) => void;
  getGranularParams: () => GranularParams;
  reset: () => void;
}

const initialState = {
  audioBuffer: null,
  processedBuffer: null,
  granularInstance: null,
  selectionStartSampleIx: 0,
  selectionEndSampleIx: 0,
  grainSize: 800,
  voice1FilterCutoff: 0,
  voice2FilterCutoff: 0,
  linearSlopeLength: 0.5,
  slopeLinearity: 0.5,
  voice1MovementSamplesPerSample: 0.1,
  voice2MovementSamplesPerSample: 0.1,
  voice1SampleSpeedRatio: 1.0,
  voice2SampleSpeedRatio: 1.0,
  voice1SamplesBetweenGrains: 400,
  voice2SamplesBetweenGrains: 400,
  voice1Gain: 1.0,
  voice2Gain: 1.0,
  voice1GrainStartRandomnessSamples: 200,
  voice2GrainStartRandomnessSamples: 0,
  density: 20,
  isPlaying: false,
  audioContext: null,
  sourceNode: null,
  workletNode: null,
};

export const useGranularStore = create<GranularState>((set, get) => ({
  ...initialState,
  
  setAudioBuffer: (buffer) => {
    set({ audioBuffer: buffer });
    // Auto-update selection range when buffer is loaded
    if (buffer) {
      set({
        selectionStartSampleIx: 0,
        selectionEndSampleIx: buffer.length,
      });
    }
  },
  setProcessedBuffer: (buffer) => set({ processedBuffer: buffer }),
  setGranularInstance: (instance) => set({ granularInstance: instance }),
  setSelectionStartSampleIx: (value) => set({ selectionStartSampleIx: value }),
  setSelectionEndSampleIx: (value) => set({ selectionEndSampleIx: value }),
  setGrainSize: (size) => set({ grainSize: size }),
  setVoice1FilterCutoff: (value) => set({ voice1FilterCutoff: value }),
  setVoice2FilterCutoff: (value) => set({ voice2FilterCutoff: value }),
  setLinearSlopeLength: (value) => set({ linearSlopeLength: value }),
  setSlopeLinearity: (value) => set({ slopeLinearity: value }),
  setVoice1MovementSamplesPerSample: (value) => set({ voice1MovementSamplesPerSample: value }),
  setVoice2MovementSamplesPerSample: (value) => set({ voice2MovementSamplesPerSample: value }),
  setVoice1SampleSpeedRatio: (value) => set({ voice1SampleSpeedRatio: value }),
  setVoice2SampleSpeedRatio: (value) => set({ voice2SampleSpeedRatio: value }),
  setVoice1SamplesBetweenGrains: (value) => set({ voice1SamplesBetweenGrains: value }),
  setVoice2SamplesBetweenGrains: (value) => set({ voice2SamplesBetweenGrains: value }),
  setVoice1Gain: (value) => set({ voice1Gain: value }),
  setVoice2Gain: (value) => set({ voice2Gain: value }),
  setVoice1GrainStartRandomnessSamples: (value) => set({ voice1GrainStartRandomnessSamples: value }),
  setVoice2GrainStartRandomnessSamples: (value) => set({ voice2GrainStartRandomnessSamples: value }),
  setDensity: (density) => set({ density }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAudioContext: (ctx) => set({ audioContext: ctx }),
  setSourceNode: (node) => set({ sourceNode: node }),
  setWorkletNode: (node) => set({ workletNode: node }),
  
  getGranularParams: (): GranularParams => {
    const state = get();
    return {
      selectionStartSampleIx: state.selectionStartSampleIx,
      selectionEndSampleIx: state.selectionEndSampleIx,
      grainSize: state.grainSize,
      voice1FilterCutoff: state.voice1FilterCutoff,
      voice2FilterCutoff: state.voice2FilterCutoff,
      linearSlopeLength: state.linearSlopeLength,
      slopeLinearity: state.slopeLinearity,
      voice1MovementSamplesPerSample: state.voice1MovementSamplesPerSample,
      voice2MovementSamplesPerSample: state.voice2MovementSamplesPerSample,
      voice1SampleSpeedRatio: state.voice1SampleSpeedRatio,
      voice2SampleSpeedRatio: state.voice2SampleSpeedRatio,
      voice1SamplesBetweenGrains: state.voice1SamplesBetweenGrains,
      voice2SamplesBetweenGrains: state.voice2SamplesBetweenGrains,
      voice1Gain: state.voice1Gain,
      voice2Gain: state.voice2Gain,
      voice1GrainStartRandomnessSamples: state.voice1GrainStartRandomnessSamples,
      voice2GrainStartRandomnessSamples: state.voice2GrainStartRandomnessSamples,
    };
  },
  
  reset: () => {
    const state = get();
    if (state.granularInstance) {
      state.granularInstance.free();
    }
    set(initialState);
  },
}));
