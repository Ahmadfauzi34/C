# v8_types_kernel_rust

A framework-agnostic, low-level V8 Engine Simulation and Computing Platform in Rust.

## 🏗 Architecture

This project strictly enforces:
- **Data-Oriented Design (DoD)**: Separating identity from data.
- **Structure of Arrays (SoA)**: Optimizing memory layout for cache locality.
- **Branded Indexing**: Using Newtype patterns to ensure type safety without raw pointers.
- **Defensive Fail-Fast Diagnostic Framework (DFFDF)**: Robust, informative error handling.

## 📁 Project Structure

- `src/branded/`: Type-branding for addresses and Smis.
- `src/heap/`: SoA memory management and allocation.
- `src/objects/`: High-level JS object simulations (Promises, Arrays, etc.).
- `src/dffdf/`: Diagnostic reporting and system defense.
- `src/amb/`: Atomic Macro Batcher for bulk operations.
- `src/streaming/`: Background parser and streaming job simulation.
- `src/compiler/`: Optimization tiers and inline caches.
- `src/sandbox/`: Security isolation stubs.

## 🛠 Building & Testing

### Compilation
```bash
cargo build
```

### Integration Tests
```bash
cargo test
```

### TypeScript Type Generation
To synchronize types with the frontend:
```bash
cargo run --bin generate_ts
```

## 📜 Technical Mandates
- Pure `std` library only.
- ZERO external dependencies.
- Absolute Zero-Panic policy (`unwrap`, `expect`, `panic` are denied).
- Full KB weight compliance for production-grade depth.
