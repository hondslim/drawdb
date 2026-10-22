# #20 Subject areas from the payload

## Spec

- A share payload can carry `areas: [{name, color, tables: ["digivacc.animals", ...]}]`. Table references are `schema.name` or `name`, resolved as in deep links (#19). A table belongs to the first area that lists it. Unknown names are ignored.
- First import (nothing stored): each area's tables are laid out with dagre (`autoArrange`) on the relationships inside the area. The clusters are then packed left to right into rows about as wide as they are tall, in payload order. Tables in no area form one last cluster with no rectangle. Each area gets a drawDB subject area around its cluster: 40px padding, plus room for the label at the top, in its colour (default blue).
- The view is fitted to the clustered layout, overriding the payload's `transform`, which was computed before clustering.
- These areas are marked `source: true`. Areas the user draws are never touched.
- A stored diagram with no source areas yet is laid out as on first import, keeping the areas the user drew. Its positions predate the areas, so keeping them would give overlapping rectangles.
- Reload (#6): otherwise stored table positions are kept. A new table that belongs to an area is placed just below that area's existing tables. Source areas are rebuilt to fit their member tables, keeping the colour the user picked for an area with the same name. An area that left the payload disappears.
- A payload without `areas` behaves as before.
- dbdraw can group by schema, or by a project-supplied table-to-area map (for DigiVacc, the migration file that created the table).

## Plan

- `src/utils/subjectAreas.js`: `layoutAreaClusters(tables, relationships, groups)`, `fitSourceAreas(tables, groups, storedAreas)`, `placeNewAreaMembers(tables, groups, storedIds)`.
- `src/utils/share.js`: apply after the table merge.
- Tests: `src/utils/__tests__/subjectAreas.test.js`.
