# Moderation - Admin Workflow & Safety Rules

`/admin` + `/api/admin/reports` are gated by `requireModerator()` (`src/lib/auth.ts`):
Better-Auth session with `role` = `ADMIN` or `MODERATOR`. Local dev may set
`CHECKAM_ADMIN_BYPASS="true"` (blocked automatically when `NODE_ENV=production`).

## Queue

- `GET /api/admin/reports?status=PENDING|APPROVED|REJECTED|ALL` → reports + stats
  (`pendingCount`, `approvedCount`, `flaggedNumbersCount`, `verificationsTotal`).
- Dashboard shows metric cards, status tabs, per-report evidence (phones, emails, amounts,
  submitter), link to the public dossier, and one-click actions.

## Actions

| Action | Effect |
| ------ | ------ |
| **APPROVE** | `status=APPROVED`, `publishedAt=now`, linked `flagged_identifiers` → `isActive: true`. If none exist, phone/email identifiers are auto-created from the report. Fires `threat-feed/sync.requested`. |
| **REJECT** | `status=REJECTED`, linked identifiers → `isActive: false` (delisted from feed + directory). Reversible via re-APPROVE. |

Moderator identity is recorded (`moderatedById`, `moderatorNotes`).

## Safety rules (do not bypass)

1. **Never publish without review.** Public `GET /api/reports` and `/directory` serve
   `APPROVED` rows only - this protects innocent people from false accusations.
2. **Verify before approving**: call back official numbers (`.gov.cm` sites, ANTIC 8202),
   never the suspect number in the report.
3. **Seeded roles**: `admin@checkam.cm` is ADMIN. Promote trusted reviewers to MODERATOR;
   keep ADMIN to 1–2 people.
4. **Abuse**: report submissions are rate-limited (5/hour/IP) and IP-hashed; WhatsApp
   events are deduplicated by `messageId`.
