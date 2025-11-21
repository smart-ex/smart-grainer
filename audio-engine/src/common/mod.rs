// Common utilities module
// Provides shared utilities for initialization, logging, and random number generation

use rand::{rngs::StdRng, SeedableRng};
use std::cell::RefCell;

/// Macro for safely getting a mutable reference to a static mutable variable
#[macro_export]
macro_rules! ref_static_mut {
    ($name:ident) => {
        unsafe { &mut $name }
    };
}

thread_local! {
    static RNG: RefCell<Option<StdRng>> = RefCell::new(None);
}

/// Get or initialize the thread-local random number generator
pub fn rng() -> StdRng {
    RNG.with(|rng_cell| {
        let mut rng_opt = rng_cell.borrow_mut();
        if rng_opt.is_none() {
            *rng_opt = Some(StdRng::from_entropy());
        }
        rng_opt.as_ref().unwrap().clone()
    })
}

/// Initialize WASM bindgen and other common systems
pub fn maybe_init(sample_rate: Option<f32>) {
    // Sample rate can be used for future initialization if needed
    let _ = sample_rate;
}

// Set a custom panic hook that logs to JavaScript console
// Uses an external JavaScript function to log errors
extern "C" {
    #[cfg(target_arch = "wasm32")]
    fn log_err(ptr: *const u8, len: usize);
}

pub fn set_raw_panic_hook() {
    std::panic::set_hook(Box::new(|panic_info| {
        #[cfg(target_arch = "wasm32")]
        {
            let msg = format!("Panic: {:?}", panic_info);
            let msg_bytes = msg.as_bytes();
            unsafe {
                log_err(msg_bytes.as_ptr(), msg_bytes.len());
            }
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            eprintln!("{}", panic_info);
        }
    }));
}

