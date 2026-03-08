# Smart Vehicle Black Box & Violation Management System

## Current State

A React + TypeScript frontend with:
- `PortalLayout` with India tricolor strip, dark blue government header with SAFEWAY logo, nav, and footer
- `PortalNav` with 4 nav items: Dashboard, Live Violations, Vehicle Details, Challan Preview
- `DashboardPage` with 4 stat cards (no auto-refresh), navigation cards grid, and system info panel
- `LiveViolationsPage` with 3-second auto-poll of `GET /log`, latest violation card, violations table (8 columns), popup notifications, score-based banner, Download/Pay buttons
- `ChallanPreviewModal` for challan detail popup with PDF download
- `ChallanPreviewPage` standalone challan page
- `VehicleDetailsPage` and `ChallanManagementPage` exist as separate pages
- `PopupNotifications` with slide-in toast alerts (top-right)
- `LatestViolationCard` shows most recent violation with image
- Tailwind config with `gov-blue` custom color tokens; Plus Jakarta Sans font

## Requested Changes (Diff)

### Add
- Full professional redesign of all UI to look like an official government traffic monitoring control system
- Score status logic: Score 1 → Green badge, Score 3 → Orange badge, Score 5 → Red badge (previously was score-based ranges, not exact score values per spec)
- Alert sound when new violation popup appears (using Web Audio API beep)
- Dashboard stat cards: must have larger numbers, icons, colored left-border indicator, shadow, rounded corners, and update every 3 seconds (add interval on DashboardPage)
- `DashboardPage` auto-refresh every 3 seconds to keep stat cards live
- Multiple violation warning banner on DashboardPage too (total score ≥ 5)
- Enhanced visual hierarchy: stronger typography, more spacious layout, section headers with icons
- Challan download button in table: open `/challans/<filename>` from backend; fallback to challan modal
- PortalLayout header: increase visual weight, add India gov emblem area, stronger SAFEWAY logo placement with surrounding frame/badge
- Popup alert redesign: show "Traffic Violation Detected" as header with Vehicle Number, Violation Type, Time details
- Mobile responsive improvements throughout

### Modify
- `PortalLayout`: increase header height and visual authority; add India gov branding strip/seal area
- `PortalNav`: add icons to nav items for better visual identification
- `DashboardPage`: add 3-second interval refresh; improve card design with larger numbers and colored indicators; add multiple violations banner
- `LiveViolationsPage`: update status badge logic (score 1=green, 3=orange, 5=red); improve table row styling; improve alert banner prominence
- `PopupNotifications`: show Vehicle Number, Violation Type, Time in the popup body; play beep sound on new alert notifications
- `LatestViolationCard`: improve visual design with stronger government aesthetic
- `ChallanPreviewModal`: add challan file download link to `/challans/<filename>` when available

### Remove
- Nothing to remove structurally; only visual/behavioral improvements

## Implementation Plan

1. **Update `PortalLayout.tsx`**: Taller header with more visual authority, stronger India gov context, improved nav with icons
2. **Update `PortalNav.tsx`**: Add Lucide icons to each nav item
3. **Update `DashboardPage.tsx`**: Add 3-second auto-refresh via `useInterval`; bigger stat cards with rounded corners, shadow, large number display; multiple violations banner; improved section visual hierarchy
4. **Update `LiveViolationsPage.tsx`**: Fix status badge to score 1=green, 3=orange, 5=red; improve table styling; improve banner
5. **Update `PopupNotifications.tsx`**: Redesign popup to show Vehicle/Type/Time details; add Web Audio beep on alert type notifications
6. **Update `LatestViolationCard.tsx`**: Stronger government-style card with better visual hierarchy
7. **Update `ChallanPreviewModal.tsx`**: Add challan file download link support
8. **Update `tailwind.config.js`**: Add `rounded-xl` usage; ensure `gov-blue` colors are well-defined
9. Validate and fix any TypeScript/lint errors
