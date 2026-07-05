use v8_types_kernel_rust::amb::{MicroKernelScheduler, KernelTask, TaskState};
use std::time::Instant;

fn main() {
    let mut scheduler = MicroKernelScheduler::new(10);
    let num_tasks = 10000;
    for i in 0..num_tasks {
        scheduler.add_task(KernelTask {
            pid: i,
            state: TaskState::Ready,
            priority: 1,
            time_quanta_remaining: 10,
            cpu_time_ms: 0,
        });
    }

    println!("Starting Scheduler Benchmark with {} tasks...", num_tasks);
    let start = Instant::now();

    for _ in 0..100000 {
        let _ = scheduler.context_switch().unwrap();
    }

    let duration = start.elapsed();
    println!("Performed 100,000 context switches in {:?}", duration);
}
