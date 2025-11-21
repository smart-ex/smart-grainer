// Main library file for audio-engine
// Exports modules and provides WASM bindings

mod common;
mod dsp;
mod granular;

use granular::GranularCtx;
use wasm_bindgen::prelude::*;

/// Create a new granular synthesis instance
#[wasm_bindgen]
pub fn create_granular_instance() -> *mut GranularCtx {
    granular::create_granular_instance()
}

/// Get a pointer to the waveform buffer for setting audio data
/// This allocates a buffer of the specified length
#[wasm_bindgen]
pub fn get_granular_waveform_ptr(ctx: *mut GranularCtx, new_waveform_len: usize) -> *mut f32 {
    granular::get_granular_waveform_ptr(ctx, new_waveform_len)
}

/// Render a frame of 128 samples with granular synthesis
/// Returns a pointer to the output buffer (128 samples)
#[wasm_bindgen]
pub fn render_granular(
    ctx: *mut GranularCtx,
    selection_start_sample_ix: f32,
    selection_end_sample_ix: f32,
    grain_size: f32,
    voice_1_filter_cutoff: f32,
    voice_2_filter_cutoff: f32,
    linear_slope_length: f32,
    slope_linearity: f32,
    voice_1_movement_samples_per_sample: f32,
    voice_2_movement_samples_per_sample: f32,
    voice_1_sample_speed_ratio: f32,
    voice_2_sample_speed_ratio: f32,
    voice_1_samples_between_grains: f32,
    voice_2_samples_between_grains: f32,
    voice_1_gain: f32,
    voice_2_gain: f32,
    voice_1_grain_start_randomness_samples: f32,
    voice_2_grain_start_randomness_samples: f32,
) -> *const f32 {
    granular::render_granular(
        ctx,
        selection_start_sample_ix,
        selection_end_sample_ix,
        grain_size,
        voice_1_filter_cutoff,
        voice_2_filter_cutoff,
        linear_slope_length,
        slope_linearity,
        voice_1_movement_samples_per_sample,
        voice_2_movement_samples_per_sample,
        voice_1_sample_speed_ratio,
        voice_2_sample_speed_ratio,
        voice_1_samples_between_grains,
        voice_2_samples_between_grains,
        voice_1_gain,
        voice_2_gain,
        voice_1_grain_start_randomness_samples,
        voice_2_grain_start_randomness_samples,
    )
}

/// Free a granular synthesis instance
#[wasm_bindgen]
pub fn free_granular_instance(ctx: *mut GranularCtx) {
    unsafe {
        if !ctx.is_null() {
            let _ = Box::from_raw(ctx);
        }
    }
}
