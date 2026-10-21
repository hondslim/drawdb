# #4 Optional vs mandatory relationship ends

## Spec

- A relationship has `startOptional` and `endOptional`. Each is `true` (zero allowed), `false` (at least one) or missing (unknown). Existing diagrams have both missing and look as they do today.
- The FK side is the start, except for `ONE_TO_MANY`, where it is the end. The other side is the parent.
- Import:
  - Postgres SQL and DBML: the parent end is optional when any FK column is nullable, and mandatory when all are NOT NULL.
  - DBML 10.x: a `?` on the parent side also makes it optional. A `?` on the FK side makes that side optional; without one the FK side stays unknown.
- Canvas: when either end is known and Cardinality is on, each end of a single-column relationship draws crow's-foot markers instead of the `1`/`n` pills. Next to the table: a bar for one, a crow's foot for many. Further out: a circle for optional, a bar for mandatory, nothing for unknown. Composite FKs and fully unknown relationships keep the pills.
- The relationship panel has a select per end: Unknown, Optional or Mandatory.
- DBML export writes `?` on the optional side(s), for example `>?`, so optionality round-trips.

## Plan

- `src/utils/relationshipEnds.js`: `fkSide(cardinality)`, `deriveOptionality(rel, startTable, endTable, parsed)`.
- `src/utils/dbml/parse.js`: already returns `startOptional`/`endOptional` (#2).
- `src/utils/dbml/reconcile.js`, `src/utils/importSQL/postgres.js`: set the flags. `src/utils/dbml/diff.js`: add the keys.
- `src/utils/exportAs/dbml.js`: `?` markers.
- `src/components/EditorCanvas/Relationship.jsx`: `CrowsFoot` drawn from the path end point and direction.
- `RelationshipInfo.jsx`: the two selects. `en` strings.
