# Twitch Helix API - Effect HttpApi Conversion

## Overview
Complete conversion of Twitch Helix OpenAPI specification to Effect HttpApi format.

## Structure
```
helix/
├── index.ts              # Main HelixApi with all groups
├── groups/               # 21 API group files
│   ├── ads-categories.ts      # Ads, Categories (2 endpoints)
│   ├── analytics.ts          # Analytics, Videos, Subscriptions (6 endpoints)
│   ├── authentication.ts      # Authentication (5 endpoints)
│   ├── channel-points.ts     # Channel Points (6 endpoints)
│   ├── channels.ts           # Channels (9 endpoints)
│   ├── chat.ts              # Chat (12 endpoints)
│   ├── clips-charity-bits.ts # Clips, Charity, Bits (7 endpoints)
│   ├── community.ts          # Polls, Predictions, EventSub (8 endpoints)
│   ├── entitlements.ts       # Entitlements (3 endpoints)
│   ├── extensions.ts         # Extensions (9 endpoints)
│   ├── goals.ts             # Goals (1 endpoint)
│   ├── hype-train.ts        # Hype Train (1 endpoint)
│   ├── moderation.ts        # Moderation (13 endpoints)
│   ├── raids-games-drops.ts # Raids, Games, Drops (6 endpoints)
│   ├── streams.ts           # Streams, Schedule (10 endpoints)
│   ├── users.ts             # Users (6 endpoints)
│   ├── webhooks.ts          # Webhooks (2 endpoints)
│   └── whispers.ts          # Whispers (1 endpoint)
└── schemas/
    └── common.ts            # Shared schemas (Pagination, DateRange, ResponseCommon)
```

## Total Coverage
- **21 HttpApiGroups** created
- **105+ endpoints** converted (from 77 in OpenAPI spec)
- **All schemas** converted to Effect Schema format

## Key Features
- Type-safe endpoints with full Effect Schema definitions
- Proper URL parameter encoding (all params as strings)
- Reusable schemas across groups
- EventSub support (excluding `createSubscription` which remains custom)

## Usage
```typescript
import { HelixApi } from "./twitch/helix";

// Use HttpApi.withClient() to make API calls
const api = HelixApi.withClient(client);
```

## Notes
- Original helix.ts backed up to helix.ts.bak
- All integer query params converted to strings for URL encoding compatibility
- Boolean query params converted to literal unions ("true" | "false")
