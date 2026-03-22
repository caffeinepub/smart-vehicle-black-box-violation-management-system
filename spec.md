# Smart Vehicle Black Box & Violation Management System

## Current State
Production dashboard with React frontend, auto-polling backend, camera stream, violation table, challan system, emergency events section, popup alerts, and sound notifications.

## Requested Changes (Diff)

### Add
- Auto-refresh interval (3s) to LiveViolationsPage (was manual-only)
- Emergency popup trigger from `/api/emergency` endpoint in loadEmergencies

### Modify
- CameraCard: switched from `<img>` to `<iframe>` for ESP stream; status now shows ONLINE (on iframe load) / OFFLINE (on error/timeout)
- Polling interval: changed from 4000ms to 3000ms for both violations and emergency fetches
- CenterAlertPopup: emergency alert title changed to "🚨 Emergency Detected – Authorities Notified" for both accident and collision types
- sounds.ts: references local `/beep.mp3` and `/siren.mp3` first, CDN as fallback
- LiveViolationsPage: removed manual Refresh Data button; auto-refresh via useInterval every 3s
- Image URLs: consistently using `BASE + record.image` (v.path || v.image) throughout

### Remove
- Manual "Refresh Data" button from LiveViolationsPage
- Old ACTIVE/STANDBY camera status labels (replaced with ONLINE/OFFLINE)

## Implementation Plan
1. Update CameraCard to iframe-based streaming with ONLINE/OFFLINE status
2. Change polling from 4s to 3s everywhere
3. Update emergency popup message in CenterAlertPopup
4. Update sounds.ts to use local beep.mp3/siren.mp3 with CDN fallback
5. Add per-event popup tracking in loadEmergencies
6. Remove manual refresh from LiveViolationsPage, add useInterval
