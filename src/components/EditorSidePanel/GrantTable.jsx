import { PRIVILEGES } from "../../utils/postgresMeta";

const SHORT = {
  SELECT: "SEL",
  INSERT: "INS",
  UPDATE: "UPD",
  DELETE: "DEL",
  TRUNCATE: "TRN",
  REFERENCES: "REF",
  TRIGGER: "TRG",
};

export default function GrantTable({ rows, renderLabel }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          <th className="text-left font-semibold py-1 pe-2" />
          {PRIVILEGES.map((privilege) => (
            <th
              key={privilege}
              className="font-semibold py-1 px-0.5 text-center"
              title={privilege}
            >
              {SHORT[privilege]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={`${row.table}|${row.role}`}
            className="border-t border-zinc-300"
          >
            <td className="py-1 pe-2 break-all">{renderLabel(row)}</td>
            {PRIVILEGES.map((privilege) => (
              <td key={privilege} className="text-center">
                {row.privileges.includes(privilege) ? (
                  <i
                    className="fa-solid fa-check text-green-600"
                    title={`${row.role}: ${privilege}`}
                  />
                ) : (
                  <span className="opacity-20">·</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
