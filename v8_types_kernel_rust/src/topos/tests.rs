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
}
