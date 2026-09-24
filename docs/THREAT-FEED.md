# Public Threat Feed — Telco / Bank Integration

`GET /api/public/threat-feed` — structured feed of newly flagged numbers and accounts.
Rate-limited (Arcjet), cacheable (`s-maxage=300, stale-while-revalidate=600`), max 500 rows.

## Usage

```bash
# JSON (default)
curl "https://checkam.cm/api/public/threat-feed?format=json"

# CSV for bulk ingest
curl "https://checkam.cm/api/public/threat-feed?format=csv" -o threats.csv

# Filter + incremental sync
curl "https://checkam.cm/api/public/threat-feed?format=json&category=MOBILE_MONEY&since=2025-01-01T00:00:00Z"
```

`category` accepts `CIVIL_SERVICE | VISA_TRAVEL | MOBILE_MONEY | INVESTMENT_PONZI | ECOMMERCE | OTHER`.

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
      "id": "…",
      "identifierType": "PHONE | EMAIL | DOMAIN | MOMO_ACCOUNT | BANK_ACCOUNT",
      "normalizedValue": "+237699123456",
      "riskLevel": "HIGH_RISK",
      "category": "CIVIL_SERVICE",
      "notes": "…",
      "relatedCase": { "slug": "…", "title": "…", "targetEntity": "MINESEC", "amountRequested": "25 000 FCFA" },
      "firstDetectedAt": "…"
    }
  ]
}
```

Phones are E.164 (`+237…`), emails lowercase. Only `isActive: true` rows appear —
identifiers activate **only** when a moderator approves the linked report, so polling this
feed never picks up unreviewed public accusations.

## Suggested sync

Poll every 5–15 min with `since=<last-generatedAt>`, upsert on `normalizedValue`,
treat `HIGH_RISK` PHONE/MOMO_ACCOUNT as block-or-step-up-authentication.
