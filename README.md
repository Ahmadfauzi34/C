v8_types_kernel_rust/
├── Cargo.toml                    # std-only, no external deps
├── build.rs                      # Build timestamp
├── README.md                     # Dokumentasi
├── .gitignore
├── src/
│   ├── lib.rs                    # Main library
│   ├── branded/mod.rs            # RawAddress, Smi, TaggedAddress (7 KB)
│   ├── heap/mod.rs               # Heap, HeapObject, Map (11 KB)
│   ├── objects/mod.rs            # JSObject, JSPromise, JSArray (26 KB)
│   ├── compiler/mod.rs           # ExecutionTier, InlineCache (3 KB)
│   ├── sandbox/mod.rs            # V8Sandbox, SandboxPtr (1 KB)
│   ├── wasm/mod.rs               # WasmModule, WasmInstance (0.8 KB)
│   ├── gc/mod.rs                 # GCReason, GCResult (1 KB)
│   ├── streaming/mod.rs          # ScriptStreamingJob, WasmStreamingJob (14 KB)
│   ├── dffdf/mod.rs              # FailureKind, CircuitBreaker (18 KB)
│   ├── amb/mod.rs                # AtomicBatch, MacroBatcher (16 KB)
│   ├── graph/mod.rs              # GraphNode, GraphEdge (1 KB)
│   ├── advanced/mod.rs           # TopologicalSpace, QuantumState (0.6 KB)
│   └── api/mod.rs                # V8API, FunctionCallbackInfo (0.6 KB)
├── tests/
│   └── integration_tests.rs      # Cross-module tests (4.6 KB)
├── benches/
│   └── amb_benchmark.rs          # Benchmark placeholder
└── scripts/
    └── generate_ts.rs            # TypeScript generation script (4 KB)

