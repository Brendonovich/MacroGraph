# MacroGraph — LLM context for generating graphs & projects

Use this document as system/context when asked to produce MacroGraph data the user can **paste into the editor** or **save as a project file**.

**Source of truth in repo:** `packages/runtime-serde/src/serde.ts`, `packages/clipboard/src/index.ts`, node definitions under `packages/packages/src/`.

---

## What to output (pick one)

| Goal | Format | User action |
|------|--------|-------------|
| Paste nodes into open graph | Clipboard `selection` (base64) | Copy string → Ctrl+V in graph |
| Paste whole new graph | Clipboard `graph` (base64) | Copy string → paste / Import graph from clipboard |
| Full project file | Raw JSON `Project` | Save as `.json` → File → Open in MacroGraph |

### Clipboard wire format

1. Build a JSON object with a `type` field (see below).
2. `JSON.stringify` it (no pretty-print required).
3. **Base64-encode** the string (`btoa` in browser; Node: `Buffer.from(s).toString("base64")`).
4. User pastes that **single line** into MacroGraph (Ctrl+V).

On paste, **node and comment IDs are remapped** automatically. Connections must reference the **original** node IDs in the payload; paste remaps them via an internal map.

---

## Clipboard payloads

### `selection` — paste into current graph (most common)

```json
{
  "type": "selection",
  "origin": [100, 100],
  "nodes": [ /* Node[] */ ],
  "commentBoxes": [],
  "connections": [ /* Connection[] */ ],
  "selected": { "nodes": [], "commentBoxes": [] }
}
```

- `origin`: top-left anchor of the selection; paste offsets nodes relative to mouse.
- Include every node referenced by `connections`.
- Optional `selected`: node/comment IDs to select after paste.

### `graph` — add a new graph to the project

```json
{
  "type": "graph",
  "graph": { /* Graph object */ }
}
```

Graph `id` is replaced on paste; use any unused integer in the payload.

### `project` — full project (copy exists; paste in main UI is limited)

```json
{
  "type": "project",
  "project": { /* Project object */ }
}
```

Prefer **file save/load** for whole projects unless the user’s workflow supports project clipboard.

---

## Core types

### Node

```json
{
  "id": 0,
  "name": "Wait",
  "position": [120, 80],
  "schema": { "package": "Logic", "id": "Wait" },
  "defaultValues": { "delay": 1000 },
  "properties": {},
  "foldPins": false,
  "trackInvocations": false
}
```

| Field | Rules |
|-------|--------|
| `schema.package` + `schema.id` | Must match a registered node exactly (case-sensitive). Unknown → node dropped on load. |
| `position` | `[x, y]` or `{ "x", "y" }`; serialization uses `[x, y]`. |
| `defaultValues` | Data-input pin id → default (unconnected pins). |
| `properties` | Node config: number, string, boolean, or `{ "default": true }` for schema default. Variable/event/function pickers use **numeric IDs**. |
| `name` | Display label (often same as schema id). |

**Node kinds (runtime, not serialized):** `base` (exec flow), `exec` (single exec chain), `pure` (data only), `event` (triggers; **only on main graphs**, not function/queue graphs).

### Connection

Directed **output → input**:

```json
{
  "from": { "node": 0, "output": "true" },
  "to": { "node": 1, "input": "exec" }
}
```

- `output` / `input`: pin **id strings** from the node schema (not display names).
- Exec pins usually use id `"exec"` unless noted.
- Data pins: use the `id` from `io.dataInput` / `io.dataOutput` in package source.
- Scope pins: connect to scope body pins (e.g. For Each `body` scope outputs `element`, `index`).

### Variable

```json
{
  "id": 0,
  "name": "counter",
  "type": "int",
  "value": 0
}
```

- **Project variables:** `project.variables[]` — use with `Variables/Get Project Variable`, etc.
- **Graph variables:** `graph.variables[]` — use with `Variables/Get Graph Variable`, etc.
- Variable nodes need `properties.variable` set to the variable’s numeric `id`.

### Type system (`type` field)

| Type | JSON |
|------|------|
| Primitives | `"int"`, `"float"`, `"string"`, `"bool"` |
| Option | `{ "variant": "option", "inner": "string" }` |
| List | `{ "variant": "list", "item": "int" }` |
| Map | `{ "variant": "map", "value": "string" }` |
| Package struct | `{ "variant": "struct", "struct": { "variant": "package", "package": "HTTP Requests", "name": "Response" } }` |
| Custom struct | `{ "variant": "struct", "struct": { "variant": "custom", "id": 1 } }` |
| Package enum | `{ "variant": "enum", "enum": { "variant": "package", "package": "...", "name": "..." } }` |
| Custom enum | `{ "variant": "enum", "enum": { "variant": "custom", "id": 1 } }` |

**Values:** primitives as JSON; lists as arrays; maps as objects; option as `null` or inner value; enum as `{ "variant": "<variantId>" }` or with `"data": { "<fieldId>": ... }`; struct as `{ "<fieldId>": ... }`.

### Graph

```json
{
  "id": 0,
  "name": "Main",
  "nodeIdCounter": 3,
  "nodes": {
    "0": { /* Node */ },
    "1": { /* Node */ }
  },
  "connections": [],
  "variables": [],
  "commentBoxes": []
}
```

- `nodes`: object with **string keys** (`"0"`, `"1"`, …) mapping to nodes.
- `nodeIdCounter`: must be **greater than** the highest node id used (next id to assign).

### Project (minimal skeleton)

```json
{
  "name": "My Project",
  "graphIdCounter": 1,
  "functionGraphIdCounter": 0,
  "queueGraphIdCounter": 0,
  "functionQueueGraphIdCounter": 0,
  "counter": 0,
  "graphs": [ /* Graph[] */ ],
  "functionGraphs": [],
  "queueGraphs": [],
  "functionQueueGraphs": [],
  "variables": [],
  "queues": [],
  "functionQueues": [],
  "customEvents": [],
  "customStructs": [],
  "customEnums": [],
  "functions": [],
  "resources": []
}
```

**Graph kinds:** main automation → `graphs`; callable subgraphs → `functionGraphs` + `functions[]`; data queues → `queueGraphs` + `queues[]`; async function queues → `functionQueueGraphs` + `functionQueues[]`.

### Custom event (for Custom Events package)

```json
{
  "id": 0,
  "name": "PlayerDied",
  "fields": [
    { "id": "0", "name": "playerName", "type": "string" }
  ],
  "fieldIdCounter": 1
}
```

Listener node: `{ "package": "Custom Events", "id": "Custom Event" }`, `properties.event`: custom event id.

Emitter: `{ "package": "Custom Events", "id": "Emit Custom Event" }`, same `properties.event`.

Emitter data inputs: pin id `"<eventId>:<fieldId>"` (e.g. `"0:0"`).

### Comment box

```json
{
  "id": 0,
  "position": [50, 50],
  "size": [400, 200],
  "text": "Notes here",
  "tint": "#ffaa00"
}
```

---

## ID conventions

- Use contiguous integers starting at `0` within a graph/project unless merging into existing data.
- Keep `nodeIdCounter` / `graphIdCounter` / etc. one past the max used id.
- When referencing variables, events, functions, queues in `properties`, use the **same numeric ids** defined in project/graph arrays.
- Paste remaps node ids; **you do not need globally unique ids** across pastes.

---

## Registered packages (node namespaces)

Exact `schema.package` strings:

| Package | Examples |
|---------|----------|
| Logic | Branch, Wait, AND, OR, For Each, For Loop, While, Switch, … |
| Utils | Console Log, String Includes, … (large package) |
| Variables | Get/Set Graph Variable, Get/Set Project Variable, *Variable Changed |
| Custom Events | Custom Event, Emit Custom Event |
| Functions | Execute Function, Function Input, Function Output, … |
| Queue | Add to Queue, Queue Iterated Event, … |
| Function Queue | Add to Function Queue, … |
| Script | JavaScript |
| FS, Shell, HTTP Requests | File/shell/HTTP nodes |
| Audio, List, Map | Data structure utilities |
| Keyboard Inputs | Key press/release events |
| Global Mouse & Keyboard | Emulate Keyboard Input, … |
| Localstorage | Set Data, Get Data, … |
| Discord, GitHub, Google, Spotify, Patreon | Integrations |
| Twitch Events | EventSub nodes (many) |
| OBS Websocket | OBS control/events |
| MIDI, Stream Deck WebSocket, Streamlabs | Hardware/streaming |
| Websocket, WebSocket Server | WS client/server |
| VTube Studio, Voicemod, SpeakerBot, GoXLR | Stream tools |
| OpenAi, Elevenlabs | AI/voice APIs |

**There is no fixed enum of all nodes** — hundreds exist (especially Twitch, OBS). If unsure of pin ids, check `packages/packages/src/<package>/` for `createSchema({ name: "..." })` and `io.dataInput({ id: "..." })`.

---

## Frequently used nodes (pins)

### Logic / Branch (`base`)

| Pin | id | Direction |
|-----|-----|-----------|
| Exec in | `exec` | input (exec) |
| Condition | `condition` | input (bool) |
| True | `true` | output (exec) |
| False | `false` | output (exec) |

### Logic / Wait (`exec`)

| Pin | id |
|-----|-----|
| Delay (ms) | `delay` (data input; also `defaultValues.delay`) |

### Logic / AND (`pure`)

| Pin | id |
|-----|-----|
| One | `one` |
| Two | `two` |
| Result | `value` |

### Utils / Console Log (`exec`)

| Pin | id |
|-----|-----|
| Message | `input` (string) |

`properties.type`: `"log"` | `"warn"` | `"error"`.

### Variables / Get Graph Variable (`pure`)

- `properties.variable`: graph variable id (number).
- Output pin id is often `""` (empty string) — connect using that id.

### Variables / Set Graph Variable (`exec`)

- `properties.variable`: graph variable id.
- Input pin id `""` for value.

### Variables / Graph Variable Changed (`event`)

| Pin | id |
|-----|-----|
| Exec | `exec` |
| Value | `output` |
| Previous | `previousOutput` |

### Custom Events / Custom Event (`event`)

- `properties.event`: custom event id.
- Field outputs: `"<eventId>:<fieldId>"`.
- Exec output id often `""`.

### Custom Events / Emit Custom Event (`base`)

| Pin | id |
|-----|-----|
| Exec in | `execIn` |
| Exec out | `""` (empty) |
| Field inputs | `"<eventId>:<fieldId>"` |

### Functions / Execute Function (`base`)

- `properties.function`: function id.
- Exec: `exec` in, `exec` out.
- Inputs: `in:<fieldId>`; outputs: `out:<fieldId>` (field ids from `GraphFunction.inputs` / `outputs`).

---

## Layout tips

- Place nodes left-to-right along exec flow (~200–280px apart).
- Event nodes on the far left (~0–100 x).
- Pure/data nodes above/below exec chain.
- Set `origin` to min(x), min(y) of all node positions in a selection.

---

## Validation pitfalls

1. **Wrong package or node name** → silent drop on load.
2. **Event nodes on function/queue graphs** → dropped.
3. **Connections to missing nodes** → orphan (may be stripped on sanitize).
4. **Variable property id** doesn’t exist in `graph.variables` / `project.variables` → node may deserialize but not work.
5. **Pin id mismatch** → connection ignored or invalid.
6. **Type/value mismatch** on variables → runtime issues.
7. Migration: old `Utils/Print` → use `Utils/Console Log`.

---

## Example 1 — selection: event → log message (clipboard)

**JSON before base64:**

```json
{
  "type": "selection",
  "origin": [0, 0],
  "nodes": [
    {
      "id": 0,
      "name": "Graph Variable Changed",
      "position": [0, 0],
      "schema": { "package": "Variables", "id": "Graph Variable Changed" },
      "defaultValues": {},
      "properties": { "variable": 0 },
      "foldPins": false,
      "trackInvocations": false
    },
    {
      "id": 1,
      "name": "Console Log",
      "position": [280, 0],
      "schema": { "package": "Utils", "id": "Console Log" },
      "defaultValues": {},
      "properties": { "type": "log" },
      "foldPins": false,
      "trackInvocations": false
    },
    {
      "id": 2,
      "name": "To String",
      "position": [140, 120],
      "schema": { "package": "Utils", "id": "To String" },
      "defaultValues": {},
      "properties": {},
      "foldPins": false,
      "trackInvocations": false
    }
  ],
  "commentBoxes": [],
  "connections": [
    { "from": { "node": 0, "output": "exec" }, "to": { "node": 1, "input": "exec" } },
    { "from": { "node": 0, "output": "output" }, "to": { "node": 2, "input": "input" } },
    { "from": { "node": 2, "output": "output" }, "to": { "node": 1, "input": "input" } }
  ]
}
```

**Requires** graph variable `id: 0` already exists in the target graph. If generating a full graph/project, include:

```json
"variables": [{ "id": 0, "name": "score", "type": "int", "value": 0 }]
```

---

## Example 2 — graph: branch on bool

```json
{
  "type": "graph",
  "graph": {
    "id": 0,
    "name": "Branch Demo",
    "nodeIdCounter": 3,
    "nodes": {
      "0": {
        "id": 0,
        "name": "Branch",
        "position": [0, 0],
        "schema": { "package": "Logic", "id": "Branch" },
        "defaultValues": {},
        "properties": {},
        "foldPins": false,
        "trackInvocations": false
      },
      "1": {
        "id": 1,
        "name": "Console Log",
        "position": [300, -60],
        "schema": { "package": "Utils", "id": "Console Log" },
        "defaultValues": { "input": "true branch" },
        "properties": { "type": "log" },
        "foldPins": false,
        "trackInvocations": false
      },
      "2": {
        "id": 2,
        "name": "Console Log",
        "position": [300, 60],
        "schema": { "package": "Utils", "id": "Console Log" },
        "defaultValues": { "input": "false branch" },
        "properties": { "type": "log" },
        "foldPins": false,
        "trackInvocations": false
      }
    },
    "connections": [
      { "from": { "node": 0, "output": "true" }, "to": { "node": 1, "input": "exec" } },
      { "from": { "node": 0, "output": "false" }, "to": { "node": 2, "input": "exec" } }
    ],
    "variables": [],
    "commentBoxes": []
  }
}
```

Wire something into `Branch` pin `condition` (bool) separately or add a bool source node.

---

## Example 3 — minimal project with one graph

```json
{
  "name": "LLM Generated",
  "graphIdCounter": 1,
  "functionGraphIdCounter": 0,
  "queueGraphIdCounter": 0,
  "functionQueueGraphIdCounter": 0,
  "counter": 0,
  "graphs": [
    {
      "id": 0,
      "name": "Main",
      "nodeIdCounter": 1,
      "nodes": {
        "0": {
          "id": 0,
          "name": "Wait",
          "position": [100, 100],
          "schema": { "package": "Logic", "id": "Wait" },
          "defaultValues": { "delay": 5000 },
          "properties": {},
          "foldPins": false,
          "trackInvocations": false
        }
      },
      "connections": [],
      "variables": [],
      "commentBoxes": []
    }
  ],
  "functionGraphs": [],
  "queueGraphs": [],
  "functionQueueGraphs": [],
  "variables": [],
  "queues": [],
  "functionQueues": [],
  "customEvents": [],
  "customStructs": [],
  "customEnums": [],
  "functions": [],
  "resources": []
}
```

Save as `macrograph-project.json` and open via MacroGraph file dialog.

---

## LLM workflow checklist

When the user asks for a graph/automation:

1. Clarify: paste selection vs new graph vs full project file.
2. List required **integrations** (Twitch, OBS, …) — only use packages they have.
3. Define **variables / custom events / functions** first with stable ids.
4. Add **nodes** with exact `schema.package` + `schema.id`.
5. Set `properties` and `defaultValues`.
6. Add **connections** with correct pin ids.
7. Set counters (`nodeIdCounter`, etc.).
8. For clipboard: wrap in `selection` or `graph`, then **base64-encode** the JSON string.
9. Tell the user any **prerequisites** (e.g. “create Twitch resource in UI”, “graph variable must exist”).

---

## Finding pin ids for any node

1. Locate package file under `packages/packages/src/`.
2. Search `name: "<Node Name>"`.
3. Read `createIO` for `io.dataInput({ id: "..." })`, `io.execOutput({ id: "..." })`, etc.
4. Use those exact strings in `connections` and `defaultValues`.

---

## Version note

Generated: 2026-05-20. Schema matches `packages/runtime-serde` Valibot definitions. If load fails, compare against current `serde.ts` in the user’s repo branch.
