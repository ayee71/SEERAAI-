### Implementation Plan: Courtroom Video Conference Kiosk & Control Dashboard

This feature provides an automated, managed video conference integration for courtrooms, featuring a Kiosk mode for seamless auto-joining and a Control Dashboard for court officials.

### User Review & Critical Decisions

- **Hardware**: Dedicated PC browser (Kiosk environment).
- **Session Behavior**: Automated "Auto-Join" on session activation.
- **Control**: Hybrid control via session status updates and manual triggers from the Clerk/Judge dashboard.

---

### 1. Overview & Core Concept

- **What It Does**: Synchronizes session state in Firestore with a dedicated Kiosk display to ensure court video conferences start automatically without manual intervention.
- **Target Audience**: Courtroom clerks, judges, and remote participants.
- **Key Value**: Reduces manual setup time, ensures timely meeting starts, and provides centralized control for court officials.

### 2. User Experience & Visual Design

- **Kiosk View (Automated)**:
    - **Zero-State**: "Waiting for session..." screen.
    - **Active-State**: Automatically opens the provided VK link in the browser.
- **Control Dashboard (Clerk/Judge)**:
    - **Status Controls**: Toggle buttons (Active / Inactive) for sessions.
    - **Input**: Fields for entering the VK meeting link.
    - **Participant Monitor**: Simple list of active participants (or placeholder).
- **Visual Identity**: Utilitarian, high-contrast (Dark mode) for courtroom visibility.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Firestore for State Management**
    - **Chosen Approach**: Firestore `courtroom_sessions` collection with real-time listeners.
    - **Why**: Low-latency sync across devices, enabling real-time automation.
- **Decision 2: Kiosk/Browser Constraints**
    - **Chosen Approach**: Client-side `window.open` (if enabled in Kiosk browser settings) or programmatic navigation to external links.
    - **Why**: Simplest path for browser-based automation without complex native integration.

### 4. Technical Architecture & Data Strategy

```text
┌───────────────────────┐       ┌───────────────────────────┐
│ Control Dashboard     │──────>│ Firestore (sessions)      │
│ (Clerk/Judge)         │       └─────────────┬─────────────┘
└───────────────────────┘                     │
                                              │ Real-time Listener
┌───────────────────────┐                     │
│ Kiosk Display (Client)│<────────────────────┘
└───────────────────────┘
```

- **Firestore Schema**:
    - `courtroom_sessions/{sessionId}`
        - `status`: 'active' | 'inactive'
        - `vkLink`: string (URL)
        - `autoJoin`: boolean
        - `lastUpdated`: timestamp
- **State Management**: React `useFirestoreSnapshot` hook to monitor session changes in real-time.
- **Security**: Hardened Firestore rules ensuring only authenticated court staff can toggle `status` or update `vkLink`.
