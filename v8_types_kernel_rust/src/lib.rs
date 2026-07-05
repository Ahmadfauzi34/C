// =====================================================================
// ENGINE-GRADE STABILITY & PERFORMANCE GUARDRAILS (CLIPPY CONFIG)
// =====================================================================

// 1. CORRECTNESS, SECURITY & ARITHMETIC SAFETY
#![deny(clippy::correctness)]
#![deny(clippy::suspicious)]
// Mencegah silent overflow pada operasi bitwise/matematika yang kritis bagi V8
#![deny(clippy::arithmetic_side_effects)]
// Memastikan konstrast konversi pointer/usize aman antar thread
#![deny(clippy::undocumented_unsafe_blocks)]

// 2. PERFORMANCE & MEMORY EFFICIENCY
#![deny(clippy::perf)]
#![allow(clippy::inline_always)]
// Menolak alokasi heap tersembunyi (misal penciptaan Vec/Box di jalur cepat)
#![warn(clippy::alloc_instead_of_core)]
#![allow(clippy::std_instead_of_alloc)]

// 3. DFFDF COMPLIANCE & PANIC ELIMINATION
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]
// Menutup celah panic terselubung dari makro bawaan Rust
#![deny(clippy::unimplemented)]
#![deny(clippy::todo)]
#![deny(clippy::unreachable)]
// Menolak indexing `array[index]` langsung yang bisa memicu panic runtime.
// Memaksa penggunaan `.get()` atau `.get_mut()` untuk mengembalikan Result/Option.
#![deny(clippy::indexing_slicing)]

// 4. PEDANTIC & STYLE
#![warn(clippy::pedantic)]
#![warn(clippy::style)]
#![warn(clippy::complexity)]

// 5. SOA & INDEX EXCLUSIONS (Disesuaikan dengan arsitektur Engine)
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_precision_loss)]
#![allow(clippy::module_name_repetitions)]
// Diizinkan karena manipulasi bitfield V8 seringkali membutuhkan cast usize ke tipe lain
#![allow(clippy::cast_possible_wrap)]

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
pub mod topos;
pub mod wasm;

use crate::dffdf::FailureKind;

/// Centralized Result type for the entire V8 Types Kernel.
/// Guaranteed to never panic and always return a structured diagnostic.
pub type KernelResult<T> = Result<T, FailureKind>;

/// Re-exports for public API surface.
pub use branded::{RawAddress, Smi, TaggedAddress};
pub use dffdf::{CircuitBreaker, FailureKind as KernelError};
pub use heap::{Heap, ObjectIndex, MapIndex, InstanceType};
pub use objects::{JSObject, JSPromise, JSArray, JSFunction, PromiseState};
pub use amb::{MacroBatcher, AtomicBatch};
pub use streaming::{ScriptStreamingJob, WasmStreamingJob};
pub use compiler::{ExecutionTier, ICState};
