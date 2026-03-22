# Smart Vehicle Black Box & Violation Management System

## Current State
Existing dashboard built with React + TypeScript. Has camera panel, violation table, emergency events, challan system, popup alerts, and sound notifications. Uses /api/violations polling, /api/score, /api/stats, /api/events endpoints.

## Requested Changes (Diff)

### Add
- POST /api/reset call on page load to start fresh session
- Cache-busting timestamp on every /api/violations fetch
- Pause/resume camera stream logic: pause on violation detected, resume after 1.5s
- Auto-resume camera stream on tab focus (visibilitychange event)
- Separate violation display by category: "VIOLATION" in main table, "EVENT" in Emergency Events section
- beep.mp3 sound on violation, siren.mp3 on accident/collision
- Image display using BASE_URL + record.image field

### Modify
- Popup: trigger ONLY ONCE when total score >= 5, using localStorage to prevent re-trigger; include vehicle number, alert message, View Challan / Pay Now / Close buttons; fix Close button
- Camera label: use ONLY "Inside Camera" (remove any outside camera references)
- Violation table: filter to category = "VIOLATION" only
- Emergency Events section: filter to category = "EVENT" only
- Fetch interval: every 2 seconds with ?t=timestamp cache-busting param

### Remove
- Any remaining outside/road camera references or labels
- Old score/category filtering logic that doesn't match new category field

## Implementation Plan
1. Update api.ts: add resetSession(), update fetchViolations() with timestamp cache-bust, normalize category field
2. Update DashboardPage: call resetSession on mount, filter violations by category, wire camera pause/resume on violation + tab focus
3. Update CameraCard: label shows only "Inside Camera", expose pause/resume ref methods
4. Update sound system: use beep.mp3 for VIOLATION category, siren.mp3 for EVENT/accident category
5. Update popup: score >= 5 trigger once via localStorage key, fix Close handler, ensure all 3 buttons work
6. Update EmergencyEvents: filter by category = "EVENT" strictly
7. Image rendering: always use BASE_URL + record.image
