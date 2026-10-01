# Moderation workflow

The moderation flow lives behind the admin gate in `src/lib/auth.ts`. Access is limited to users with the `ADMIN` or `MODERATOR` role, unless local development explicitly enables `CHECKAM_ADMIN_BYPASS`.

## Admin queue

`GET /api/admin/reports?status=PENDING|APPROVED|REJECTED|ALL` returns a list of reports and aggregate stats.

The dashboard should expose:

- pending, approved, and rejected counts
- evidence summary for each report
- file or text context used in the submission
- links to the related public dossier when available
- quick approve or reject actions

## Review actions

| Action | Result |
| --- | --- |
| APPROVE | Marks the report as approved, sets publication time, and activates any linked flagged identifiers. New phone or email identifiers are created when needed. |
| REJECT | Marks the report as rejected and deactivates linked identifiers. |

The moderation record keeps the reviewer identity and notes so every action is traceable.

## Safety rules

1. Never publish without review. Public report and directory endpoints should only return approved entries.
2. Check reporting claims against official sources before approving them.
3. Keep admin access narrow. The seeded admin account is a privileged operational account; elevate trusted reviewers carefully.
4. Rate-limit report submissions and deduplicate incoming WhatsApp events by message id.
5. Keep all moderation decisions in the audit trail and do not silently bypass the queue.

## Operational reminder

The moderation system exists to protect the public from false accusations while still making real scam reports actionable. It is a safety layer, not a shortcut around normal verification.
