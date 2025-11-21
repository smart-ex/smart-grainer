// Granular control component with UI controls

import React, { useRef, useEffect, useCallback } from 'react';
import { useGranularStore } from '../store/useGranularStore';
import { initWasm, createGranularInstance, isWasmInitialized } from '../wasm';
import { loadAudioFile, audioBufferToFloat32Array, float32ArrayToAudioBuffer } from '../utils/audio';
import './GranularControl.css';

const GranularControl: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const {
    audioBuffer,
    processedBuffer,
    isPlaying,
    audioContext,
    granularInstance,
    selectionStartSampleIx,
    selectionEndSampleIx,
    grainSize,
    voice1FilterCutoff,
    voice2FilterCutoff,
    linearSlopeLength,
    slopeLinearity,
    voice1MovementSamplesPerSample,
    voice2MovementSamplesPerSample,
    voice1SampleSpeedRatio,
    voice2SampleSpeedRatio,
    voice1SamplesBetweenGrains,
    voice2SamplesBetweenGrains,
    voice1Gain,
    voice2Gain,
    voice1GrainStartRandomnessSamples,
    voice2GrainStartRandomnessSamples,
    setAudioBuffer,
    setProcessedBuffer,
    setGranularInstance,
    setSelectionStartSampleIx,
    setSelectionEndSampleIx,
    setGrainSize,
    setVoice1FilterCutoff,
    setVoice2FilterCutoff,
    setLinearSlopeLength,
    setSlopeLinearity,
    setVoice1MovementSamplesPerSample,
    setVoice2MovementSamplesPerSample,
    setVoice1SampleSpeedRatio,
    setVoice2SampleSpeedRatio,
    setVoice1SamplesBetweenGrains,
    setVoice2SamplesBetweenGrains,
    setVoice1Gain,
    setVoice2Gain,
    setVoice1GrainStartRandomnessSamples,
    setVoice2GrainStartRandomnessSamples,
    setIsPlaying,
    setAudioContext,
    sourceNode,
    setSourceNode,
    getGranularParams,
  } = useGranularStore();

  // Initialize WASM and AudioContext on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing WASM...');
        await initWasm();
        console.log('WASM initialized');
        
        // Create granular instance
        const instance = createGranularInstance();
        setGranularInstance(instance);
        
        // Create AudioContext
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('AudioContext created:', ctx.state);
        
        if (ctx.state === 'suspended') {
          console.log('AudioContext suspended, will resume on user interaction');
        }
        
        setAudioContext(ctx);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initialize();
    
    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceNode) {
        sourceNode.stop();
      }
      if (granularInstance) {
        granularInstance.free();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      console.warn('No file selected');
      return;
    }
    
    // Ensure AudioContext exists and is running
    let ctx = audioContext;
    if (!ctx) {
      console.log('Creating new AudioContext...');
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
    
    // Resume AudioContext if suspended
    if (ctx.state === 'suspended') {
      console.log('Resuming AudioContext...');
      try {
        await ctx.resume();
        console.log('AudioContext resumed:', ctx.state);
      } catch (error) {
        console.error('Error resuming AudioContext:', error);
      }
    }

    try {
      console.log('Loading audio file:', file.name, file.type, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      const buffer = await loadAudioFile(file, ctx);
      console.log('Audio loaded successfully:', {
        duration: buffer.duration.toFixed(2) + 's',
        sampleRate: buffer.sampleRate + 'Hz',
        channels: buffer.numberOfChannels,
        length: buffer.length + ' samples'
      });
      setAudioBuffer(buffer);
      
      // Set waveform in granular instance
      if (granularInstance && isWasmInitialized()) {
        console.log('Setting waveform in granular instance...');
        const inputData = audioBufferToFloat32Array(buffer);
        granularInstance.setWaveform(inputData);
        console.log('Waveform set, length:', inputData.length);
      } else {
        console.warn('Granular instance or WASM not ready');
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error loading audio file: ${errorMessage}\n\nPlease check the browser console for details.`);
    }
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process entire buffer offline
  const processOffline = useCallback(() => {
    if (!granularInstance || !audioBuffer || !isWasmInitialized()) {
      return;
    }

    const inputData = audioBufferToFloat32Array(audioBuffer);
    const numFrames = Math.ceil(inputData.length / 128);
    const output = new Float32Array(numFrames * 128);
    
    const params = getGranularParams();
    
    for (let i = 0; i < numFrames; i++) {
      const frame = granularInstance.renderFrame(params);
      output.set(frame, i * 128);
    }
    
    // Trim to original length
    const trimmed = output.slice(0, inputData.length);
    setProcessedBuffer(trimmed);
    console.log('Offline processing complete, output length:', trimmed.length);
  }, [granularInstance, audioBuffer, getGranularParams, setProcessedBuffer]);

  // Auto-process when parameters change (throttled)
  useEffect(() => {
    if (!audioBuffer || !isWasmInitialized() || !granularInstance) {
      return;
    }

    const timeoutId = setTimeout(() => {
      processOffline();
    }, 100); // Debounce parameter changes

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectionStartSampleIx,
    selectionEndSampleIx,
    grainSize,
    voice1FilterCutoff,
    voice2FilterCutoff,
    linearSlopeLength,
    slopeLinearity,
    voice1MovementSamplesPerSample,
    voice2MovementSamplesPerSample,
    voice1SampleSpeedRatio,
    voice2SampleSpeedRatio,
    voice1SamplesBetweenGrains,
    voice2SamplesBetweenGrains,
    voice1Gain,
    voice2Gain,
    voice1GrainStartRandomnessSamples,
    voice2GrainStartRandomnessSamples,
    audioBuffer,
    granularInstance,
  ]);

  const handlePlay = async () => {
    if (!audioContext || !processedBuffer) return;

    if (isPlaying && sourceNode) {
      sourceNode.stop();
      setIsPlaying(false);
      return;
    }

    try {
      const buffer = float32ArrayToAudioBuffer(processedBuffer, audioContext);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      
      setSourceNode(source);
      source.start();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const formatValue = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  return (
    <div className="granular-control">
      <div className="control-section">
        <h2>Load Audio</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button 
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
        >
          Select Audio File
        </button>
        {audioBuffer && (
          <p>Loaded: {audioBuffer.duration.toFixed(2)}s @ {audioBuffer.sampleRate}Hz</p>
        )}
      </div>

      <div className="control-section">
        <h2>Selection Range</h2>
        
        <div className="control-item">
          <label>
            Selection Start: {selectionStartSampleIx.toFixed(0)} samples
            <input
              type="range"
              min={0}
              max={audioBuffer?.length || 0}
              step={1}
              value={selectionStartSampleIx}
              onChange={(e) => setSelectionStartSampleIx(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Selection End: {selectionEndSampleIx.toFixed(0)} samples
            <input
              type="range"
              min={0}
              max={audioBuffer?.length || 0}
              step={1}
              value={selectionEndSampleIx}
              onChange={(e) => setSelectionEndSampleIx(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="control-section">
        <h2>Grain Properties</h2>
        
        <div className="control-item">
          <label>
            Grain Size: {grainSize.toFixed(0)} samples
            <input
              type="range"
              min={128}
              max={8192}
              step={64}
              value={grainSize}
              onChange={(e) => setGrainSize(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Linear Slope Length: {formatValue(linearSlopeLength)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={linearSlopeLength}
              onChange={(e) => setLinearSlopeLength(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Slope Linearity: {formatValue(slopeLinearity)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={slopeLinearity}
              onChange={(e) => setSlopeLinearity(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="control-section">
        <h2>Voice 1 Controls</h2>
        
        <div className="control-item">
          <label>
            Filter Cutoff: {voice1FilterCutoff.toFixed(0)} Hz (positive=lowpass, negative=highpass)
            <input
              type="range"
              min={-20000}
              max={20000}
              step={100}
              value={voice1FilterCutoff}
              onChange={(e) => setVoice1FilterCutoff(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Movement Speed: {formatValue(voice1MovementSamplesPerSample, 3)} samples/sample
            <input
              type="range"
              min={-2}
              max={2}
              step={0.01}
              value={voice1MovementSamplesPerSample}
              onChange={(e) => setVoice1MovementSamplesPerSample(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Sample Speed Ratio: {formatValue(voice1SampleSpeedRatio, 2)}
            <input
              type="range"
              min={0.1}
              max={4}
              step={0.01}
              value={voice1SampleSpeedRatio}
              onChange={(e) => setVoice1SampleSpeedRatio(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Samples Between Grains: {voice1SamplesBetweenGrains.toFixed(0)}
            <input
              type="range"
              min={1}
              max={2000}
              step={1}
              value={voice1SamplesBetweenGrains}
              onChange={(e) => setVoice1SamplesBetweenGrains(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Gain: {formatValue(voice1Gain)}
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={voice1Gain}
              onChange={(e) => setVoice1Gain(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Grain Start Randomness: {voice1GrainStartRandomnessSamples.toFixed(0)} samples
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={voice1GrainStartRandomnessSamples}
              onChange={(e) => setVoice1GrainStartRandomnessSamples(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="control-section">
        <h2>Voice 2 Controls</h2>
        
        <div className="control-item">
          <label>
            Filter Cutoff: {voice2FilterCutoff.toFixed(0)} Hz
            <input
              type="range"
              min={-20000}
              max={20000}
              step={100}
              value={voice2FilterCutoff}
              onChange={(e) => setVoice2FilterCutoff(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Movement Speed: {formatValue(voice2MovementSamplesPerSample, 3)} samples/sample
            <input
              type="range"
              min={-2}
              max={2}
              step={0.01}
              value={voice2MovementSamplesPerSample}
              onChange={(e) => setVoice2MovementSamplesPerSample(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Sample Speed Ratio: {formatValue(voice2SampleSpeedRatio, 2)}
            <input
              type="range"
              min={0.1}
              max={4}
              step={0.01}
              value={voice2SampleSpeedRatio}
              onChange={(e) => setVoice2SampleSpeedRatio(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Samples Between Grains: {voice2SamplesBetweenGrains.toFixed(0)}
            <input
              type="range"
              min={1}
              max={2000}
              step={1}
              value={voice2SamplesBetweenGrains}
              onChange={(e) => setVoice2SamplesBetweenGrains(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Gain: {formatValue(voice2Gain)}
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={voice2Gain}
              onChange={(e) => setVoice2Gain(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-item">
          <label>
            Grain Start Randomness: {voice2GrainStartRandomnessSamples.toFixed(0)} samples
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={voice2GrainStartRandomnessSamples}
              onChange={(e) => setVoice2GrainStartRandomnessSamples(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="control-section">
        <button onClick={processOffline} disabled={!audioBuffer || !granularInstance}>
          Reprocess
        </button>
        <button 
          onClick={handlePlay} 
          disabled={!processedBuffer || !audioContext}
        >
          {isPlaying ? 'Stop' : 'Play Processed'}
        </button>
      </div>
    </div>
  );
};

export default GranularControl;
