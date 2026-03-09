# SAFEWAY Vehicle Blackbox Dashboard

## Current State
A React+TypeScript dashboard with pages: Dashboard, Live Violations, Vehicle Details, Challan Preview, Challan Management, Alerts, Analytics. Fetches from `https://vehicle-blackbox-system-1.onrender.com/log` every 3 seconds. Has violation table, stat cards, popup notifications, challan modal, payment modal.

## Requested Changes (Diff)

### Add
- Real-time fetch every 2 seconds (change from 3s)
- Browser Notification API (not DOM alert) for score >= 5 within last 12 hours
- Score mapping: Seatbelt=1, Door Open=1, Harsh Braking=3, Alcohol Low=3, Alcohol High=5, Drowsy Driving=5, Harsh Driving=5
- Vehicle Monitoring section with two camera streams (INSIDE CAMERA: http://ESP_INSIDE_IP:81/stream, FRONT CAMERA: http://ESP_FRONT_IP:81/stream) side-by-side with error fallback "Camera unavailable."
- Emergency Events section showing only Accident and Collision events as cards with: Vehicle Number, Event Type, Date/Time, Location (clickable link to Google Maps)
- Driver Risk Level card: score < 3 = LOW (green), 3-4 = MEDIUM (orange), >= 5 = HIGH (red)
- System Status card: ESP Connection: ACTIVE, Vehicle Status: ONLINE, Last Event Time (auto-updates)
- Owner Name column added to violation table

### Modify
- Violation table columns: Vehicle Number, Owner Name, Violation Type, Score, Fine Amount, Date and Time, Violation Image
- Fetch interval: 2 seconds instead of 3
- Multiple violation notification: use browser Notification API, calculate 12-hour window
- Dashboard layout order: Vehicle Monitoring → Driver Risk Level → Violation Table → Emergency Events

### Remove
- Dashboard alert box/banner for multiple violations (replaced by browser notification only)

## Implementation Plan
1. Update `api.ts` to change interval note
2. Update `DashboardPage.tsx`:
   - Change fetch to 2s
   - Add browser Notification API permission request + trigger
   - Add 12-hour window scoring logic with score mapping
   - Add Vehicle Monitoring section (2 camera streams, error fallback)
   - Add Emergency Events section (filter accident/collision, location link)
   - Add Driver Risk Level card
   - Add System Status card
   - Add Owner Name to violation table
   - Reorder sections: Vehicle Monitoring → Driver Risk Level → Violation Table → Emergency Events
   - Remove dashboard score alert banner (browser notification only)
