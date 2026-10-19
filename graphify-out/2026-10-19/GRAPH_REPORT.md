# Graph Report - cloudtak-plugin-locator  (2026-10-18)

## Corpus Check
- 45 files · ~14,672 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 427 nodes · 781 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76ebcc9f`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `vue` - 18 edges
3. `submit()` - 12 edges
4. `LocatorHistoryMapSync` - 12 edges
5. `openPopout()` - 12 edges
6. `@tak-ps/vue-tabler` - 12 edges
7. `Locator` - 10 edges
8. `useLocatorStore` - 10 edges
9. `Overlay` - 10 edges
10. `std()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `updateLocator()` --calls--> `clampPingIntervalSeconds()`  [EXTRACTED]
  api/tak-portal-client.ts → lib/locator-url.ts
- `pushHistory()` --calls--> `listHistory()`  [EXTRACTED]
  components/LocatorPane.vue → api/tak-portal-client.ts
- `publicUrl` --calls--> `publicLocateUrl()`  [EXTRACTED]
  components/LocatorRowActions.vue → lib/locator-url.ts
- `previewUrl` --calls--> `publicLocateUrl()`  [EXTRACTED]
  components/LocatorSendSmsView.vue → lib/locator-url.ts
- `loadGroups()` --calls--> `listUserChannels()`  [EXTRACTED]
  components/SettingsPanel.vue → lib/portal-source.ts

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "PingForm.vue"
Cohesion: 0.06
Nodes (48): carrierLabel, carrierOptions, error, form, localDateTimeToUtcISO(), mapStore, missionGuid, mode (+40 more)

### Community 1 - "locator-history-map-sync.ts"
Cohesion: 0.07
Nodes (28): listHistory(), LocatorPlugin, callsignWithReceivedHhmm(), formatReceivedHhmm(), LOCATION_HISTORY_POINT_TYPE, LOCATION_HISTORY_STROKE, locationHistoryGeoJsonFeatures(), LocationHistoryGeoJsonOptions (+20 more)

### Community 2 - "SmsLocatorTab.vue"
Cohesion: 0.07
Nodes (44): ApiErr, ApiOk, archiveLocator(), bridgeUrl(), createLocator(), deleteLocator(), listLocators(), manualPing() (+36 more)

### Community 3 - "index.ts"
Cohesion: 0.08
Nodes (39): emit, popOut(), HostFloatComponent, LocatorFloatShell, LocatorPane, MenuItemConfig, MenuItemIconType, _typecheck (+31 more)

### Community 4 - "vue"
Cohesion: 0.06
Nodes (28): appStore, isMobile, emit, props, publicUrl, displayError, emit, localError (+20 more)

### Community 5 - "SettingsPanel.vue"
Cohesion: 0.08
Nodes (40): testTakPortalConnection(), channelOptions, clearFeedback(), cloneDraft(), emit, error, groups, groupWarning (+32 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (37): description, devDependencies, eslint, @eslint/js, eslint-plugin-vue, globals, @tak-ps/cloudtak, typescript (+29 more)

### Community 7 - "compilerOptions"
Cohesion: 0.06
Nodes (31): compilerOptions, allowImportingTsExtensions, baseUrl, composite, esModuleInterop, forceConsistentCasingInFileNames, jsx, jsxImportSource (+23 more)

### Community 8 - "LocatorPane.vue"
Cohesion: 0.09
Nodes (22): sendLocatorLinkSms(), activeTab, chromeEl, defaultSendPhones, drillLocator, historyEntries, historyError, historyLoading (+14 more)

### Community 9 - "CloudTAK Locator Plugin"
Cohesion: 0.12
Nodes (15): Architecture, Caddyfile, CloudTAK API setup, CloudTAK Locator Plugin, Development, How locator SMS works, Install, License (+7 more)

### Community 10 - "coordinates.ts"
Cohesion: 0.38
Nodes (10): detectTopic(), dmsToDecimal(), LatLon, parseCoordinates(), parseDecimalDegree(), parseDecimalMinute(), parseDegMinSec(), parseMPS() (+2 more)

## Knowledge Gaps
- **4 isolated node(s):** `@vue/tsconfig`, `eslint`, `typescript`, `vue-tsc`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `PingForm.vue`, `SmsLocatorTab.vue`, `index.ts`, `SettingsPanel.vue`, `package.json`, `LocatorPane.vue`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **What connects `@vue/tsconfig`, `eslint`, `typescript` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PingForm.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06298701298701298 - nodes in this community are weakly interconnected._
- **Why does `@tak-ps/vue-tabler` connect `index.ts` to `PingForm.vue`, `SmsLocatorTab.vue`, `vue`, `SettingsPanel.vue`, `package.json`, `LocatorPane.vue`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `locator-history-map-sync.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07197763801537387 - nodes in this community are weakly interconnected._
- **Should `SmsLocatorTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.07102040816326531 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._