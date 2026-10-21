# #8 A circular FK is not an error, and is reported once

## Spec

- A relationship runs from the FK table (`startTableId`) to the referenced table (`endTableId`). Self-references are ignored, as today.
- A FK is _hard_ when every FK column is `notNull` and the relationship is not `deferrable`. Otherwise it is _soft_: a row can be inserted with the FK unset, or the check waits until commit.
- A cycle made only of hard FKs means no row can be inserted first. It is reported once per group of tables, as one issue that names every table in the group.
- A cycle that needs at least one soft FK is legal and is not reported.
- The group is a strongly connected component of the hard-FK graph, so one group with many paths through it gives one entry.

## Plan

- `src/utils/issues.js`: replace the recursive `checkCircularRelationships` with Tarjan's SCC over hard edges. Report components of two or more tables with the existing `circular_dependency` key, passing the table names joined by `, ` as `refName`, so every locale keeps working.
- Tests in `src/utils/__tests__/issues.test.js`: a hard two-table cycle gives one entry; a cycle through a nullable FK gives none; a deferrable FK gives none; a figure-eight of three tables gives one entry.
