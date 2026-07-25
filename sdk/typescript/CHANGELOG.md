# Changelog

## 0.7.4-alpha.1

- Persisted explainable salience scores and retention signals on every memory.
- Added direct, supported, corroborated, and unverified evidence coverage states.
- Recomputed quality metadata when provenance gains independent evidence.
- Replaced query-time milestone rules with persisted long-term admission metadata.
- Added idempotent SQLite migration and restart coverage.
## 0.7.3-alpha.1

- Added deterministic controlled-claim extraction for common personal facts.
- Added persisted lifecycle stages, event ordering, retry backoff, and reflection cursors.
- Added claim reconciliation for add, confirm, supersede, dispute, correction, and invalidation.
- Added rule-based query planning, multi-channel recall, bounded evidence fallback, and recall traces.
- Added temporal filtering, provenance propagation, long-term salience admission, and stale-fact suppression.
- Added reversible identity merge/split and auditable claim re-key operations.