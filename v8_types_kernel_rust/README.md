# v8_types_kernel_rust

A framework-agnostic, low-level V8 Engine Simulation and Computing Platform in Rust, evolved for **OS Kernel Research**.

## 🏗 Architecture

This project strictly enforces:
- **Data-Oriented Design (DoD)**: Separating identity from data.
- **Structure of Arrays (SoA)**: Optimizing memory layout for cache locality.
- **Branded Indexing**: Using Newtype patterns to ensure type safety without raw pointers.
- **Defensive Fail-Fast Diagnostic Framework (DFFDF)**: Robust, informative error handling with Rust-compiler style output.

## 📁 Project Structure

- `src/branded/`: Type-branding for addresses and Smis.
- `src/heap/`: SoA memory management and **4-level Page Table (MMU)** simulation.
- `src/objects/`: High-level JS object simulations (Promises, Arrays, etc.).
- `src/dffdf/`: Diagnostic reporting, **Kernel Panic** simulation, and system defense.
- `src/amb/`: **Micro-Kernel Scheduler** with context switching and preemption.
- `src/streaming/`: Background parser and streaming job simulation.
- `src/compiler/`: Optimization tiers and experimental **Speculative JIT**.
- `src/advanced/`: Speculative research layer (Topological path mapping).

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
To synchronize kernel types (including scheduler and MMU states) with the frontend:
```bash
cargo run --bin generate_ts
```

## 📜 Technical Mandates
- Pure `std` library only.
- ZERO external dependencies.
- Absolute Zero-Panic policy (`unwrap`, `expect`, `panic` are denied in lib).
- High logic density for high-fidelity simulation.
