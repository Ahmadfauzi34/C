## 2025-05-14 - [VecDeque for Scheduler Queue]
**Learning:** Using `Vec` as a FIFO queue (with `remove(0)`) is $O(n)$ and becomes a major bottleneck for large task queues. `VecDeque` provides $O(1)$ `pop_front()`.
**Action:** Always prefer `VecDeque` for FIFO queues in performance-critical paths like schedulers. Avoid modifying public field types to prevent breaking changes; instead, encapsulate the data structure.
