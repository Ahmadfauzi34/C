//! V8 Embedding API.

use crate::branded::TaggedAddress;

pub struct V8API;

pub struct FunctionCallbackInfo {
    pub args: Vec<TaggedAddress>,
    pub return_value: TaggedAddress,
}

impl V8API {
    pub fn enter_isolate() {
        // Simulation
    }
}
