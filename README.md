# VECDIM Mobile Application
**Vector-Borne Disease Early Warning & Field Ingestion Platform**  
*Technical Assessment Submission — Lead Developer (Mobile App & Backend)*  
*Osun State University (UNIOSUN) | MOOD Africa | Dev-Afrique | NMEP*  
*Applicant: Sheriffdeen Saula (`saulasheriffdeen@gmail.com`)*

---

## 🌟 Overview & Architecture

`vecdim-mobile` is an offline-first mobile application built on **Expo SDK 54** and **React Native** designed for entomological field surveillance across Osun, Lagos, and Kano States.

### Key Architectural Capabilities
1. **Offline Persistence**: SQLite with Write-Ahead Logging (WAL) on iOS/Android with automatic `localStorage` fallback on web preview.
2. **Strict Spatial & State Governance**: A field officer's state is **automatically derived and locked to their assigned territory** based on their authenticated profile. Officers cannot arbitrarily alter their state jurisdiction.
3. **Point-of-Collection WHO Bioassay Logic**: Real-time tube-test mortality calculations with instant classification:
   - $\ge 98.0\%$: **Susceptible** (Green)
   - $90.0\% - 97.9\%$: **Possible Resistance** (Amber)
   - $< 90.0\%$: **Confirmed Resistance** (Red)
4. **GPS Centroid Geofencing**: Client-side Haversine validation ensuring field records fall within 25km of the mandated LGA centroid.
5. **ODK-Style Outbox Synchronization**: Batch synchronization to the Go backend (`POST /api/v1/records/batch`) with partial failure isolation and field officer attribution (`X-User-Id`).

---

## 🔐 Official Evaluator Personas & Sign-In Credentials

The sign-in screen adheres strictly to the **GeoSmart Nigeria • VECTOR SURVEILLANCE & EWS** design specification. Evaluators can authenticate using any of the official personas below with any 4-digit PIN (default: `1234`):

| User ID / Username | Officer Name | State (Locked Jurisdiction) | Primary LGA | Role |
| :--- | :--- | :--- | :--- | :--- |
| `u_field_01` | **Biodun Adeleke** | **Lagos State** | Ikorodu | Field Entomologist |
| `u_field_03` | **Tega Babalola** | **Osun State** | Osogbo | Field Entomologist |
| `u_field_02` | **Aminu Bello** | **Kano State** | Nasarawa | Field Entomologist |
| `u_vecdim_osun` | **Dr. Funke Adeyemi** | **Osun State** | Osogbo | State Coordinator |
| `u_vecdim_lagos`| **Babatunde Ojo** | **Lagos State** | Ikorodu | State Coordinator |
| `u_vecdim_kano` | **Fatima Ibrahim** | **Kano State** | Nasarawa | State Coordinator |
| `u_uniosun_01`  | **Prof. C. Onwubiko**| **National** | National HQ | Consortium Director |

---

## 🚀 Running the Mobile Application Locally

### Prerequisites
- Node.js 20+ or 22+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Development Server
```bash
npx expo start
```

### 3. Run on Target Environment
- **iOS Simulator**: `npx expo run:ios` (or press `i` in the terminal)
- **Web Preview**: `npx expo start --web` (or press `w` in the terminal)
- **Android Emulator**: `npx expo run:android` (or press `a` in the terminal)

### 4. Run TypeScript Verification
```bash
npm run typecheck
```
*(Validates 100% type safety with zero errors across all components, hooks, and schemas)*

---

## 5. AI Tools Disclosure

In accordance with candidate instructions, the use of AI tools during the technical assessment is transparently disclosed below:

- **Tools Used**: Google Antigravity Agentic AI Assistant (powered by Google DeepMind reasoning models).
- **What the Assistant Did Well**:
  - Accelerated initial screen layouts and form input components matching the GeoSmart Nigeria branding.
  - Generated TypeScript interfaces and client validation hooks matching the 8 device-tier validation rules.
- **Where Human Engineering & Corrections Were Required**:
  - **Offline SQLite Architecture**: Replaced basic in-memory React state with a persistent SQLite database with Write-Ahead Logging (WAL) and local server-cache mirroring, ensuring records stay accessible and editable when offline.
  - **Persona & State Jurisdiction Lock**: Redesigned authentication so field officers cannot tamper with state dropdowns; their state and LGA boundaries are locked to their validated user profile.
  - **Two-Phase Bioassay UI**: Built the insectary workflow allowing technicians to resume an existing larval survey offline and complete Day 7 mortality tests.
- **Author Accountability**: I personally reviewed, tested, and understand every line of code submitted, and can walk through any part of the system during the technical interview.

