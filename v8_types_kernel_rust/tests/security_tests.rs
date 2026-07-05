use v8_types_kernel_rust::*;
use v8_types_kernel_rust::streaming::{WasmStreamingJob, ScriptStreamingJob};

#[test]
fn test_wasm_streaming_overflow_fixed() {
    // total_bytes is 1000
    let mut job = WasmStreamingJob::new(1, 1000);

    // Add 1000 bytes, everything is fine
    job.on_bytes_received(1000).expect("Initial bytes should be accepted");
    assert_eq!(job.received_bytes, 1000);

    // Now add usize::MAX bytes.
    // It should now return an error due to overflow detection.
    let result = job.on_bytes_received(usize::MAX);
    assert!(result.is_err(), "Should return error on overflow");

    // received_bytes should remain unchanged
    assert_eq!(job.received_bytes, 1000);
}

#[test]
fn test_script_streaming_position_no_wrap() {
    let source = vec![0u8; 100];
    let mut job = ScriptStreamingJob::new(1, source);
    job.position = 50;

    // chunk_size = usize::MAX.
    // Using saturating_add, it should stay at 100 (max).
    job.parse_next_chunk(usize::MAX).expect("Should parse next chunk");

    // Position should be at the end, not wrapped
    assert_eq!(job.position, 100);
}
