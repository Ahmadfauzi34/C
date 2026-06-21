//! WebAssembly Module and Instance simulation.

pub struct WasmModule {
    pub bytes: Vec<u8>,
}

pub struct WasmInstance {
    pub module_id: u32,
    pub memory_size: usize,
}

impl WasmModule {
    pub fn new(bytes: Vec<u8>) -> Self {
        Self { bytes }
    }
}
