// Waveform visualization component using PixiJS

import React, { useCallback, useMemo } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import * as PIXI from 'pixi.js';

// Extend @pixi/react to support Container and Graphics
extend({ Container, Graphics });

interface WaveformProps {
  buffer: AudioBuffer | Float32Array;
}

const Waveform: React.FC<WaveformProps> = ({ buffer }) => {
  // Get audio data
  const data = useMemo(() => {
    if (buffer instanceof AudioBuffer) {
      return buffer.getChannelData(0);
    }
    return buffer;
  }, [buffer]);

  const draw = useCallback((graphics: PIXI.Graphics) => {
    graphics.clear();

    if (data.length === 0) return;

    // Calculate dimensions
    const width = 800;
    const height = 200;
    const samplesPerPixel = Math.max(1, Math.floor(data.length / width));

    // Draw waveform using PixiJS v8 API
    graphics.moveTo(0, height / 2);

    for (let x = 0; x < width; x++) {
      const start = x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, data.length);
      
      // Calculate RMS for this segment
      let sum = 0;
      for (let i = start; i < end; i++) {
        sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / (end - start));
      
      // Draw line
      const y = height / 2 + (rms * height / 2) * -1; // Invert Y axis
      graphics.lineTo(x, y);
    }

    // Apply stroke to waveform
    graphics.stroke({ width: 2, color: 0xffffff });

    // Draw center line - start new path
    graphics
      .moveTo(0, height / 2)
      .lineTo(width, height / 2)
      .stroke({ width: 1, color: 0x666666 });
  }, [data]);

  return (
    <div className="waveform-container">
      <h2>Waveform</h2>
      <Application width={800} height={200} backgroundColor={0x1a1a1a}>
        <pixiContainer>
          <pixiGraphics draw={draw} />
        </pixiContainer>
      </Application>
    </div>
  );
};

export default Waveform;
