import { describe, expect, it } from "vitest";
import { createRequestGate } from "./requestGate";

describe("createRequestGate", () => {
  it("ignora uma resposta iniciada antes de uma nova consulta", () => {
    const gate = createRequestGate();
    const firstRequest = gate.begin();
    const latestRequest = gate.begin();

    expect(gate.isLatest(firstRequest)).toBe(false);
    expect(gate.isLatest(latestRequest)).toBe(true);
  });
});
