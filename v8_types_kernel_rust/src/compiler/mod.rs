//! V8 Compiler Tiers and Inline Caches.

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum ExecutionTier {
    Ignition,   // Interpreter
    Sparkplug,  // Non-optimizing compiler
    Maglev,     // Mid-tier optimizing compiler
    Turbofan,   // Top-tier optimizing compiler
}

pub struct InlineCache {
    pub state: ICState,
    pub hits: u32,
    pub misses: u32,
}

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum ICState {
    Uninitialized,
    PreMonomorphic,
    Monomorphic,
    Polymorphic,
    Megamorphic,
    Generic,
}

impl InlineCache {
    pub fn new() -> Self {
        Self {
            state: ICState::Uninitialized,
            hits: 0,
            misses: 0,
        }
    }

    pub fn record_hit(&mut self) {
        self.hits += 1;
        if self.hits > 100 && self.state == ICState::Uninitialized {
            self.state = ICState::Monomorphic;
        }
    }

    pub fn record_miss(&mut self) {
        self.misses += 1;
        if self.misses > 10 {
            self.state = ICState::Megamorphic;
        }
    }
}
