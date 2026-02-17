# Specification

## Summary
**Goal:** Connect the dashboard to the local `/violations` API and enhance the Live Violations experience with score-based alerts, proof images, challan preview, notifications, and additional pages.

**Planned changes:**
- Update frontend data loading to `fetch('/violations')` and map the Node.js response schema fields (`vehicleNo`, `ownerName`, `mobile`, `violationType`, `timestamp`, `score`, `imageUrl`), including clear error states for network/non-200 failures.
- Modify the Live Violations view to auto-refresh every 3 seconds and render a table with columns: Time, Vehicle No, Violation Type, Score, Proof Image (thumbnail/placeholder), and Status (non-empty badge/value).
- Render proof images using the uploads convention: prefix filename-only values as `http://localhost:3000/uploads/<filename>`, display absolute URLs as-is, and show a “No image” placeholder when missing.
- Add a “Latest Violation” section that highlights the newest violation (by timestamp) with a large proof image and key details (vehicle number, violation type, time, score), with an empty-state when no data exists.
- Implement total score calculation (sum of `score`) and show a red banner when total score ≥ 5 with exact text: “MULTIPLE VIOLATIONS — DATA SENT TO RTO”.
- Add a “Challan Preview” modal accessible from a violation (including from the latest violation card) showing vehicle number, owner name, violation list, total fine, timestamp, and proof image, plus a simulated “Download PDF” action.
- Simulate notification popups on updates: show “Alert sent to owner” when a new violation is detected vs the prior refresh, and show “Report sent to 112” when total score condition (≥ 5) is met.
- Add React Router pages for Vehicle Details and Challan Preview (full-page), and update navigation/links to reach them.

**User-visible outcome:** The dashboard live-loads and auto-refreshes violations from the local backend, shows proof images and a latest-violation highlight, triggers score-based banners and popups, and lets users view challan details via a modal or dedicated page plus navigate to vehicle details.
