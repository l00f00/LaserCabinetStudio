---
name: laser-cabinet-studio
description: Configure and validate parametric laser-cut cabinets in Laser Cabinet Studio from sketches or dimensional requirements. Use for cabinet geometry, joints, doors, drawers, handles, nesting, board counts, and SVG/DXF cutting plans; do not use for operating the physical laser.
---

# Laser Cabinet Studio

Turn the user's sketch or measurements into a reproducible cabinet configuration and verify that the generated parts fit the configured laser bed.

Use the browser API or WebMCP tools when the published app is open. Read [references/api.md](references/api.md) before calling them or constructing a shareable project state.

- Preserve the user's material thickness, kerf, maximum sheet dimensions, and requested joints.
- Ask only for dimensions or construction choices that materially change the result and cannot be inferred safely.
- Configure doors, drawers, partitions, handles, shelf lips, and angled sides through the same parametric state rather than drawing disconnected shapes.
- Inspect the returned validity message, part list, board count, nesting efficiency, and automatic oversize joins before presenting a result.
- Treat cut speed and power as editable annotations, not verified machine settings. Recommend a material test coupon before production.
- Export one SVG or DXF per numbered board. CUT geometry is red; MARK labels are blue and sit at the lower-right of each nested part.

When reporting completion, include the principal dimensions, sheet size, number of parts and boards, nesting efficiency, and any automatic dovetail splits.
