//! Sea-of-Nodes Compiler Graph representation.

pub struct GraphNode {
    pub id: u32,
    pub op: OpCode,
}

pub enum OpCode {
    Parameter,
    Add,
    Sub,
    Return,
}

pub struct GraphEdge {
    pub from: u32,
    pub to: u32,
}
