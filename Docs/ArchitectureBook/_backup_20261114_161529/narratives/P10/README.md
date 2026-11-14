# Phase 10 - Observability, Deployment & DR

**Status:** 0/20 complete.

Phase 10 is not yet started. It makes the platform operable: metrics and alert definitions, distributed tracing (UI -> worker), log retention and event-driven cache invalidation, Kubernetes Blue/Green deployments with HPA, LaunchDarkly guarded rollouts with kill switches, automated rollback on the stated triggers, disaster recovery drills (RPO < 15 min, RTO < 1 hour), runbooks, chaos experiments and the 99.9% SLO.

## What remains

- **P10-T01-S01-M01** (TODO) - Emit core.dsp.latency, core.observer.cycle_duration, core.transition.failure_rate, core.degraded_mode.active and system.thread.starvation from the code paths that own them.
- **P10-T01-S01-M02** (TODO) - Emit the OTOMIX metrics otomix.ingest.duration, otomix.ingest.rejected_files, otomix.export.xml_duration, otomix.store.webhook_failures, otomix.dlq.depth, otomix.store.bundle_generation_duration.
- **P10-T01-S02-M01** (TODO) - Define Datadog monitors as code: critical when extraction exceeds 2500 ms, critical when thread blockage exceeds 10 ms, and P99 alerts on every histogram per tenant and region.
- **P10-T01-S02-M02** (TODO) - Define OTOMIX monitors: DLQ depth sustained non-zero, webhook signature-failure burst, P99 for ingest, export and bundle histograms.
- **P10-T02-S01-M01** (TODO) - Verify the span chain browser → Node gateway → gRPC → Core Command → WASM worker with W3C traceparent propagation.
- **P10-T02-S01-M02** (TODO) - Configure tail-based sampling: 100% of errors and of spans over alert thresholds, probabilistic for the rest.
- **P10-T03-S01-M01** (TODO) - Configure retention: 90-day hot storage for application logs and 7 years for admin audit logs.
- **P10-T03-S01-M02** (TODO) - Implement event-driven cache invalidation with PostgreSQL LISTEN/NOTIFY, a TTL backstop and single-flight reloads.
- **P10-T04-S01-M01** (TODO) - Provide Blue/Green Deployments and a Service selector switch for the Core and Gateway.
- **P10-T04-S01-M02** (TODO) - Configure the HPA to target 60% CPU.
- **P10-T04-S02-M01** (TODO) - Automate rollback when 5xx exceeds 1% within 5 minutes of a deploy or the audio thread failure rate exceeds 0.1%.
- **P10-T04-S02-M02** (TODO) - Wrap LaunchDarkly evaluation so flag state is snapshotted outside the audio thread, falls back to the safe shipping behavior and can act as a kill switch.
- **P10-T04-S02-M03** (TODO) - Define the guarded-rollout config: stages 1% (1 h), 10% (24 h), 50% (24 h), 100% (24 h) monitoring transition failure rate, extraction P99, 5xx ratio and DSP latency P99.
- **P10-T04-S02-M04** (TODO) - Create the OTOMIX flag inventory (otomix.export.<target>-xml-v2, core.dsp.chop-grid-*, core.analysis.voice-instrumental-model-*) with owners, removal dates and a stale-flag report.
- **P10-T05-S01-M01** (TODO) - Configure asynchronous cross-region PostgreSQL replication with an RPO monitor that alerts at 15 minutes of lag.
- **P10-T05-S01-M02** (TODO) - Replicate blobs across dual geographic zones with immutable locks preventing deletion for 30 days after ingestion.
- **P10-T05-S01-M03** (TODO) - Schedule quarterly chaos experiments (pod termination and network partition of the PostgreSQL writer) with hypothesis, blast-radius limit and abort condition.
- **P10-T05-S01-M04** (TODO) - Write the runbooks for regional failover, thread-starvation degraded mode and DLQ replay.
- **P10-T05-S01-M05** (TODO) - Run a staging DR drill and record RPO and RTO measurements.
- **P10-T06-S01-M01** (TODO) - Add synthetic probes and a 99.9% monthly SLO dashboard with burn-rate alerts.

