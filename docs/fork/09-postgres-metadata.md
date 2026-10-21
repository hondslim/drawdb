# #9 Extended Postgres metadata in the share payload

## Spec

A share payload, a diagram record and the JSON export can carry an optional `postgres` object next to the diagram. It holds what DBML cannot express. Every table reference is a schema-qualified name (`digivacc.animals`). A name without a schema means `public`. Unknown keys are kept as they are.

```js
postgres: {
  rls: { "digivacc.animals": { enabled: true, forced: false } },
  policies: [{
    table: "digivacc.animals", name: "animals_owner_read",
    command: "SELECT",              // ALL | SELECT | INSERT | UPDATE | DELETE
    permissive: true,               // false = RESTRICTIVE
    roles: ["authenticated"],
    using: "owner_id = auth.uid()", withCheck: null,
  }],
  triggers: [{
    table: "digivacc.animals", name: "animals_birth_date_cap",
    timing: "BEFORE",               // BEFORE | AFTER | INSTEAD OF
    events: ["INSERT", "UPDATE"],   // UPDATE OF cols as "UPDATE OF birth_date"
    level: "ROW",                   // ROW | STATEMENT
    when: null,
    function: "digivacc.cap_birth_date",
    enabled: true,
  }],
  functions: [{
    schema: "digivacc", name: "cap_birth_date",
    arguments: "", returns: "trigger",
    kind: "function",               // function | procedure
    language: "plpgsql",
    volatility: "VOLATILE",         // VOLATILE | STABLE | IMMUTABLE
    securityDefiner: false,
    body: "BEGIN ... END",
  }],
  grants: [{ table: "digivacc.animals", role: "app_api", privileges: ["SELECT", "INSERT"] }],
  indexes: [{
    table: "digivacc.audit_event", name: "audit_event_thread_key_occurred_idx",
    unique: false, method: "btree",
    columns: ["thread_key", "occurred_at"],   // a column, or an expression such as "lower(email)"
    include: [], where: null,
    definition: "CREATE INDEX ... ",          // pg_get_indexdef, optional
  }],
  views: [],                                  // #13
}
```

- dbdraw fills it from `pg_catalog`: `pg_class.relrowsecurity`/`relforcerowsecurity`, `pg_policy`, `pg_trigger`, `pg_proc`, `information_schema.role_table_grants`, `pg_index`.
- The editor normalises it on load. Missing lists become `[]`, and keys without a schema get `public.`.
- It is stored in IndexedDB with the diagram, in the share payload, in the JSON export and in Save as. JSON import restores it.
- On a shareId reload (#6) the share's `postgres` replaces the stored one, because the database is the source of truth.
- Diagrams for other databases keep the object but show nothing from it.
- A payload without `postgres` behaves as today: the diagram has `postgres: null` and nothing changes.
- `metadataForTable(postgres, table)` returns `{rls, policies, triggers, grants, indexes}` for one table. #10, #11, #14 and #15 build on it.

## Plan

- `src/utils/postgresMeta.js`: `normalizePostgresMeta`, `postgresTableKey`, `metadataForTable`.
- `src/context/DiagramContext.jsx`: `postgres` state and `setPostgres`.
- Persist and load it everywhere `sqlHeader` goes: `Workspace.jsx` (save, load, cloud payload, reset), `ControlPanel.jsx` (save, save as, template, JSON export), `Modal.jsx` (JSON import), `Share.jsx` (payload), `share.js` (merge).
- `src/data/schemas.js`: `postgres: {type: ["object", "null"]}`.
- Tests: `src/utils/__tests__/postgresMeta.test.js`, and `share.test.js` for the merge.
