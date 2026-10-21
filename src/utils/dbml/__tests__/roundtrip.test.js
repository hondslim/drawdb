import { describe, expect, it } from "vitest";
import { toDBML } from "../../exportAs/dbml";
import { fromDBML } from "../../importFrom/dbml";
import { DB } from "../../../data/constants";
import { template1 } from "../../../templates/template1";
import { template2 } from "../../../templates/template2";
import { template3 } from "../../../templates/template3";
import { template4 } from "../../../templates/template4";
import { template5 } from "../../../templates/template5";
import { template6 } from "../../../templates/template6";

const templates = {
  template1,
  template2,
  template3,
  template4,
  template5,
  template6,
};

describe("DBML round trip", () => {
  for (const [name, template] of Object.entries(templates)) {
    it(`${name} exports, imports and exports the same DBML`, () => {
      const diagram = {
        ...template,
        database: template.database ?? DB.GENERIC,
      };
      const first = toDBML(diagram);
      const imported = fromDBML(first, diagram.database);
      const second = toDBML({ ...diagram, ...imported });
      expect(second).toEqual(first);
    });
  }
});
