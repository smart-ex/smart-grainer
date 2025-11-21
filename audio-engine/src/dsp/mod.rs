// DSP utilities module
// Provides common audio DSP functions like interpolation, mixing, filtering, etc.

pub mod filters;

/// Clamp a value between min and max
pub fn clamp(min: f32, max: f32, value: f32) -> f32 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

/// Linear interpolation between two values
/// mix: 0.0 = a, 1.0 = b
pub fn mix(mix: f32, a: f32, b: f32) -> f32 {
    a + (b - a) * clamp(0.0, 1.0, mix)
}

/// Read interpolated sample from buffer
/// Uses linear interpolation for fractional indices
pub fn read_interpolated(buf: &[f32], index: f32) -> f32 {
    let idx = index.floor() as usize;
    let frac = index - idx as f32;
    
    if idx >= buf.len() - 1 {
        return *buf.last().unwrap_or(&0.0);
    }
    
    let sample_a = buf[idx];
    let sample_b = buf[idx + 1];
    
    mix(frac, sample_a, sample_b)
}

/// Smooth a value towards a target using exponential smoothing
/// current: mutable reference to current value
/// target: target value to smooth towards
/// smoothing: smoothing factor (0.0 = no smoothing, 1.0 = full smoothing)
pub fn smooth(current: &mut f32, target: f32, smoothing: f32) {
    *current = mix(smoothing, target, *current);
}

