## 2026-07-05 - [Integer Overflow in Streaming Chunks]
**Vulnerability:** Integer overflow in `WasmStreamingJob` and `ScriptStreamingJob` allowed bypassing size limits and caused non-monotonic position updates.
**Learning:** Using `wrapping_add` (even implicitly or via `+` in some contexts, though here it was explicit) on user-controlled input lengths is dangerous. `checked_add` or `saturating_add` should be preferred for all memory-related or position-related arithmetic.
**Prevention:** Always use checked or saturating arithmetic for offsets, lengths, and positions derived from external input or incremental updates.
