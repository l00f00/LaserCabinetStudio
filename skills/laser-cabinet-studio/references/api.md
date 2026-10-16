# Agent API

Laser Cabinet Studio exposes a browser API after `studio.js` loads:

```js
const studio = window.LaserCabinetStudio;
studio.getState();
studio.configure({ width: 600, height: 700, depth: 300, thickness: 5, kerf: 0.05 });
studio.applyPreset("kitchen");
studio.exportSvg(1); // SVG string for board 1
studio.exportDxf(1); // DXF string for board 1
```

`configure()` accepts any key present in the application's project JSON. Nested `frontConfig` and `lipConfig` values may be passed as objects; the API serializes them. It rejects unknown keys and regenerates the model before returning state.

The returned state contains:

- `valid` and the current validation `message`;
- `parameters` with the complete reproducible configuration;
- `model.parts` with IDs, names, modules, and hole counts;
- `cutPlan.boards`, `boardSize`, `efficiency`, and every nested placement.

## WebMCP tools

When `document.modelContext` is available, the page registers:

- `get_cabinet_state` — read the current configuration and generated model;
- `configure_cabinet` — update the principal cabinet and laser parameters;
- `apply_cabinet_preset` — apply `base`, `corner`, `drawers`, or `kitchen`;
- `get_cut_plan` — read board count, efficiency, rotations, and placements.

WebMCP registration is optional and feature-detected. The normal UI and `window.LaserCabinetStudio` API remain available when WebMCP is absent.
