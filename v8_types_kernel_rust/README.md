# V8 Types Kernel Rust

A framework-agnostic, low-level V8 Engine Simulation and Computing Platform in Rust.

## Architecture

This project follows strict Data-Oriented Design (DoD) and Structure of Arrays (SoA) principles.

### Key Components

- **Branded Types**: Newtype patterns for type-safe memory addresses.
- **Heap & Objects**: Index-based memory management simulating V8's heap.
- **DFFDF**: Defensive Fail-Fast Diagnostic Framework for robust error handling.
- **AMB & Streaming**: Batch processing and background job simulation.

## Building

```bash
cargo build
```

## TypeScript Generation

```bash
cargo run --bin generate_ts
```
