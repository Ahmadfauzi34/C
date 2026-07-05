//! WebAssembly Support Simulation.
//!
//! Models the integration of WebAssembly within the V8 engine,
//! focusing on validation and tiered compilation.

use crate::KernelResult;
use crate::dffdf::FailureKind;

/// Represents a WebAssembly module being processed by the kernel.
pub struct WasmModule {
    pub id: u32,
    pub bytecode: Vec<u8>,
    pub is_valid: bool,
}

impl WasmModule {
    /// Creates a new Wasm module.
    #[must_use]
    pub fn new(id: u32, bytecode: Vec<u8>) -> Self {
        Self {
            id,
            bytecode,
            is_valid: false,
        }
    }

    /// Validates the Wasm bytecode according to the specification.
    ///
    /// # Errors
    /// Returns `FailureKind::WasmValidationError` if validation fails.
    pub fn validate(&mut self) -> KernelResult<()> {
        if self.bytecode.is_empty() {
            return Err(FailureKind::WasmValidationError {
                offset: 0,
                reason: "Empty bytecode",
            });
        }
        self.is_valid = true;
        Ok(())
    }
}
