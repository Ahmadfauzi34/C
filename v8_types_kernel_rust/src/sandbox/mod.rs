//! V8 Sandbox security isolation.

pub struct V8Sandbox {
    pub base: usize,
    pub size: usize,
}

pub struct SandboxPtr(pub u32);

impl V8Sandbox {
    pub fn new(size: usize) -> Self {
        Self {
            base: 0x1000_0000, // Simulated base
            size,
        }
    }

    pub fn resolve(&self, ptr: SandboxPtr) -> usize {
        self.base + (ptr.0 as usize)
    }
}
