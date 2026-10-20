# Graph Report - cloudtak-plugin-locator  (2026-10-20)

## Corpus Check
- 48 files · ~15,977 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 469 nodes · 837 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cec8c665`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PingForm.vue
- locator-history-map-sync.ts
- SmsLocatorTab.vue
- index.ts
- vue
- SettingsPanel.vue
- package.json
- compilerOptions
- LocatorPane.vue
- CloudTAK Locator Plugin
- coordinates.ts
- check-like-docker.sh
- LocatorCreateCard.vue

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `vue` - 18 edges
3. `submit()` - 12 edges
4. `LocatorHistoryMapSync` - 12 edges
5. `openPopout()` - 12 edges
6. `@tak-ps/vue-tabler` - 12 edges
7. `paths` - 11 edges
8. `Locator` - 10 edges
9. `useLocatorStore` - 10 edges
10. `Overlay` - 10 edges

## Surprising Connections (you probably didn't know these)
- `useLocatorStore` --indirect_call--> `loadSharedPortal()`  [INFERRED]
  stores/plugin-state.ts → lib/portal-source.ts
- `refresh()` --calls--> `listLocators()`  [EXTRACTED]
  components/SmsLocatorTab.vue → api/tak-portal-client.ts
- `updateLocator()` --calls--> `clampPingIntervalSeconds()`  [EXTRACTED]
  api/tak-portal-client.ts → lib/locator-url.ts
- `submit()` --calls--> `clampPingIntervalSeconds()`  [EXTRACTED]
  components/LocatorCreateCard.vue → lib/locator-url.ts
- `publicUrl` --calls--> `publicLocateUrl()`  [EXTRACTED]
  components/LocatorRowActions.vue → lib/locator-url.ts

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "PingForm.vue"
Cohesion: 0.06
Nodes (48): carrierLabel, carrierOptions, error, form, localDateTimeToUtcISO(), mapStore, missionGuid, mode (+40 more)

### Community 1 - "locator-history-map-sync.ts"
Cohesion: 0.07
Nodes (32): listLocators(), LocatorPlugin, callsignWithReceivedHhmm(), formatReceivedHhmm(), LOCATION_HISTORY_POINT_TYPE, LOCATION_HISTORY_STROKE, locationHistoryGeoJsonFeatures(), LocationHistoryGeoJsonOptions (+24 more)

### Community 2 - "SmsLocatorTab.vue"
Cohesion: 0.08
Nodes (42): ApiErr, ApiOk, archiveLocator(), bridgeUrl(), createLocator(), deleteLocator(), downloadLocatorReport(), LocateChannel (+34 more)

### Community 3 - "index.ts"
Cohesion: 0.07
Nodes (44): emit, popOut(), HostFloatComponent, LocatorFloatShell, LocatorPane, MenuItemConfig, MenuItemIconType, _typecheck (+36 more)

### Community 4 - "vue"
Cohesion: 0.07
Nodes (23): appStore, isMobile, emit, props, publicUrl, displayError, emit, localError (+15 more)

### Community 5 - "SettingsPanel.vue"
Cohesion: 0.07
Nodes (40): testTakPortalConnection(), channelOptions, clearFeedback(), cloneDraft(), emit, error, groups, groupWarning (+32 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (37): description, devDependencies, eslint, @eslint/js, eslint-plugin-vue, globals, @tak-ps/cloudtak, typescript (+29 more)

### Community 7 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowImportingTsExtensions, baseUrl, composite, esModuleInterop, forceConsistentCasingInFileNames, jsx, jsxImportSource (+24 more)

### Community 8 - "LocatorPane.vue"
Cohesion: 0.09
Nodes (23): listHistory(), sendLocatorLinkSms(), activeTab, chromeEl, defaultSendPhones, drillLocator, historyEntries, historyError (+15 more)

### Community 9 - "CloudTAK Locator Plugin"
Cohesion: 0.12
Nodes (15): Architecture, Caddyfile, CloudTAK API setup, CloudTAK Locator Plugin, Development, How locator SMS works, Install, License (+7 more)

### Community 10 - "coordinates.ts"
Cohesion: 0.38
Nodes (10): detectTopic(), dmsToDecimal(), LatLon, parseCoordinates(), parseDecimalDegree(), parseDecimalMinute(), parseDegMinSec(), parseMPS() (+2 more)

### Community 13 - "LocatorCreateCard.vue"
Cohesion: 0.07
Nodes (28): listLocateMeta(), listLocateMissions(), channel, channelNames, channelOptions, color, colorOpen, colorOptions (+20 more)

## Knowledge Gaps
- **4 isolated node(s):** `@vue/tsconfig`, `eslint`, `typescript`, `vue-tsc`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 236 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `PingForm.vue`, `locator-history-map-sync.ts`, `SmsLocatorTab.vue`, `index.ts`, `SettingsPanel.vue`, `package.json`, `LocatorPane.vue`, `LocatorCreateCard.vue`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **What connects `@vue/tsconfig`, `eslint`, `typescript` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PingForm.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06265664160401002 - nodes in this community are weakly interconnected._
- **Why does `@tak-ps/vue-tabler` connect `index.ts` to `PingForm.vue`, `SmsLocatorTab.vue`, `vue`, `SettingsPanel.vue`, `package.json`, `LocatorPane.vue`, `LocatorCreateCard.vue`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `locator-history-map-sync.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06704260651629072 - nodes in this community are weakly interconnected._
- **Should `SmsLocatorTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.07632850241545894 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06594071385359952 - nodes in this community are weakly interconnected._