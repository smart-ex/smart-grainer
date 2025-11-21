// Butterworth filter implementation
// Based on standard second-order IIR filter design

#[derive(Clone)]
pub struct ButterworthFilter {
    // State variables for biquad filter
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl Default for ButterworthFilter {
    fn default() -> Self {
        ButterworthFilter {
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }
}

impl ButterworthFilter {
    /// Process input through lowpass filter
    /// cutoff: cutoff frequency in Hz
    /// sample: input sample
    /// Returns filtered sample
    pub fn lowpass(&mut self, cutoff: f32, sample: f32) -> f32 {
        // Simplified butterworth lowpass filter coefficients
        // Using a fixed sample rate assumption (44100 Hz typical)
        const SAMPLE_RATE: f32 = 44100.0;
        
        let normalized_freq = cutoff / SAMPLE_RATE;
        let omega = 2.0 * std::f32::consts::PI * normalized_freq;
        
        // Butterworth filter coefficients (simplified)
        let q = 0.707; // Butterworth Q factor
        let alpha = omega.sin() / (2.0 * q);
        let cos_omega = omega.cos();
        
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;
        let b0 = (1.0 - cos_omega) / 2.0;
        let b1 = 1.0 - cos_omega;
        let b2 = (1.0 - cos_omega) / 2.0;
        
        // Normalize coefficients
        let inv_a0 = 1.0 / a0;
        let b0_norm = b0 * inv_a0;
        let b1_norm = b1 * inv_a0;
        let b2_norm = b2 * inv_a0;
        let a1_norm = a1 * inv_a0;
        let a2_norm = a2 * inv_a0;
        
        // Apply biquad filter
        let output = b0_norm * sample
            + b1_norm * self.x1
            + b2_norm * self.x2
            - a1_norm * self.y1
            - a2_norm * self.y2;
        
        // Update state
        self.x2 = self.x1;
        self.x1 = sample;
        self.y2 = self.y1;
        self.y1 = output;
        
        output
    }
    
    /// Process input through highpass filter
    /// cutoff: cutoff frequency in Hz
    /// sample: input sample
    /// Returns filtered sample
    pub fn highpass(&mut self, cutoff: f32, sample: f32) -> f32 {
        // Simplified butterworth highpass filter coefficients
        const SAMPLE_RATE: f32 = 44100.0;
        
        let normalized_freq = cutoff / SAMPLE_RATE;
        let omega = 2.0 * std::f32::consts::PI * normalized_freq;
        
        let q = 0.707;
        let alpha = omega.sin() / (2.0 * q);
        let cos_omega = omega.cos();
        
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;
        let b0 = (1.0 + cos_omega) / 2.0;
        let b1 = -(1.0 + cos_omega);
        let b2 = (1.0 + cos_omega) / 2.0;
        
        let inv_a0 = 1.0 / a0;
        let b0_norm = b0 * inv_a0;
        let b1_norm = b1 * inv_a0;
        let b2_norm = b2 * inv_a0;
        let a1_norm = a1 * inv_a0;
        let a2_norm = a2 * inv_a0;
        
        let output = b0_norm * sample
            + b1_norm * self.x1
            + b2_norm * self.x2
            - a1_norm * self.y1
            - a2_norm * self.y2;
        
        self.x2 = self.x1;
        self.x1 = sample;
        self.y2 = self.y1;
        self.y1 = output;
        
        output
    }
}

