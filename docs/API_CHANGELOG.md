# Bridge Watch API Changelog

This document tracks all API changes, versioned updates, breaking changes, and migration notes for integrators.

**Last Updated:** May 29, 2026

---

## Versioning

This API follows semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require client updates
- **MINOR**: New features and additions (backward compatible)
- **PATCH**: Bug fixes and improvements (backward compatible)

---

## Version 1.5.0

**Release Date:** May 29, 2026

### New Features

#### Frozen Asset Controls
- **Endpoint**: `POST /api/assets/{assetCode}/freeze`
- **Purpose**: Prevent updates to unsafe or deprecated assets
- **Request Body**: `{ reason: string }`
- **Response**: `{ asset_code: string, is_frozen: boolean, frozen_at: timestamp }`
- **Authorization**: Admin only

#### Check Asset Freeze Status
- **Endpoint**: `GET /api/assets/{assetCode}/frozen`
- **Purpose**: Query current freeze state of an asset
- **Response**: `{ asset_code: string, is_frozen: boolean, frozen_by: address, frozen_at: timestamp, reason: string }`
- **Authorization**: Public read

#### Unfreeze Assets
- **Endpoint**: `POST /api/assets/{assetCode}/unfreeze`
- **Purpose**: Remove freeze restriction from an asset
- **Response**: `{ asset_code: string, is_frozen: boolean, unfrozen_at: timestamp }`
- **Authorization**: Admin only

#### State Export Functions
- **Endpoint**: `GET /api/export/state`
- **Purpose**: Export contract state snapshot for off-chain sync and auditing
- **Query Parameters**: 
  - `asset_code` (optional): Filter by specific asset
  - `format` (optional): `json` or `compact` (default: `json`)
- **Response**: `{ version: 1, exported_at: timestamp, state_hash: string, items: StateSnapshot[] }`
- **Authorization**: Public read

#### Asset State Snapshot
- **Endpoint**: `GET /api/export/assets/{assetCode}/snapshot`
- **Purpose**: Get detailed state snapshot for a specific asset
- **Response**: Includes all asset metadata, chain links, oracle feeds, bridge associations, pool associations, and freeze state
- **Authorization**: Public read

### Changes

- Added `is_frozen` field to all asset metadata responses
- Added `FrozenAsset` data structure to schema definitions
- Updated asset update operations to validate freeze status

### Backward Compatibility

All new endpoints are additive. Existing endpoints unchanged.

---

## Version 1.4.0

**Release Date:** May 15, 2026

### New Features

#### Whitelist Management
- **Endpoint**: `POST /api/whitelist/add`
- **Purpose**: Add asset code to whitelist
- **Request Body**: `{ asset_code: string }`
- **Authorization**: Admin only

#### Asset Category Filtering
- **Endpoint**: `GET /api/assets/category/{category}`
- **Purpose**: Retrieve all assets in a specific category
- **Categories**: `stablecoin`, `real-world-asset`, `native`, `bridged`, `wrapped`, `other`
- **Response**: `Asset[]`
- **Authorization**: Public read

#### Asset Status Filtering
- **Endpoint**: `GET /api/assets/status/{status}`
- **Purpose**: Retrieve assets by lifecycle status
- **Statuses**: `active`, `paused`, `deprecated`, `pending-review`
- **Authorization**: Public read

### Changes

- Added category indices for faster asset filtering
- Added status indices for lifecycle management

---

## Version 1.3.0

**Release Date:** May 1, 2026

### New Features

#### Compliance Tracking
- **Endpoint**: `POST /api/assets/{assetCode}/compliance`
- **Purpose**: Update compliance status and record audit information
- **Request Body**: 
  ```json
  {
    "status": "compliant|under-review|non-compliant|pending|exempt",
    "jurisdiction": "US|EU|GLOBAL",
    "framework": "SOC2|MiCA|other",
    "last_audit_date": timestamp,
    "next_audit_date": timestamp,
    "notes": "string"
  }
  ```
- **Authorization**: Admin only

#### Compliance Records Query
- **Endpoint**: `GET /api/assets/{assetCode}/compliance`
- **Response**: `ComplianceRecord[]`
- **Authorization**: Public read

---

## Version 1.2.0

**Release Date:** April 15, 2026

### New Features

#### Risk Management
- **Endpoint**: `POST /api/assets/{assetCode}/risk`
- **Purpose**: Update risk classification and score
- **Request Body**: 
  ```json
  {
    "risk_rating": "low|medium|high|critical",
    "risk_score_bps": number (0-10000)
  }
  ```
- **Authorization**: Admin only

#### Multi-Chain Linking
- **Endpoint**: `POST /api/assets/{assetCode}/chains`
- **Purpose**: Link asset to blockchain
- **Request Body**:
  ```json
  {
    "chain_id": "ethereum|stellar|polygon|etc",
    "contract_address": "string",
    "is_canonical": boolean
  }
  ```
- **Authorization**: Admin only

#### Oracle Feed Registration
- **Endpoint**: `POST /api/assets/{assetCode}/oracle-feeds`
- **Purpose**: Register price feed for asset
- **Request Body**:
  ```json
  {
    "feed_id": "string",
    "provider": "Chainlink|Band|other",
    "chain_id": "string",
    "contract_address": "string"
  }
  ```
- **Authorization**: Admin only

---

## Version 1.1.0

**Release Date:** April 1, 2026

### New Features

#### Asset Metadata Versioning
- **Endpoint**: `GET /api/assets/{assetCode}/versions`
- **Purpose**: Retrieve historical metadata snapshots
- **Response**: `MetadataVersion[]` with version history

#### Specific Version Lookup
- **Endpoint**: `GET /api/assets/{assetCode}/versions/{version}`
- **Purpose**: Get metadata at specific version
- **Response**: `MetadataVersion`

### Changes

- All metadata updates now create versioned snapshots
- Added version field to AssetMetadata

---

## Version 1.0.0

**Release Date:** March 15, 2026

### Core Features

#### Asset Registration
- **Endpoint**: `POST /api/assets`
- **Request Body**:
  ```json
  {
    "asset_code": "string",
    "name": "string",
    "symbol": "string",
    "issuer": "string",
    "decimals": number,
    "category": "string",
    "description": "string",
    "url": "string"
  }
  ```

#### Asset Retrieval
- **Endpoint**: `GET /api/assets/{assetCode}`
- **Response**: Complete asset metadata

#### Asset List
- **Endpoint**: `GET /api/assets`
- **Response**: `Asset[]`

#### Metadata Update
- **Endpoint**: `POST /api/assets/{assetCode}/metadata`
- **Authorization**: Admin only

#### Bridge Association
- **Endpoint**: `POST /api/assets/{assetCode}/bridges`
- **Purpose**: Link bridge contract to asset

#### Liquidity Pool Association
- **Endpoint**: `POST /api/assets/{assetCode}/pools`
- **Purpose**: Associate liquidity pool with asset

---

## Breaking Changes

### None in Current Version

All updates from v1.0.0 to v1.5.0 are backward compatible.

---

## Migration Guides

Use [Migration Notes Template](./migration-notes-template.md) for new release entries that require migration context.

### Migrating to v1.5.0 from v1.4.0

**No migration required.** The frozen asset controls are new, optional features.

Optional: If you manage assets that should be frozen, use the new freeze endpoints:
```bash
curl -X POST https://api.bridgewatch.io/api/assets/RISKY/freeze \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason": "Asset deprecated"}'
```

### Migrating to v1.2.0 from v1.1.0

**Breaking Change**: Risk scoring now uses basis points (0-10000) instead of percentages.

**Migration**:
- Old: `risk_score: 50` (50%)
- New: `risk_score_bps: 5000` (50 basis points = 5000 bps)

```bash
# Before
curl -X POST https://api.bridgewatch.io/api/assets/USDC/risk \
  -d '{"risk_rating": "low", "risk_score": 15}'

# After
curl -X POST https://api.bridgewatch.io/api/assets/USDC/risk \
  -d '{"risk_rating": "low", "risk_score_bps": 1500}'
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Asset or resource not found |
| 409 | Conflict | Asset frozen or invalid state transition |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## Rate Limiting

All endpoints are rate limited at:
- **Public endpoints**: 1000 requests/hour per IP
- **Admin endpoints**: 100 requests/hour per token

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests in period
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Authentication

**Admin Endpoints** require authentication via:

1. **Bearer Token**
   ```
   Authorization: Bearer <admin_token>
   ```

2. **Request Signing** (for contract calls)
   ```
   Signature: <signed_request_hash>
   ```

---

## Deprecation Policy

Deprecated endpoints will be supported for **12 months** before removal.

Deprecation notice format:
```
Deprecation-Warning: endpoint=old_endpoint, replacement=new_endpoint, removal_date=2027-05-29
```

---

## Support and Documentation

- **API Documentation**: https://docs.bridgewatch.io/api
- **Status Page**: https://status.bridgewatch.io
- **Support**: https://support.bridgewatch.io
- **Issues**: https://github.com/StellaBridge/Bridge-Watch/issues
