# #11 Triggers per table

## Spec

Builds on #9 and the cards from #10.

- Canvas header: a bolt icon with the trigger count, when the table has triggers. The tooltip lists `name: TIMING EVENTS`.
- Table details: a **Triggers** card, one block per trigger:
  - the name, with a "disabled" tag when `enabled` is false,
  - `BEFORE`/`AFTER`/`INSTEAD OF`, the events (`INSERT`, `UPDATE OF birth_date`, ...) and `FOR EACH ROW`/`STATEMENT`,
  - the `WHEN` condition in monospace, if any,
  - the function it executes. #12 turns this into a link to the Functions tab.
- Read-only, like the RLS card.

## Plan

- `PostgresBadges.jsx`: the trigger badge.
- `PostgresDetails.jsx`: the Triggers card.
- `en` strings.
