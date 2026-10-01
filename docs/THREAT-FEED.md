# Threat feed

The public threat feed exposes approved scam identifiers in a machine-readable format. It is intended for downstream consumers such as telcos, banks, or other public-interest monitors that need a structured feed without exposing unreviewed accusations.

## Endpoint

```bash
curl "https://checkam.cm/api/public/threat-feed?format=json"
curl "https://checkam.cm/api/public/threat-feed?format=csv" -o threats.csv
```

## Important behavior

- The feed is rate-limited and cacheable.
- It only returns identifiers with `isActive: true`.
- Records are included only after a moderator approves the linked report.
- Consumer code should treat the feed as a downstream trust signal, not as a source of raw report data.

## JSON shape

```json
{
  "feedVersion": "1.0",
  "publisher": "CheckAm Cameroon Threat Intelligence",
  "totalActiveThreats": 12,
  "generatedAt": "2026-09-24T03:45:01.885Z",
  "anticHotline": "8202",
  "threats": [
    {
      "id": "...",
      "identifierType": "PHONE",
      "normalizedValue": "+237699123456",
      "riskLevel": "HIGH_RISK",
      "category": "CIVIL_SERVICE",
      "notes": "...",
      "relatedCase": {
        "slug": "...",
        "title": "...",
        "targetEntity": "MINESEC",
        "amountRequested": "25 000 FCFA"
      },
      "firstDetectedAt": "..."
    }
  ]
}
```

## Sync guidance

- Poll on a regular cadence, such as every 5 to 15 minutes.
- Use `since` to request only newer rows.
- Upsert by normalized value.
- Treat high-risk phone and MoMo entries as priority events for blocking or step-up verification flows.

## Safety

The feed is meant to be useful and public, but it should never become a replacement for moderation. Only approved records should appear.

This document is part of the public source repository and is intended for contributors, operators, and downstream integrators.
