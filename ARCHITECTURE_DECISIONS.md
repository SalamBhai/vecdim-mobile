# VECDIM Architecture Decision Records (ADRs)
**Vector-Borne Disease Early Warning and Ingestion Platform**  
*Osun State University (UNIOSUN) | MOOD Africa | Dev-Afrique | NMEP*  
*Author: Sheriffdeen Saula (`saulasheriffdeen@gmail.com`)*  

---

## Overview
This document explains the key engineering decisions made for the VECDIM backend (Go + PostGIS) and mobile app (React Native / Expo). These decisions address practical challenges in rural field surveillance—such as poor cellular networks and multi-day mosquito rearing cycles—while meeting national public health standards for data quality, WHO resistance classifications, and DHIS2 reporting.

---

### ADR-001: Separate Data Ingestion from ML Analysis
- **Status**: Implemented & Verified
- **Context**: At the end of the day, dozens of field officers synchronize surveys at the same time. Running a heavy R machine learning model inside every incoming HTTP request causes server lag, high memory usage, and mobile timeout errors (HTTP 504).
- **Decision**:
  - The Go backend handles data ingestion quickly (< 30ms response time).
  - Validated surveys are saved immediately to PostgreSQL/PostGIS with a status of `UNPROCESSED`.
  - The R analytics pipeline runs asynchronously in the background via:
    1. A scheduled background worker (cron job).
    2. An on-demand trigger endpoint (`POST /api/v1/pipeline/run`).
- **Consequences**: Fast and reliable mobile syncs, reduced mobile battery drain, and zero risk of server crashes during peak sync periods.

---

### ADR-002: Two-Phase Surveillance Lifecycle & "Lifecycle Upsert"
- **Status**: Implemented & Verified
- **Context**: Field entomology follows a two-phase protocol:
  - **Phase 1 (Day 1 - Field Dipping)**: Mosquito larvae are collected in natural water bodies; breeding density and GPS coordinates are recorded.
  - **Phase 2 (Day 7 - Lab Bioassay)**: Larvae are reared to adult mosquitoes in the insectary and tested in WHO tubes for 24-hour mortality against insecticides.
  If an API uses basic deduplication (`if ID exists, reject as duplicate`), submitting the Day 7 lab results for an existing Day 1 field survey would silently discard the bioassay data.
- **Decision**:
  - Phase 1 surveys sync with `who_class = 'Bioassay Pending'`, `n_exposed = 0`, and status `PENDING_BIOASSAY`.
  - The Go backend implements a **Lifecycle Upsert**: when an incoming record matches an existing ID where `existing.NExposed == 0` and `incoming.NExposed > 0`, it recognizes this as a legitimate lab test completion rather than a duplicate upload.
  - The backend calculates WHO mortality ($N_{dead} / N_{exposed}$), assigns the resistance class, updates PostGIS, and updates the status to `UNPROCESSED` for the R ML pipeline.
- **Consequences**: Accurate reflection of real-world laboratory workflows. Prevents duplicate rows while ensuring lab tests remain linked to their original field GPS locations.

---

### ADR-003: Offline-First Mobile Storage with SQLite
- **Status**: Implemented & Verified
- **Context**: Enumerators work in remote rural communities and insectaries with little or no mobile network coverage. If an app stores data only in temporary memory or simple key-value storage, surveys can be lost when closing the app or switching to offline mode.
- **Decision**:
  - We use an embedded SQLite database with Write-Ahead Logging (WAL) on mobile devices (`localStorage` on web preview).
  - **Outbox Queue**: Surveys saved offline are tagged as `pending_sync`.
  - **Local Mirroring**: When online, surveys fetched from the server are mirrored into the local SQLite database as `synced`.
  - **Unified Display**: The app displays both unsynced drafts and cached historical surveys in a single clean list.
- **Consequences**: Field officers can inspect past surveys and complete pending bioassays without an internet connection. Once a connection is restored, pending surveys upload automatically.

---

### ADR-004: Ground-Truth Validation with 100% R Parity
- **Status**: Implemented & Verified
- **Context**: The candidate brief requires the data validation rules to match the 11 entomological checks defined in `R/helpers.R` (GPS bounds, 25km LGA distance limits, future dates, temperature ranges, and duplicate checks).
- **Decision**:
  - Ported all 11 validation rules directly into Go (`internal/validation/rules.go`) using standard Haversine distance calculations on the WGS84 ellipsoid.
  - Built an automated parity test suite (`make parity-test`) that evaluates all 1,525 historical records from the candidate dataset.
- **Results**: **100.00% exact match** with the R reference output (0 differing rows, 222 flagged, 1,303 clean).

---

### ADR-005: State-Based Access Control (RBAC)
- **Status**: Implemented & Verified
- **Context**: State malaria elimination programs require strict data boundaries. A field worker in Osun State must not modify or view records from Lagos or Kano.
- **Decision**:
  - Role hierarchy:
    - `field`: Enumerator locked strictly to their assigned State and surveyed LGAs.
    - `vecdim`: State Coordinator with oversight of all LGAs within their state.
    - `uniosun`: National Consortium Director with nationwide surveillance access.
  - The mobile app locks state selection to the authenticated user profile to prevent accidental cross-state data entry.
- **Consequences**: Enforces data privacy and eliminates cross-state data contamination.

---

### ADR-006: National DHIS2 / NHMIS Interoperability
- **Status**: Implemented & Verified
- **Context**: Malaria surveillance data cannot remain trapped in isolated databases; it must flow into Nigeria's National Health Management Information System (DHIS2).
- **Decision**:
  - Built a DHIS2 export endpoint (`/api/v1/export/dhis2`) that aggregates validated monthly surveys into standard DHIS2 `dataValueSets` JSON.
  - Added a one-tap DHIS2 preview in the mobile app to review the exported indicators before submission.
- **Consequences**: Direct compatibility with Federal Ministry of Health (FMOH) and NMEP national reporting requirements.
