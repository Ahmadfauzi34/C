// =====================================================================
// ENGINE-GRADE STABILITY & PERFORMANCE GUARDRAILS (CLIPPY CONFIG)
// =====================================================================

// 1. CORRECTNESS & SECURITY
#![deny(clippy::correctness)]
#![deny(clippy::suspicious)]

// 2. PERFORMANCE
#![deny(clippy::perf)]
#![warn(clippy::inline_always)]

// 3. DFFDF COMPLIANCE
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]

// 4. PEDANTIC & STYLE
#![warn(clippy::pedantic)]
#![warn(clippy::style)]
#![warn(clippy::complexity)]

// 5. SOA & INDEX EXCLUSIONS
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_precision_loss)]
#![allow(clippy::module_name_repetitions)]

pub mod advanced;
pub mod amb;
pub mod api;
pub mod branded;
pub mod compiler;
pub mod dffdf;
pub mod gc;
pub mod graph;
pub mod heap;
pub mod objects;
pub mod sandbox;
pub mod streaming;
pub mod wasm;

use crate::dffdf::FailureKind;

/// Centralized Result type for the entire V8 Types Kernel.
/// Guaranteed to never panic and always return a structured diagnostic.
pub type KernelResult<T> = Result<T, FailureKind>;

/// Re-exports for easier access.
pub use branded::{RawAddress, Smi, TaggedAddress};
pub use dffdf::{CircuitBreaker};
pub use heap::{Heap, ObjectIndex};
