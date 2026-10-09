# UI Layout: Lead Management (lead-web)

Client-rendered screens (React Query) behind the BFF. Primitives: shadcn/base-ui + Tailwind. Target:
desktop and tablet; the layout still stacks cleanly below 768 px. Conventions: unread = bold text + accent
dot; label = colored badge (UNLABELED neutral, POTENTIAL green, SPAM red); times are shown in the user's
local zone with the absolute time in a tooltip/`title`.

## Routes

| Route          | Purpose                                | Stories        |
| -------------- | -------------------------------------- | -------------- |
| `/login`       | Sign in                                | enabling       |
| `/leads`       | Inbox + search + filters + pagination  | US1, US5       |
| `/leads/[id]`  | Details, label, activity composer/log  | US2, US3, US4  |

Unauthenticated visits redirect to `/login`; `/` redirects to `/leads`.

## App shell (all authenticated pages)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Lead Management                                   Ava Nguyen  [Sign out] │
├──────────────────────────────────────────────────────────────────────────┤
│  (page content, max width 1200 px, centered)                             │
└──────────────────────────────────────────────────────────────────────────┘
```

## `/leads` Inbox

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Lead Management Inbox                                                                          │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search name, email or phone… ] [Label: All ▾ ] [Date: Last 6 months ▾]                    │
├────────────────────────────────────────────────────────┐───────────────────────────────────────┤
│ ●  **Tran Van An**                           POTENTIAL │                                       │
│ Phone: +84912223344 - Email: tranvanan@gmail.com       │                                       │
│ ** liên hệ lại tôi **                           3m ago │                                       │
│ ──── ──── ──── ─── ──── ──── ───── ──── ──── ──── ───  │  
│ ●  **Tran Van An**                           POTENTIAL │          Click lead to view detail    │
│ Phone: +84912223344 - Email: tranvanan@gmail.com       │
│ ** liên hệ lại tôi **                           3m ago │                                       │
│ ──── ──── ──── ─── ──── ──── ───── ──── ──── ──── ───  │                                      
│ ●  **Tran Van An**                           POTENTIAL │                                       │
│ Phone: +84912223344 - Email: tranvanan@gmail.com       │                                       │
│ ** liên hệ lại tôi **                           3m ago │  
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1–0 of 248      Rows [20 ▾]        [‹ Prev] 1 2 3 … 13 [Next ›]                        │
├────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Element            | Behavior                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Rows               | Whole row is a link to `/leads/[id]`; keyboard focusable; unread rows bold with a dot (with `sr-only` "Unread")  |
| Search box         | 300 ms debounce; fires when 2–100 chars; shows inline hint below 2 chars; "x" clears it; special chars are plain |
| Label filter       | Select: All, UNLABELED, POTENTIAL, SPAM; combines with search; All uses the inbox endpoint                       |
| Date range         | Two native date inputs defaulted to the last 6 months and shown (FR-004); "Last 6 months" button resets; invalid range (from > to) shows an inline error and keeps previous results |
| Search scope hint  | When a search/filter is active a chip row shows "Within 2026-04-09 – 2026-10-09" so users know scope             |
| Pagination         | Page and rows-per-page (20, 50, 100, 200) in the URL; resets to page 1 when any filter changes; total shown      |
| State in URL       | `?q=&label=&from=&to=&page=&limit=`; returning from a lead restores the exact list                               |
| Loading            | Skeleton rows (keeps previous data dimmed during refetch to avoid layout jump)                                   |
| Empty              | Inbox: "No leads in this period. Try a wider date range."; Search: "No leads match. [Clear search]"              |
| Error              | Inline alert with message from the error contract and a Retry button                                             |
| Freshness          | Refetch on window focus; after returning from details the inbox query is invalidated so the lead shows as read   |

## `/leads` Lead details

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Lead Management Inbox                                                                          │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search name, email or phone… ] [Label: All ▾ ] [Date: Last 6 months ▾]                    │
├────────────────────────────────────────────────────────┐───────────────────────────────────────┤
│ ●  **Tran Van An**                         [POTENTIAL] │ Tran Van An                [Action ▾] │
│ Phone: +84912223344 - Email: tranvanan@gmail.com       │ ─── ──── ──── ─────                   │
│ ** liên hệ lại tôi **                           3m ago │ Phone   +84 90 123 4567               │
│ ──── ──── ──── ─── ──── ──── ───── ──── ──── ──── ───  │ Email   an@mail.com 
│ ●  **Tran Van An**                           POTENTIAL │ Message                               │
│ Phone: +84912223344 - Email: tranvanan@gmail.com       │  "I'd like a test drive of the …"
│ ** liên hệ lại tôi **                           3m ago │                                       │
│ ──── ──── ──── ─── ──── ──── ───── ──── ──── ──── ───  │ ─── ──── ──── ─────               
│ ●  **Tran Van An**                           POTENTIAL │ Activity (3)                          │
│ Phone: +84912223344 - Email: tranvanan@gmail.com       │ ☎ Called customer                    │
│ ** liên hệ lại tôi **                           3m ago │   Ava Nguyen · 2 h ago
│                                                        │ ▢ First contact attempt               │
│                                                        │    Ava Nguyen · 2 d ago               │
│                                                        │       [Load more]
│                                                        │├                                                        │────────────────────────────────────────────────────────────────────────────────────────────────┤

│ Showing 1–0 of 248      Rows [20 ▾]        [‹ Prev] 1 2 3 … 13 [Next ›]                        │
├────────────────────────────────────────────────────────────────────────────────────────────────┘
```




| Element            | Behavior                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Opening            | Fetching details marks the lead read (server side); no extra UI action; the inbox is invalidated                           |
| Source             | "Website API" for INTERNAL, "External event" for EXTERNAL                                                                  |
| Label select       | Saves immediately with optimistic update and rollback + toast on failure; disabled while saving; never allows multiple    |
| Composer           | Type defaults to Note; Add disabled when empty/whitespace; counter turns red at > 2000; Enter inserts newline, Ctrl+Enter submits; on success clears, new entry appears at the top without reload; failure keeps the text and shows an error |
| Timeline           | Newest first; icon per type; author + relative time (absolute on hover); **no edit/delete controls**; "Load more" pages older entries (first 50 come with the lead) |
| Layout             | Two columns ≥ 1024 px; stacked (details, composer, timeline) below                                                          |
| Loading            | Skeleton cards                                                                                                             |
| 404                | "Lead not found" empty state with Back to inbox (same view for foreign leads)                                              |
| Error              | Inline alert + Retry                                                                                                       |

## `/login`

Centered card: email, password, "Sign in" button; inline error "Invalid email or password" (generic);
disabled while submitting; on success redirect to `/leads` (or the originally requested path).

## Components and hooks (`apps/lead-web/src`)

| Piece                                                          | Kind   | Notes                                                               |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `InboxToolbar`, `DateRangeFilter`, `LabelFilter`               | client | controlled by URL state hook `useInboxParams`                        |
| `LeadTable`, `LeadRow`, `LabelBadge`, `Pagination`             | client | presentational; no data fetching                                     |
| `LeadDetailsCard`, `LabelSelect`                               | client |                                                                      |
| `ActivityComposer`, `ActivityTimeline`                         | client |                                                                      |
| `useLeads`, `useLeadDetails`, `useLeadActivities`              | hooks  | React Query; keys in `lib/query/keys.ts`                             |
| `useSetLabel`, `useAddActivity`                                | hooks  | mutations; update/invalidate list + details queries                  |
| Server `page.tsx`/`layout.tsx`                                 | server | only mount client components; no business logic                      |

## Accessibility and quality

- All controls labeled; row links have discernible names; focus ring visible; color is never the only signal
  (badge text, "Unread" sr-only text).
- Toasts announced politely (`aria-live`); form errors tied with `aria-describedby`.
- No token or API key in client bundles; only `/api/*` BFF routes are called.
