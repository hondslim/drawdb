import { normalizeSchema } from "../schema";

const ID = String.raw`(?:"(?:[^"\\]|\\.)*"|[A-Za-z_][\w$]*)`;
const ENDPOINT = String.raw`(?:${ID}\s*\.\s*){1,2}(?:${ID}|\([^)]*\))`;
const OPERATOR = String.raw`\??(?:<>|<|>|-)\??`;

const SKIPPED =
  /'''[\s\S]*?'''|'(?:[^'\\\n]|\\.)*'|`[^`]*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"/g;
const TABLE_DECLARATION = new RegExp(
  String.raw`\bTable\s+(${ID}(?:\s*\.\s*${ID})?)(?:\s+as\s+(${ID}))?`,
  "gi",
);
const SHORT_REF = /\bRef\b[^:{\n]*:([^\n]*)/gi;
const LONG_REF = /\bRef\b[^:{\n]*\{([^}]*)\}/gi;
const PAIR = new RegExp(`(${ENDPOINT})\\s*${OPERATOR}\\s*(${ENDPOINT})`, "g");
const INLINE_REF = new RegExp(
  String.raw`\bref\s*:\s*${OPERATOR}\s*(${ENDPOINT})`,
  "gi",
);

function blankSkipped(src) {
  return src.replace(SKIPPED, (match) =>
    match.startsWith('"') ? match : " ".repeat(match.length),
  );
}

function unquote(id) {
  const value = id.trim();
  return value.startsWith('"')
    ? value.slice(1, -1).replace(/\\(.)/g, "$1")
    : value;
}

function splitPath(path) {
  return path.match(new RegExp(`${ID}|\\([^)]*\\)`, "g"));
}

function parseEndpoint(text) {
  const parts = splitPath(text);
  const columnsPart = parts.pop();
  const columns = columnsPart.startsWith("(")
    ? columnsPart
        .slice(1, -1)
        .split(",")
        .map((column) => unquote(column))
        .filter(Boolean)
    : [unquote(columnsPart)];
  const table = unquote(parts.pop());
  const schema = parts.length ? normalizeSchema(unquote(parts.pop())) : "";
  return { schema, table, columns };
}

export function stubKey(schema, table) {
  return `${schema ?? ""}\u0000${table}`;
}

function declaredTables(src) {
  const declared = new Set();
  for (const match of src.matchAll(TABLE_DECLARATION)) {
    const parts = splitPath(match[1]).map(unquote);
    const table = parts.pop();
    const schema = normalizeSchema(parts.pop());
    declared.add(stubKey(schema, table));
    if (match[2]) declared.add(stubKey("", unquote(match[2])));
  }
  return declared;
}

function referencedEndpoints(src) {
  const endpoints = [];
  const addPairs = (text) => {
    for (const match of text.matchAll(PAIR)) {
      endpoints.push(parseEndpoint(match[1]), parseEndpoint(match[2]));
    }
  };

  for (const match of src.matchAll(SHORT_REF)) addPairs(match[1]);
  for (const match of src.matchAll(LONG_REF)) addPairs(match[1]);
  for (const match of src.matchAll(INLINE_REF)) {
    endpoints.push(parseEndpoint(match[1]));
  }
  return endpoints;
}

function quote(id) {
  return `"${String(id).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function declareStubTables(src) {
  const scanned = blankSkipped(src);
  const declared = declaredTables(scanned);
  const stubs = new Map();

  for (const endpoint of referencedEndpoints(scanned)) {
    const key = stubKey(endpoint.schema, endpoint.table);
    if (declared.has(key)) continue;
    if (!stubs.has(key)) stubs.set(key, { ...endpoint, columns: [] });
    const stub = stubs.get(key);
    endpoint.columns.forEach((column) => {
      if (!stub.columns.includes(column)) stub.columns.push(column);
    });
  }

  if (!stubs.size) return { src, stubs: new Set() };

  const declarations = [...stubs.values()].map((stub) => {
    const name = stub.schema
      ? `${quote(stub.schema)}.${quote(stub.table)}`
      : quote(stub.table);
    const columns = stub.columns
      .map((column) => `  ${quote(column)} unknown`)
      .join("\n");
    return `Table ${name} {\n${columns}\n}`;
  });

  return {
    src: `${src}\n\n${declarations.join("\n\n")}\n`,
    stubs: new Set(stubs.keys()),
  };
}
