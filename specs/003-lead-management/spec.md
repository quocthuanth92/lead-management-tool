# Feature Specification: Lead Management

**Feature Branch**: `003-lead-management`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Build the lead management feature with the following key requirements: Lead Inbox (leads assigned to the salesperson, newest unread first, basic info, default last 6 months, pagination); Search Leads (name, email, phone, filter by label, restricted to selected date range); Lead Details View (full details + chronological follow-up log, mark as read on view); Lead Labeling (one label per lead); Lead Activity (append-only follow-up notes, newest first); Lead Ingestion (internal API calls or external event messages)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review my lead inbox (Priority: P1)

A salesperson opens the lead inbox and sees every lead assigned to them, with unread leads and the most recent leads at the top. Each row shows basic information (customer name, email, phone, label, read/unread state, last update). By default only leads from the last 6 months are shown, and the list is paginated.

**Why this priority**: The inbox is the entry point of the tool. Without it, salespeople cannot see which website leads need attention, so no other story delivers value.

**Independent Test**: Seed a salesperson with leads of mixed ages and read states, open the inbox, and verify scope, ordering, default date range, and paging.

**Acceptance Scenarios**:

1. **Given** a salesperson has leads assigned and other salespeople have their own leads, **When** they open the inbox, **Then** only leads assigned to them are listed.
2.  ưwoyityh admin rtole a  accaccessưwill be anleable tyoo view alaạajahhall leads b
2. **Given** the salesperson has unread and read leads, **When** the inbox loads, **Then** unread leads appear above read leads, and within each group the newest lead is first.
3. **Given** no date range is chosen, **When** the inbox loads, **Then** only leads from the last 6 months are shown and the active date range is visible to the user.
4. **Given** more leads exist than fit on one page, **When** the user moves between pages, **Then** each page shows the next set of leads with no duplicates or omissions and the total count is visible.
5. **Given** the user changes the date range, **When** the range is applied, **Then** the inbox shows only leads within that range.
6. **Given** the salesperson has no leads in the range, **When** the inbox loads, **Then** a clear empty state is shown.

---

### User Story 2 - Open a lead and read its details (Priority: P1)

A salesperson selects a lead from the inbox and sees the full lead details (customer contact info, source, the customer's message, label, created date) together with a chronological log of all follow-up activities. Opening the lead marks it as read.

**Why this priority**: Reading the lead is the core action that follows the inbox; read tracking is what makes the inbox ordering meaningful.

**Independent Test**: Open an unread lead, verify full details and activity log are shown, then return to the inbox and confirm the lead is now shown as read.

**Acceptance Scenarios**:

1. **Given** an unread lead, **When** the salesperson opens it, **Then** full details and its activity log are displayed and the lead becomes read.
2. **Given** a lead already read, **When** it is opened again, **Then** it stays read and nothing else changes.
3. **Given** a lead with several activities, **When** it is opened, **Then** all activities are listed with who recorded them and when.
4. **Given** a lead that belongs to another salesperson (or does not exist), **When** a salesperson tries to open it, **Then** access is refused and no lead data is revealed.

---

### User Story 3 - Record follow-up activities (Priority: P2)

A salesperson records a follow-up note on a lead (for example "Called customer", "Sent promotion"). Notes can only be added, never edited or deleted, and are displayed newest first.

**Why this priority**: Capturing follow-ups is the main way the tool tracks sales progress, but it depends on being able to open a lead.

**Independent Test**: Add several notes to a lead and verify they appear immediately, newest first, with no way to edit or delete them.

**Acceptance Scenarios**:

1. **Given** an open lead, **When** the salesperson submits a note, **Then** it appears at the top of the activity log with the author and timestamp.
2. **Given** a lead with existing notes, **When** a new note is added, **Then** earlier notes are unchanged and remain in place below it.
3. **Given** a note has been saved, **When** the user looks for a way to change or remove it, **Then** none is offered.
4. **Given** an empty or whitespace-only note, **When** the user submits it, **Then** it is rejected with a clear message and nothing is saved.
5. **Given** a note is added, **When** the user returns to the inbox, **Then** the lead's last-update time reflects the new activity.

---

### User Story 4 - Label a lead (Priority: P2)

A salesperson assigns one label to a lead (for example potential, spam) to classify it. A lead has at most one label at a time; assigning a new label replaces the previous one.

**Why this priority**: Labels let salespeople triage leads and are required for label filtering in search.

**Independent Test**: Assign a label, change it, and verify the lead always shows exactly one label.

**Acceptance Scenarios**:

1. **Given** a lead without a label, **When** the salesperson selects a label, **Then** the lead shows that label.
2. **Given** a lead with a label, **When** another label is chosen, **Then** the new label replaces the old one.
3. **Given** a label value that is not one of the allowed labels, **When** it is submitted, **Then** it is rejected and the existing label is unchanged.


---

### User Story 5 - Search and filter leads (Priority: P2)

A salesperson searches their leads by customer name, email, or phone number and can filter by label. Search and filter results are always limited to the currently selected date range and to the salesperson's own leads.

**Why this priority**: Search makes the inbox usable at volume, but the inbox itself works without it.

**Independent Test**: Seed leads with distinct names, emails, phones, labels and dates, then verify each search term and filter returns exactly the expected leads within the date range.

**Acceptance Scenarios**:

1. **Given** leads exist, **When** the user searches by part of a name, an email, or a phone number, **Then** only matching leads in the selected date range are shown.
2. **Given** a label filter is chosen, **When** results load, **Then** only leads with that label are shown.
3. **Given** both a search term and a label filter, **When** results load, **Then** only leads satisfying both are shown.
4. **Given** a matching lead falls outside the selected date range, **When** the user searches, **Then** that lead is not returned.
5. **Given** a phone number typed with different formatting (spaces, dashes, country code prefix), **When** the user searches, **Then** the matching lead is still found.
6. **Given** no lead matches, **When** the search runs, **Then** a clear "no results" state is shown, and clearing the search restores the inbox.
7. **Given** search results span multiple pages, **When** the user pages through them, **Then** the same ordering rules and pagination as the inbox apply.

---

### User Story 6 - Receive leads from the website and external systems (Priority: P1)

New leads arrive automatically from two sources: direct submissions by an internal trusted system, and event messages published by an external system. Each valid lead is stored, assigned to exactly one salesperson, and appears in that salesperson's inbox as unread. Unauthorized or invalid submissions are rejected without creating a lead.

**Why this priority**: Without ingestion there are no leads to manage.

**Independent Test**: Submit a valid lead through each source and verify it appears unread in the assigned salesperson's inbox; submit invalid and duplicate leads and verify none are created.

**Acceptance Scenarios**:

1. **Given** a trusted internal system submits a valid lead, **When** it is accepted, **Then** the lead is saved as unread, unlabeled, and assigned to a salesperson.
2. **Given** an external event message with a valid lead is published, **When** it is processed, **Then** the lead is saved with the same defaults and appears in the assigned salesperson's inbox.
3. **Given** the same external event message is delivered more than once, **When** it is processed, **Then** only one lead exists.
4. **Given** a submission lacks required information or has malformed contact data, **When** it is received, **Then** it is rejected (internal source) or set aside for review (external source) and no lead is created.
5. **Given** a submission from an internal caller without valid credentials, **When** it is received, **Then** it is refused and no lead is created.
6. **Given** a lead from either source, **When** it is stored, **Then** its source is recorded as internal or external.

---

### Edge Cases

- A lead is opened simultaneously by two sessions: it ends up read once, with no error.
- Two notes are added at nearly the same time: both are stored and ordered by their recorded time.
- Search term contains special characters or is very long: it is treated as plain text, never causing errors or unintended matches; overlong input is rejected with a clear message.
- Date range is invalid (start after end, malformed dates): the user sees a clear validation message and the previous results remain.
- Requested page is beyond the last page: an empty page is returned with the correct total.
- A lead arrives with no email (optional): it is still accepted; searching by email simply won't match it.
- A lead is updated (label or note) while the user is on the inbox: the change is visible on next load or refresh.
- Salesperson session expires while viewing: the user is asked to sign in again and no changes are partially saved.
- Leads from the internal source and the external source have the same phone number as an existing lead: they are treated as separate leads unless identified as the same submission (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Lead Inbox**

- **FR-001**: System MUST show a salesperson only the leads assigned to them.
- **FR-002**: System MUST order the inbox with unread leads first, and within the unread and read groups, most recently updated lead first.
- **FR-003**: Each inbox row MUST display customer name, email, phone, label, read/unread state, and last-update time.
- **FR-004**: System MUST default the inbox date range to the last 6 months and allow the user to change it.
- **FR-005**: System MUST paginate the inbox with a default page size of 20, a maximum page size of 200, and show the total number of matching leads.

**Search and Filter**

- **FR-006**: Users MUST be able to search leads by customer name, email, or phone number (partial, case-insensitive matching).
- **FR-007**: Users MUST be able to filter leads by label, alone or combined with a search term.
- **FR-008**: Search and filter results MUST be restricted to the currently selected date range and to the salesperson's own leads.
- **FR-009**: Search results MUST follow the same ordering and pagination rules as the inbox.
- **FR-010**: Phone number search MUST ignore formatting differences (spaces, dashes, parentheses, leading plus sign).

**Lead Details**

- **FR-011**: Users MUST be able to open a lead and see all of its details: customer name, email, phone, source, customer message, label, created date, read state, and last-update time.
- **FR-012**: The lead details MUST include a chronological log of all follow-up activities for that lead.
- **FR-013**: Opening a lead's details MUST mark the lead as read; this MUST NOT change the lead's last-update time.
- **FR-014**: System MUST refuse access to a lead that is not assigned to the requesting salesperson, without revealing whether it exists.

**Lead Labeling**

- **FR-015**: Users MUST be able to assign exactly one label to a lead; assigning a new label replaces the previous one.
- **FR-016**: System MUST support at least these labels: unlabeled (default), potential, spam; and MUST reject values outside the allowed set.
- **FR-017**: Changing a label MUST update the lead's last-update time.

**Lead Activity**

- **FR-018**: Users MUST be able to add a follow-up activity note to a lead, recording the note text, the author, and the time.
- **FR-019**: Activity notes MUST be append-only: the system MUST NOT allow editing or deleting a note.
- **FR-020**: Activity notes MUST be displayed newest first.
- **FR-021**: System MUST reject empty or whitespace-only notes and notes above a maximum length of 2,000 characters.
- **FR-022**: Adding an activity MUST update the lead's last-update time.
- **FR-023**: Each activity MAY be categorized by type (call, email, SMS, note, other); when not specified, it is recorded as a general note.

**Lead Ingestion**

- **FR-024**: System MUST accept new leads submitted directly by a trusted internal system, and MUST require valid credentials for such submissions.
- **FR-025**: System MUST accept new leads delivered as external event messages.
- **FR-026**: Every ingested lead MUST include customer name, phone number, and message; email is optional. Leads missing required data or with malformed phone or email MUST NOT be created.
- **FR-027**: Every new lead MUST be stored as unread and unlabeled, with its source (internal or external) and creation time recorded.
- **FR-028**: Every new lead MUST be assigned to exactly one salesperson.
- **FR-029**: Processing the same external event message more than once MUST NOT create duplicate leads.
- **FR-030**: External event messages that cannot be processed MUST be retried and, if still failing, set aside for later review rather than silently dropped.

**Access and Data Protection**

- **FR-031**: All lead management actions (view, search, label, add note) MUST require an authenticated salesperson.
- **FR-032**: System MUST validate all user input and show clear, consistent error messages for invalid input.
- **FR-033**: Customer contact details MUST NOT appear in operational logs.

### Key Entities

- **Lead**: A sales enquiry from a prospective customer. Attributes: customer name, phone, email (optional), source (internal/external), customer message, label (one at a time), read state, created time, last-update time, assigned salesperson.
- **Lead Activity**: An immutable follow-up note on a lead. Attributes: lead, author (salesperson), type, content, created time.
- **Label**: A classification for a lead from a fixed set (unlabeled, potential, spam, …). Exactly one per lead.
- **Lead Source Message**: The incoming submission (internal call or external event) from which a lead is created; carries the data needed to identify duplicates.
- **Label**: A classification for a lead from a fixed set (unlabeled, potential, spam, …). Exactly one per lead.
## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A salesperson can open the inbox and see their newest unread leads in under 2 seconds for 95% of loads, with up to tens of thousands of leads in the system.
- **SC-002**: Search and filter results appear in under 2 seconds for 95% of searches.1
- **SC-003**: A salesperson can find a specific lead by 1ame, email, or phone and open it in under 30 seconds.
- **SC-004**: A salesperson can add a follow-up note in under 20 seconds from opening a lead.
- **SC-005**: 100% of leads opened by a salesperson are shown as read in the inbox on the next view.
- **SC-006**: 100% of valid leads from either source appear in the assigned salesperson's inbox within 1 minute of submission.
- **SC-007**: 0 duplicate leads result from redelivered external event messages.
- **SC-008**: 0 leads are visible to a salesperson other than the one assigned (verified by access tests); 0 recorded activity notes can be modified or removed.
- **SC-009**: At least 90% of salespeople complete the core flow (find a lead, read it, label it, add a note) on the first attempt without help.

## Assumptions

- Salespeople already have accounts and can sign in; sign-in and user management are provided separately and out of scope here. An administrator role that can see all leads is out of scope for this feature.
- If no salesperson is available at ingestion time, the lead is held and assigned as soon as one becomes available rather than being rejected.
- The date range applies to a lead's last-update time, so a lead worked recently stays visible even if it arrived more than 6 months ago.
- Customer information lives within the lead; there is no separate customer record or customer management in this feature.
- Duplicate detection applies to repeated delivery of the same external message; separate enquiries from the same customer are kept as separate leads.
- The initial label set is unlabeled, potential, and spam; additional labels can be added later without changing the behavior described here.
- Trusted internal callers authenticate with a shared credential issued by the dealership's IT; end customers never call lead ingestion directly.
- The web interface targets desktop and tablet browsers; native mobile apps, advanced reporting, and third-party CRM integration are out of scope.
- Dates and times are displayed in the salesperson's local time zone and stored in a single standard time reference.
- Leads and activities are retained indefinitely for this release; data retention policies are out of scope.
