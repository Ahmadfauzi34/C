//! Garbage Collection mechanisms.

#[derive(Debug, Copy, Clone)]
pub enum GCReason {
    AllocationFailure,
    ManualTrigger,
    MemoryPressure,
}

#[derive(Debug, Clone)]
pub struct GCResult {
    pub bytes_freed: usize,
    pub duration_ms: f64,
}

pub struct GarbageCollector;

impl GarbageCollector {
    pub fn collect(_reason: GCReason) -> GCResult {
        GCResult {
            bytes_freed: 1024,
            duration_ms: 0.5,
        }
    }
}
