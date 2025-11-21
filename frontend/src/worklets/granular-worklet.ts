// AudioWorklet processor for real-time granular synthesis
// This file will be compiled and loaded as a worklet
// Note: WASM integration typically happens in the main thread due to AudioWorklet limitations
// This processor can receive pre-processed frames or process using Web Audio API

// Declare AudioWorkletProcessor types for TypeScript
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor
): void;

class GranularProcessor extends AudioWorkletProcessor {
  private outputBuffer: Float32Array[] = [];
  
  // Granular parameters (updated from main thread)
  private params: {
    selectionStartSampleIx: number;
    selectionEndSampleIx: number;
    grainSize: number;
    voice1FilterCutoff: number;
    voice2FilterCutoff: number;
    linearSlopeLength: number;
    slopeLinearity: number;
    voice1MovementSamplesPerSample: number;
    voice2MovementSamplesPerSample: number;
    voice1SampleSpeedRatio: number;
    voice2SampleSpeedRatio: number;
    voice1SamplesBetweenGrains: number;
    voice2SamplesBetweenGrains: number;
    voice1Gain: number;
    voice2Gain: number;
    voice1GrainStartRandomnessSamples: number;
    voice2GrainStartRandomnessSamples: number;
  } = {
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
  };

  constructor(_options?: AudioWorkletNodeOptions) {
    super();
    
    // Listen for parameter updates from main thread
    this.port.onmessage = (event: MessageEvent) => {
      const data = event.data;
      
      if (data.type === 'updateParams') {
        // Update all granular parameters
        if (data.params) {
          Object.assign(this.params, data.params);
        }
      } else if (data.type === 'processedFrame') {
        // Receive pre-processed frame from main thread
        // This allows WASM processing in main thread with low-latency delivery
        if (data.frame && data.frame instanceof Float32Array) {
          // Store processed frame for output
          this.outputBuffer.push(data.frame);
        }
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    if (!inputChannel || !outputChannel) {
      return true;
    }

    const frameLength = outputChannel.length;

    // For real-time processing, we'll process input frames
    // The actual granular synthesis should happen in the main thread
    // and send processed frames via messages, OR we process simple pass-through here
    // In a full implementation, you would:
    // 1. Collect input samples into a buffer
    // 2. When buffer reaches frameSize (128), request processing from main thread
    // 3. Wait for processed frame via message
    // 4. Output processed samples
    
    // For now, pass-through with option to receive pre-processed frames
    if (this.outputBuffer.length > 0) {
      // Use pre-processed frame if available
      const processedFrame = this.outputBuffer.shift()!;
      const copyLength = Math.min(frameLength, processedFrame.length);
      for (let i = 0; i < copyLength; i++) {
        outputChannel[i] = processedFrame[i];
      }
      // Fill remainder with zeros if frame is shorter
      for (let i = copyLength; i < frameLength; i++) {
        outputChannel[i] = 0;
      }
    } else {
      // Pass-through (will be replaced with processed frames from main thread)
      for (let i = 0; i < frameLength; i++) {
        outputChannel[i] = inputChannel[i] || 0;
      }
    }

    return true;
  }
}

registerProcessor('granular-processor', GranularProcessor);
