# VECDIM Architecture Decision Records (ADRs)
**Vector-Borne Disease Early Warning and Ingestion Platform**  
*Osun State University (UNIOSUN) | MOOD Africa | Dev-Afrique | NMEP*  
*Author: Sheriffdeen Saula (`saulasheriffdeen@gmail.com`)*  

---

## Executive Overview
This document formalizes the core architectural and engineering decisions designed and implemented across **`vecdim-backend`** (Go + PostGIS) and **`vecdim-mobile`** (React Native / Expo SDK 54). These decisions resolve the tensions between real-world rural field conditions (intermittent cellular connectivity, multi-day mosquito rearing cycles) and national public health epidemiological standards (strict WHO resistance classifications, DHIS2 interoperability, 100% mathematical parity with R models).

---

### ADR-001: Decoupled Staged Ingestion (Asynchronous ML Isolation)
- **Status**: Implemented & Verified
- **Context**: In public health surveillance, hundreds of field officers synchronize batches of entomological surveys simultaneously (e.g., at end of day). The downstream R analytics pipeline computes spatial covariates (Rainfall, Temp, NDVI) and fits a Random Forest classifier. Triggering R synchronously inside HTTP request handlers causes thread exhaustion, high memory pressure, and mobile HTTP 504 timeouts.
- **Decision**: 
  - The Go backend acts as a high-throughput, low-latency point of entry (< 30ms response time).
  - Validated records are atomically persisted in PostgreSQL/PostGIS with staged status `UNPROCESSED`.
  - The analytics pipeline is decoupled into an asynchronous worker triggered via:
    1. Background cron scheduler (configurable interval, default: 30 mins).
    2. On-demand administrative REST endpoint (`POST /api/v1/pipeline/run`).
- **Consequences**: Immediate 200 OK responses for mobile clients; cellular data savings; zero risk of ingestion bottlenecking.

---

### ADR-002: Two-Phase Surveillance Lifecycle & Backend "Lifecycle Upsert"
- **Status**: Implemented & Verified
- **Context**: The NMEP Form E-1 entomology protocol is inherently two-phased:
  - **Phase 1 (Day 1 - Field Dipping)**: Larvae collected from natural habitats; density and GPS coordinates recorded.
  - **Phase 2 (Day 7 - Lab Bioassay)**: Larvae reared to adulthood in the insectary; exposed to insecticide in WHO test tubes; 24-hr mortality recorded.
  If an API uses naive idempotency (`SELECT WHERE id = ? -> if exists return 'already_received'`), submitting the Phase 2 lab results for an existing Phase 1 record would silently drop the bioassay data.
- **Decision**:
  - Phase 1 records sync with `who_class = 'Bioassay Pending'`, `n_exposed = 0`, and `status = 'PENDING_BIOASSAY'`.
  - The Go backend implements a **Lifecycle Upsert**: when an incoming record matches an existing record where `existing.NExposed == 0 && incoming.NExposed > 0`, it detects a legitimate lifecycle completion rather than a duplicate replay.
  - The backend computes WHO mortality ($N_{dead} / N_{exposed}$), assigns the WHO resistance class, updates PostGIS, and transitions status to `UNPROCESSED` to queue the completed survey for the R ML pipeline.
- **Consequences**: Strict data integrity; field records never duplicated; laboratory bioassay outcomes reliably linked to field GPS coordinates.

---

### ADR-003: Offline-First SQLite Cache-Through Persistence
- **Status**: Implemented & Verified
- **Context**: Field enumerators operate in rural agrarian settlements and insectaries located in facilities with zero cellular or Wi-Fi signal. If an app relies purely on in-memory React state, toggling offline erases historical records, preventing officers from reviewing previous sites or resuming bioassays.
- **Decision**:
  - Local persistence engine powered by SQLite with Write-Ahead Logging (WAL) on native devices (`localStorage` web fallback).
  - Outbox pattern: Surveys saved offline receive `sync_status = 'pending_sync'`.
  - **Cache-Through Ingestion**: When online, server records retrieved from `GET /api/v1/records` are automatically mirrored into the local SQLite database as `synced`.
  - The UI consumes a unified collection: `pendingLocalRecords` (outbox queue) + `unifiedSyncedRecords` (locally cached synced surveys).
- **Consequences**: All surveys remain visible, searchable, and actionable when offline. The insectary technician can open a previously synced larval record and click *"Complete WHO Bioassay (Day 7)"* with zero internet connectivity.

---

### ADR-004: Point-of-Entry Geofencing & Strict 11-Rule Parity
- **Status**: Implemented & Verified
- **Context**: Ground-truth spatial validation rules in the R candidate pack (`R/helpers.R`) enforce 11 critical validation checks (GPS bounding boxes, 25km LGA centroid limits, future dates, temperature plausibility, and duplicate detection).
- **Decision**:
  - Re-implemented the exact 11 validation rules in Go (`internal/validation/rules.go`) with identical mathematical precision (Haversine formula on WGS84 ellipsoid).
  - Created an automated parity suite (`make parity-test`) comparing Go output against the 1,525 historical ground-truth records.
- **Results**: **100.00% exact match** (0 differing rows, 222 flagged, 1,303 clean).

---

### ADR-005: State-Locked Role-Based Access Control (RBAC)
- **Status**: Implemented & Verified
- **Context**: State malaria elimination programs require strict data sovereignty. An enumerator in Osun must not alter or corrupt Kano State surveillance records.
- **Decision**:
  - Multi-tier role hierarchy:
    - `field`: Enumerator locked strictly to their assigned State and surveyed LGAs.
    - `vecdim`: State Coordinator with oversight of all LGAs within their state.
    - `uniosun`: National Consortium Director with nationwide surveillance oversight.
  - Client state jurisdiction is locked to the authenticated profile and cannot be manipulated via dropdowns.
- **Consequences**: Enforces auditability and prevents cross-state data contamination.

---

### ADR-006: National DHIS2 / NHMIS Interoperability Bridge
- **Status**: Implemented & Verified
- **Context**: Surveillance platforms cannot exist as data silos; insights must flow directly into Nigeria's National Health Management Information System (NHMIS).
- **Decision**:
  - The backend provides a native DHIS2 export adapter (`/api/v1/dhis2/export`) that aggregates monthly clean surveys into the official `dataValueSets` JSON structure.
  - Mobile app features a one-tap DHIS2 preview modal to review the transmitted epidemiological metrics.
- **Consequences**: Full compliance with FMOH and NMEP national reporting standards.
