// Waveform visualization component with selection range markers
// Based on https://github.com/Ameobea/web-synth/blob/main/src/granulator/GranulatorUI/WaveformRenderer.tsx

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useGranularStore } from '../store/useGranularStore';

interface WaveformProps {
  buffer: AudioBuffer | Float32Array;
}

const MARKER_WIDTH = 4;
const MARKER_HIT_RADIUS = 8;
const SELECTION_HIT_MARGIN = 5;

type DragState = 
  | { type: 'none' }
  | { type: 'start-marker' }
  | { type: 'end-marker' }
  | { type: 'selection'; startOffsetSamples: number };

const Waveform: React.FC<WaveformProps> = ({ buffer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<DragState>({ type: 'none' });
  const [isDragging, setIsDragging] = useState(false);
  
  const {
    selectionStartSampleIx,
    selectionEndSampleIx,
    setSelectionStartSampleIx,
    setSelectionEndSampleIx,
  } = useGranularStore();

  // Get audio data
  const { data, sampleRate } = useMemo(() => {
    if (buffer instanceof AudioBuffer) {
      return {
        data: buffer.getChannelData(0),
        sampleRate: buffer.sampleRate,
      };
    }
    return {
      data: buffer,
      sampleRate: 44100, // Default sample rate
    };
  }, [buffer]);

  // Canvas dimensions
  const width = 1400;
  const height = 240;

  // Convert sample index to pixel X position
  const sampleToPixel = useCallback((sampleIx: number): number => {
    if (data.length === 0) return 0;
    return Math.floor((sampleIx / data.length) * width);
  }, [data.length, width]);

  // Convert pixel X position to sample index
  const pixelToSample = useCallback((pixelX: number): number => {
    if (data.length === 0) return 0;
    const clampedX = Math.max(0, Math.min(width, pixelX));
    return Math.floor((clampedX / width) * data.length);
  }, [data.length, width]);

  // Render waveform to canvas
  const renderWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    if (data.length === 0) return;

    // Calculate samples per pixel
    const samplesPerPixel = Math.max(1, data.length / width);

    // Draw waveform
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerY = height / 2;

    for (let x = 0; x < width; x++) {
      const start = Math.floor(x * samplesPerPixel);
      const end = Math.min(Math.floor((x + 1) * samplesPerPixel), data.length);
      
      // Calculate RMS for this segment
      let sum = 0;
      let count = 0;
      for (let i = start; i < end; i++) {
        sum += data[i] * data[i];
        count++;
      }
      const rms = count > 0 ? Math.sqrt(sum / count) : 0;
      
      // Draw line
      const y = centerY - (rms * centerY);
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw selection range highlight
    const startX = sampleToPixel(selectionStartSampleIx);
    const endX = sampleToPixel(selectionEndSampleIx);
    
    if (endX > startX) {
      // Highlight selected region
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'; // Blue with transparency
      ctx.fillRect(startX, 0, endX - startX, height);
    }

    // Draw selection markers
    ctx.fillStyle = '#3b82f6'; // Blue
    ctx.fillRect(startX - MARKER_WIDTH / 2, 0, MARKER_WIDTH, height);
    ctx.fillRect(endX - MARKER_WIDTH / 2, 0, MARKER_WIDTH, height);

    // Draw marker handles (smaller rectangles at top and bottom)
    const handleHeight = 20;
    ctx.fillStyle = '#60a5fa'; // Lighter blue
    ctx.fillRect(startX - MARKER_WIDTH / 2, 0, MARKER_WIDTH, handleHeight);
    ctx.fillRect(startX - MARKER_WIDTH / 2, height - handleHeight, MARKER_WIDTH, handleHeight);
    ctx.fillRect(endX - MARKER_WIDTH / 2, 0, MARKER_WIDTH, handleHeight);
    ctx.fillRect(endX - MARKER_WIDTH / 2, height - handleHeight, MARKER_WIDTH, handleHeight);
  }, [data, width, height, sampleToPixel, selectionStartSampleIx, selectionEndSampleIx]);

  // Check if point is near a marker
  const getDragType = useCallback((x: number, y: number): DragState => {
    const startX = sampleToPixel(selectionStartSampleIx);
    const endX = sampleToPixel(selectionEndSampleIx);

    // Check if near start marker
    if (Math.abs(x - startX) < MARKER_HIT_RADIUS) {
      return { type: 'start-marker' };
    }

    // Check if near end marker
    if (Math.abs(x - endX) < MARKER_HIT_RADIUS) {
      return { type: 'end-marker' };
    }

    // Check if within selection range (with margin)
    if (x >= startX - SELECTION_HIT_MARGIN && x <= endX + SELECTION_HIT_MARGIN) {
      return { type: 'selection', startOffsetSamples: 0 }; // Will be calculated on mouse down
    }

    return { type: 'none' };
  }, [sampleToPixel, pixelToSample, selectionStartSampleIx, selectionEndSampleIx]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dragType = getDragType(x, y);
    
    if (dragType.type !== 'none') {
      // If dragging selection, calculate offset in samples
      if (dragType.type === 'selection') {
        const clickSample = pixelToSample(x);
        const startOffsetSamples = clickSample - selectionStartSampleIx;
        setDragState({ type: 'selection', startOffsetSamples });
      } else {
        setDragState(dragType);
      }
      setIsDragging(true);
    } else {
      // Click outside selection - set new selection point
      const sampleIx = pixelToSample(x);
      if (Math.abs(x - sampleToPixel(selectionStartSampleIx)) < Math.abs(x - sampleToPixel(selectionEndSampleIx))) {
        setSelectionStartSampleIx(sampleIx);
      } else {
        setSelectionEndSampleIx(sampleIx);
      }
    }
  }, [getDragType, pixelToSample, sampleToPixel, selectionStartSampleIx, selectionEndSampleIx, setSelectionStartSampleIx, setSelectionEndSampleIx]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragState.type === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sampleIx = pixelToSample(x);

    switch (dragState.type) {
      case 'start-marker': {
        const clamped = Math.min(sampleIx, selectionEndSampleIx - 1);
        setSelectionStartSampleIx(Math.max(0, clamped));
        break;
      }
      case 'end-marker': {
        const clamped = Math.max(sampleIx, selectionStartSampleIx + 1);
        setSelectionEndSampleIx(Math.min(data.length, clamped));
        break;
      }
      case 'selection': {
        const newStart = sampleIx - dragState.startOffsetSamples;
        const newEnd = newStart + (selectionEndSampleIx - selectionStartSampleIx);
        
        // Clamp to valid range
        if (newStart < 0) {
          const diff = 0 - newStart;
          setSelectionStartSampleIx(0);
          setSelectionEndSampleIx(Math.min(data.length, selectionEndSampleIx + diff));
        } else if (newEnd > data.length) {
          const diff = newEnd - data.length;
          setSelectionEndSampleIx(data.length);
          setSelectionStartSampleIx(Math.max(0, selectionStartSampleIx - diff));
        } else {
          setSelectionStartSampleIx(newStart);
          setSelectionEndSampleIx(newEnd);
        }
        break;
      }
    }
  }, [isDragging, dragState, pixelToSample, selectionStartSampleIx, selectionEndSampleIx, data.length, setSelectionStartSampleIx, setSelectionEndSampleIx]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({ type: 'none' });
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setDragState({ type: 'none' });
    setIsDragging(false);
  }, []);

  // Update cursor style based on hover
  const handleMouseMoveHover = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dragType = getDragType(x, 0);

    if (dragType.type !== 'none') {
      canvas.style.cursor = dragType.type === 'selection' ? 'move' : 'ew-resize';
    } else {
      canvas.style.cursor = 'default';
    }
  }, [isDragging, getDragType]);

  // Render when data or selection changes
  useEffect(() => {
    renderWaveform();
  }, [renderWaveform]);

  return (
    <div className="waveform-container">
      <h2>Waveform</h2>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleMouseMoveHover(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          cursor: isDragging ? (dragState.type === 'selection' ? 'move' : 'ew-resize') : 'default',
        }}
      />
    </div>
  );
};

export default Waveform;
