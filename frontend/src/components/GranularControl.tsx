// Granular control component with modern UI

import React, { useRef, useEffect, useCallback } from 'react';
import { useGranularStore } from '../store/useGranularStore';
import { initWasm, createGranularInstance, isWasmInitialized } from '../wasm';
import { loadAudioFile, audioBufferToFloat32Array, float32ArrayToAudioBuffer } from '../utils/audio';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Upload, Play, Pause, RotateCcw } from 'lucide-react';

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
        
        const instance = createGranularInstance();
        setGranularInstance(instance);
        
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
    
    let ctx = audioContext;
    if (!ctx) {
      console.log('Creating new AudioContext...');
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
    
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
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    
    const trimmed = output.slice(0, inputData.length);
    setProcessedBuffer(trimmed);
    console.log('Offline processing complete, output length:', trimmed.length);
  }, [granularInstance, audioBuffer, getGranularParams, setProcessedBuffer]);

  useEffect(() => {
    if (!audioBuffer || !isWasmInitialized() || !granularInstance) {
      return;
    }

    const timeoutId = setTimeout(() => {
      processOffline();
    }, 100);

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

  const ControlSlider = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step = 1,
    format = (v: number) => v.toFixed(0),
    description 
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    format?: (value: number) => string;
    description?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground font-mono">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      {description && (
        <p className="text-[10px] text-muted-foreground">{description}</p>
      )}
    </div>
  );

  const maxLength = audioBuffer?.length || 0;

  return (
    <div className="w-full space-y-4">
      {/* Header Controls */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4" />
                {audioBuffer ? `Loaded: ${audioBuffer.duration.toFixed(2)}s @ ${audioBuffer.sampleRate}Hz` : 'Load Audio File'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={processOffline} 
                disabled={!audioBuffer || !granularInstance}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handlePlay} 
                disabled={!processedBuffer || !audioContext}
                variant={isPlaying ? "destructive" : "default"}
                size="sm"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Selection Range */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Selection Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <ControlSlider
              label="Start"
              value={selectionStartSampleIx}
              onChange={setSelectionStartSampleIx}
              min={0}
              max={maxLength}
              format={(v) => `${v.toFixed(0)} samples`}
            />
            <ControlSlider
              label="End"
              value={selectionEndSampleIx}
              onChange={setSelectionEndSampleIx}
              min={0}
              max={maxLength}
              format={(v) => `${v.toFixed(0)} samples`}
            />
          </CardContent>
        </Card>

        {/* Grain Properties */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Grain Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <ControlSlider
              label="Size"
              value={grainSize}
              onChange={setGrainSize}
              min={128}
              max={8192}
              step={64}
              format={(v) => `${v.toFixed(0)} samples`}
            />
            <ControlSlider
              label="Linear Slope"
              value={linearSlopeLength}
              onChange={setLinearSlopeLength}
              min={0}
              max={1}
              step={0.01}
              format={(v) => formatValue(v)}
            />
            <ControlSlider
              label="Slope Linearity"
              value={slopeLinearity}
              onChange={setSlopeLinearity}
              min={0}
              max={1}
              step={0.01}
              format={(v) => formatValue(v)}
            />
          </CardContent>
        </Card>

        {/* Voice 1 */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Voice 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-4 pb-4">
            <ControlSlider
              label="Filter Cutoff"
              value={voice1FilterCutoff}
              onChange={setVoice1FilterCutoff}
              min={-20000}
              max={20000}
              step={100}
              format={(v) => `${v > 0 ? 'LP' : 'HP'} ${Math.abs(v).toFixed(0)}Hz`}
            />
            <ControlSlider
              label="Movement"
              value={voice1MovementSamplesPerSample}
              onChange={setVoice1MovementSamplesPerSample}
              min={-2}
              max={2}
              step={0.01}
              format={(v) => formatValue(v, 3)}
            />
            <ControlSlider
              label="Speed Ratio"
              value={voice1SampleSpeedRatio}
              onChange={setVoice1SampleSpeedRatio}
              min={0.1}
              max={4}
              step={0.01}
              format={(v) => formatValue(v, 2)}
            />
            <ControlSlider
              label="Between Grains"
              value={voice1SamplesBetweenGrains}
              onChange={setVoice1SamplesBetweenGrains}
              min={1}
              max={2000}
              format={(v) => `${v.toFixed(0)} samples`}
            />
            <ControlSlider
              label="Gain"
              value={voice1Gain}
              onChange={setVoice1Gain}
              min={0}
              max={2}
              step={0.01}
              format={(v) => formatValue(v)}
            />
            <ControlSlider
              label="Randomness"
              value={voice1GrainStartRandomnessSamples}
              onChange={setVoice1GrainStartRandomnessSamples}
              min={0}
              max={1000}
              step={10}
              format={(v) => `${v.toFixed(0)} samples`}
            />
          </CardContent>
        </Card>

        {/* Voice 2 */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Voice 2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-4 pb-4">
            <ControlSlider
              label="Filter Cutoff"
              value={voice2FilterCutoff}
              onChange={setVoice2FilterCutoff}
              min={-20000}
              max={20000}
              step={100}
              format={(v) => `${v > 0 ? 'LP' : 'HP'} ${Math.abs(v).toFixed(0)}Hz`}
            />
            <ControlSlider
              label="Movement"
              value={voice2MovementSamplesPerSample}
              onChange={setVoice2MovementSamplesPerSample}
              min={-2}
              max={2}
              step={0.01}
              format={(v) => formatValue(v, 3)}
            />
            <ControlSlider
              label="Speed Ratio"
              value={voice2SampleSpeedRatio}
              onChange={setVoice2SampleSpeedRatio}
              min={0.1}
              max={4}
              step={0.01}
              format={(v) => formatValue(v, 2)}
            />
            <ControlSlider
              label="Between Grains"
              value={voice2SamplesBetweenGrains}
              onChange={setVoice2SamplesBetweenGrains}
              min={1}
              max={2000}
              format={(v) => `${v.toFixed(0)} samples`}
            />
            <ControlSlider
              label="Gain"
              value={voice2Gain}
              onChange={setVoice2Gain}
              min={0}
              max={2}
              step={0.01}
              format={(v) => formatValue(v)}
            />
            <ControlSlider
              label="Randomness"
              value={voice2GrainStartRandomnessSamples}
              onChange={setVoice2GrainStartRandomnessSamples}
              min={0}
              max={1000}
              step={10}
              format={(v) => `${v.toFixed(0)} samples`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GranularControl;
