// AudioWorklet processor for real-time granular synthesis
// This is a compiled/bundled version that will be loaded by the browser

class GranularProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    this.grainSize = 512;
    this.density = 20;
    this.wasmModule = null;
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'updateParams') {
        this.grainSize = event.data.grainSize || this.grainSize;
        this.density = event.data.density || this.density;
      } else if (event.data.type === 'initWasm') {
        this.wasmModule = event.data.wasmModule;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    if (!inputChannel || !outputChannel) {
      return true;
    }

    // Pass-through for MVP (WASM integration would be added here)
    for (let i = 0; i < outputChannel.length; i++) {
      outputChannel[i] = inputChannel[i] || 0;
    }

    return true;
  }
}

registerProcessor('granular-processor', GranularProcessor);
