#[cfg(test)]
mod tests {
    use crate::topos::*;

    #[test]
    fn build_time_mmu_validation() {
        let mut sheaf = MmuSheaf::new();

        // Simulate L2 Table mappings
        sheaf.register_level(PageTableLevel::L2, vec![
            (BrandedVAddr(0x1000), BrandedPAddr(0x5000)),
            (BrandedVAddr(0x2000), BrandedPAddr(0x6000)),
        ]);

        // Simulate L3 Table mappings (disagreeing on second entry)
        sheaf.register_level(PageTableLevel::L3, vec![
            (BrandedVAddr(0x1000), BrandedPAddr(0x5000)),
            (BrandedVAddr(0x2000), BrandedPAddr(0x7000)), // Contradiction!
        ]);

        // Validation: gluing should fail
        let result = sheaf.glue_virtual_to_physical();
        assert!(result.is_err());

        if let Err(e) = result {
            println!("Detected Build-Time MMU Contradiction:\n{}", e);
        }
    }

    #[test]
    fn scheduler_reachability_proof() {
        let mut topos = SchedulerTopos::new();
        let t1 = BrandedTaskId(1);

        // At Idle stage, should not be running
        assert!(!topos.evaluate_modal("running", ModalOperator::Necessity));

        // Advance to running stage
        topos.advance_stage(KripkeStage::Running { task_id: t1 });

        // Now it is "possible" (was true in some stage)
        assert!(topos.evaluate_modal("running", ModalOperator::Possibility));
    }

    #[test]
    fn univalence_state_identification() {
        let p = PathP {
            start: 100,
            end: 100,
            mapping: "Identity".to_string(),
        };

        // HoTT Univalence: if states are equivalent (here same value),
        // the path proves they are identical.
        assert!(UnivalenceAxiom::id_to_equiv(&p));
    }

    #[test]
    fn compiler_path_homotopy() {
        use crate::compiler::{HoTTCompilerVerifier, ExecutionTier};

        let optimized = ExecutionTier::Turbofan;
        let bytecode_path = PathP {
            start: ExecutionTier::Ignition,
            end: ExecutionTier::Ignition,
            mapping: "Identity Bytecode Path".to_string(),
        };

        // Turbofan projects back to Ignition, so it is equivalent to Ignition path.
        assert!(HoTTCompilerVerifier::verify_optimization_equivalence(&optimized, &bytecode_path));
    }
}
