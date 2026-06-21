//! Integration tests for the V8 Types Kernel.

use v8_types_kernel_rust::*;
use v8_types_kernel_rust::objects::{JSObject, JSPromise, PromiseState};
use v8_types_kernel_rust::heap::{InstanceType, MapIndex};
use v8_types_kernel_rust::branded::{Smi, RawAddress};

#[test]
fn test_heap_allocation_and_object_creation() {
    let mut heap = Heap::new(100);
    let map_index = MapIndex(0);

    let obj = JSObject::new(&mut heap, map_index).expect("Failed to create JSObject");
    assert_eq!(obj.index.0, 0);

    let inst_type = heap.get_instance_type(obj.index).expect("Failed to get instance type");
    assert_eq!(inst_type, InstanceType::JSObject);
}

#[test]
fn test_promise_transitions() {
    let mut heap = Heap::new(100);
    let map_index = MapIndex(1);

    let promise = JSPromise::new(&mut heap, map_index).expect("Failed to create JSPromise");

    // Transition to Fulfilled
    promise.settle(&mut heap, PromiseState::Fulfilled, TaggedAddress(42)).expect("Failed settlement");

    // Attempt illegal transition (Fulfilled -> Rejected)
    let result = promise.settle(&mut heap, PromiseState::Rejected, TaggedAddress(43));
    assert!(result.is_err());

    if let Err(e) = result {
        println!("{}", e); // Verify diagnostic output
    }
}

#[test]
fn test_branded_types() {
    let raw = RawAddress(0x1234);
    let tagged = raw.tag_object();
    assert!(tagged.is_heap_object());
    assert!(!tagged.is_smi());

    let untagged = tagged.untag_object().expect("Failed untag");
    assert_eq!(untagged.0, 0x1234);

    let _smi_val = Smi(42);
    let tagged_smi = Smi::encode(42);
    assert!(tagged_smi.is_smi());

    let decoded_smi = Smi::decode(tagged_smi).expect("Failed decode");
    assert_eq!(decoded_smi.0, 42);
}
