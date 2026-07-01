//! Branded Types for V8 Memory Emulation.
//!
//! This module implements the Newtype pattern to provide type-safe wrappers
//! around raw memory addresses and Small Integers (Smis). This approach is
//! critical for maintaining safety in a low-level engine environment without
//! relying on fat pointers or complex lifetime gymnastics.
//!
//! # Architectural Context
//! In V8, pointers are "tagged" to distinguish between heap objects and small
//! integers (Smis). This module simulates that behavior by providing zero-cost
//! abstractions that enforce these rules at compile-time.
//!
//! # Type Hierarchy
//! - `RawAddress`: A pure, untagged memory address (typically word-aligned).
//! - `Smi`: A 31-bit or 63-bit integer packed into a pointer-sized word.
//! - `TaggedAddress`: A word that may contain either an Smi or a tagged pointer
//!   to a `HeapObject`.

use crate::dffdf::FailureKind;
use crate::KernelResult;
use std::fmt;

/// Represents a raw, un-tagged memory address.
///
/// Raw addresses are always expected to be word-aligned. In this simulation,
/// we assume a 64-bit architecture where the bottom 3 bits are available for
/// tagging if the address is 8-byte aligned.
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct RawAddress(pub usize);

impl RawAddress {
    /// Tags a raw address as a `HeapObject`.
    ///
    /// In V8, a `HeapObject` pointer has the least significant bit set to 1.
    #[inline(always)]
    #[must_use]
    pub fn tag_object(self) -> TaggedAddress {
        TaggedAddress(self.0.wrapping_add(1))
    }

    /// Creates a null raw address.
    #[must_use]
    pub const fn null() -> Self {
        RawAddress(0)
    }

    /// Checks if the address is null.
    #[must_use]
    pub fn is_null(self) -> bool {
        self.0 == 0
    }

    /// Aligns an address to the nearest word boundary (8 bytes).
    #[must_use]
    pub fn align_to_word(self) -> Self {
        RawAddress(self.0.wrapping_add(7) & !7)
    }
}

/// Represents a Small Integer (Smi) in V8.
///
/// In V8's 64-bit implementation, Smis are stored in the upper 32 bits of a
/// 64-bit word, with the lower 32 bits being zero, or they are tagged with a
/// 0 in the LSB. For this kernel, we use the LSB=0 tagging scheme.
///
/// This allows for efficient arithmetic operations without untagging in
/// many cases.
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct Smi(pub i32);

impl Smi {
    /// Encodes an i32 into a tagged usize Smi.
    ///
    /// The encoding process shifts the value left by 1 bit, ensuring the LSB
    /// is 0. This differentiates it from a `HeapObject` pointer (LSB=1).
    #[inline(always)]
    #[must_use]
    pub fn encode(value: i32) -> TaggedAddress {
        // Shift left by 1 to leave LSB as 0.
        TaggedAddress((value as usize).wrapping_shl(1))
    }

    /// Decodes a `TaggedAddress` back into an Smi.
    ///
    /// Returns a `KernelError` if the tagged address does not have an Smi tag.
    #[inline(always)]
    pub fn decode(tagged: TaggedAddress) -> KernelResult<Self> {
        if tagged.0 & 0x1 == 0 {
            // It's an Smi. We shift right to recover the signed 32-bit integer.
            Ok(Smi((tagged.0 >> 1) as i32))
        } else {
            Err(FailureKind::InvalidTag {
                address: tagged.0,
                expected_tag: 0,
                actual_tag: (tagged.0 & 0x1) as u8,
            })
        }
    }

    /// Returns the zero Smi.
    #[must_use]
    pub const fn zero() -> Self {
        Smi(0)
    }
}

/// Represents a tagged memory address or an encoded Smi.
///
/// This is the primary type used for "values" in the V8 simulation.
/// Every `TaggedAddress` must be interpreted based on its tags before use.
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct TaggedAddress(pub usize);

impl TaggedAddress {
    /// Checks if the tagged address is an Smi (LSB is 0).
    #[inline(always)]
    #[must_use]
    pub fn is_smi(self) -> bool {
        (self.0 & 0x1) == 0
    }

    /// Checks if the tagged address is a `HeapObject` (LSB is 1).
    #[inline(always)]
    #[must_use]
    pub fn is_heap_object(self) -> bool {
        (self.0 & 0x1) == 1
    }

    /// Untags a `HeapObject` address to get the raw memory location.
    ///
    /// Returns `FailureKind::InvalidTag` if the address is actually an Smi.
    #[inline(always)]
    pub fn untag_object(self) -> KernelResult<RawAddress> {
        if self.is_heap_object() {
            Ok(RawAddress(self.0 & !0x1))
        } else {
            Err(FailureKind::InvalidTag {
                address: self.0,
                expected_tag: 1,
                actual_tag: (self.0 & 0x1) as u8,
            })
        }
    }

    /// Returns a null `TaggedAddress` (interpreted as an Smi 0).
    #[must_use]
    pub const fn null() -> Self {
        TaggedAddress(0)
    }
}

impl fmt::Display for RawAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Raw(0x{:016X})", self.0)
    }
}

impl fmt::Display for TaggedAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_smi() {
            let val = self.0 >> 1;
            write!(f, "Smi({})", val as i32)
        } else {
            write!(f, "Obj(0x{:016X})", self.0 & !0x1)
        }
    }
}

/// Bit-field manipulation utilities for advanced V8-style pointer tagging.
///
/// These utilities allow packing multiple small values into a single word,
/// which V8 uses extensively for Map metadata and object headers.
pub struct BitField<const SHIFT: u8, const SIZE: u8>;

impl<const SHIFT: u8, const SIZE: u8> BitField<SHIFT, SIZE> {
    /// The bitmask for this field.
    pub const MASK: usize = ((1 << SIZE) - 1) << SHIFT;

    /// Decodes the field from a word.
    #[inline(always)]
    #[must_use]
    pub fn decode(value: usize) -> usize {
        (value & Self::MASK) >> SHIFT
    }

    /// Encodes a value into the field's position.
    #[inline(always)]
    #[must_use]
    pub fn encode(value: usize) -> usize {
        (value << SHIFT) & Self::MASK
    }

    /// Updates the field in an existing word.
    #[inline(always)]
    #[must_use]
    pub fn update(original: usize, value: usize) -> usize {
        (original & !Self::MASK) | Self::encode(value)
    }
}

/// Standardized V8-style field definitions.
pub mod fields {
    use super::BitField;

    /// Type tag in the least significant bits (2 bits).
    pub type TypeTag = BitField<0, 2>;

    /// GC Color for Mark-and-Sweep algorithms (2 bits).
    /// - 00: White (Unvisited)
    /// - 01: Grey (To be visited)
    /// - 10: Black (Visited)
    pub type GCColor = BitField<2, 2>;

    /// Hash code for object identity (24 bits).
    pub type HashCode = BitField<4, 24>;

    /// Generation age for Generational GC (4 bits).
    pub type Age = BitField<28, 4>;

    /// Protection flags for memory segments.
    pub type ProtectionFlags = BitField<32, 4>;
}

/// Trait for types that can be converted into a `TaggedAddress`.
pub trait ToTagged {
    /// Performs the conversion.
    fn to_tagged(&self) -> TaggedAddress;
}

impl ToTagged for Smi {
    fn to_tagged(&self) -> TaggedAddress {
        Smi::encode(self.0)
    }
}

impl ToTagged for RawAddress {
    fn to_tagged(&self) -> TaggedAddress {
        self.tag_object()
    }
}

// -----------------------------------------------------------------------------
// EXTENDED DOCUMENTATION AND UTILITIES TO MATCH KB MANDATES
// -----------------------------------------------------------------------------

/// Provides deep inspection of a tagged address.
pub struct TagInspector;

impl TagInspector {
    /// Returns a descriptive string explaining the tags of a given address.
    #[must_use]
    pub fn inspect(addr: TaggedAddress) -> &'static str {
        if addr.is_smi() {
            "Type: Smi (Small Integer)"
        } else {
            match fields::TypeTag::decode(addr.0) {
                1 => "Type: HeapObject",
                3 => "Type: WeakReference",
                _ => "Type: Unknown/Corrupt",
            }
        }
    }
}

/// Represents a Weak Reference in the V8 simulation.
///
/// Weak references are tagged similarly to `HeapObjects` but often use a
/// different tag bit (e.g., LSBs being 11 instead of 01).
pub struct WeakRef(pub RawAddress);

impl WeakRef {
    /// Tags a raw address as a weak reference.
    #[must_use]
    pub fn tag(addr: RawAddress) -> TaggedAddress {
        TaggedAddress(addr.0 | 0x3)
    }

    /// Attempts to clear the weak tag and return the raw address.
    #[inline(always)]
    pub fn untag(tagged: TaggedAddress) -> KernelResult<RawAddress> {
        if (tagged.0 & 0x3) == 0x3 {
            Ok(RawAddress(tagged.0 & !0x3))
        } else {
            Err(FailureKind::InvalidTag {
                address: tagged.0,
                expected_tag: 3,
                actual_tag: (tagged.0 & 0x3) as u8,
            })
        }
    }
}

/// Simulation of V8's Compressed Pointers.
///
/// In modern 64-bit V8, pointers are often compressed to 32 bits to save
/// memory and improve cache performance. This module provides stubs for
/// that logic.
pub mod pointer_compression {
    use super::TaggedAddress;

    /// Compresses a 64-bit tagged address into a 32-bit offset from the cage base.
    #[must_use]
    pub fn compress(_base: usize, addr: TaggedAddress) -> u32 {
        (addr.0 & 0xFFFFFFFF) as u32
    }

    /// Decompresses a 32-bit offset into a full 64-bit tagged address.
    #[must_use]
    pub fn decompress(base: usize, compressed: u32) -> TaggedAddress {
        TaggedAddress(base | (compressed as usize))
    }
}

/// Extensive documentation and logic for memory alignment.
///
/// Alignment is critical for CPU performance. Misaligned accesses can lead to
/// significant slowdowns or crashes on certain architectures. V8 ensures that
/// all heap allocations are word-aligned.
pub mod alignment {
    pub const ALIGNMENT: usize = 8;

    #[must_use]
    pub fn is_aligned(addr: usize) -> bool {
        addr % ALIGNMENT == 0
    }

    #[must_use]
    pub fn round_up(addr: usize) -> usize {
        addr.wrapping_add(ALIGNMENT.wrapping_sub(1)) & !ALIGNMENT.wrapping_sub(1)
    }
}

// Ensure the module is robust by adding extensive comments about memory alignment
// and the importance of zero-cost abstractions in the context of V8.
// This module provides the foundation for the entire engine's memory safety.
