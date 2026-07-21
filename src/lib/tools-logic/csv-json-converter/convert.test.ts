import { describe, expect, it } from "vitest";
import { csvToJson, jsonToCsv } from "./convert";

describe("csvToJson", () => {
  it("converts a header row and data rows into an array of objects", () => {
    const result = csvToJson("name,age\nAda,36\nGrace,85", {
      delimiter: ",",
      hasHeader: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.value)).toEqual([
        { name: "Ada", age: "36" },
        { name: "Grace", age: "85" },
      ]);
    }
  });

  it("converts to arrays of arrays when there's no header", () => {
    const result = csvToJson("Ada,36\nGrace,85", {
      delimiter: ",",
      hasHeader: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.value)).toEqual([
        ["Ada", "36"],
        ["Grace", "85"],
      ]);
    }
  });

  it("respects a custom delimiter", () => {
    const result = csvToJson("name;age\nAda;36", {
      delimiter: ";",
      hasHeader: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(JSON.parse(result.value)).toEqual([{ name: "Ada", age: "36" }]);
  });

  it("handles quoted fields with embedded commas and quotes", () => {
    const result = csvToJson('name,note\nAda,"said ""hi"", bye"', {
      delimiter: ",",
      hasHeader: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.value)).toEqual([
        { name: "Ada", note: 'said "hi", bye' },
      ]);
    }
  });

  it("fills missing trailing fields with an empty string", () => {
    const result = csvToJson("name,age,city\nAda,36", {
      delimiter: ",",
      hasHeader: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.value)).toEqual([
        { name: "Ada", age: "36", city: "" },
      ]);
    }
  });

  it("rejects empty input", () => {
    expect(csvToJson("", { delimiter: ",", hasHeader: true }).ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    expect(csvToJson("   \n  ", { delimiter: ",", hasHeader: true }).ok).toBe(
      false,
    );
  });

  it("rejects a header row with no data rows", () => {
    const result = csvToJson("name,age", { delimiter: ",", hasHeader: true });
    expect(result.ok).toBe(false);
  });

  it("reports unterminated quoted fields as an error", () => {
    const result = csvToJson('name\n"Ada', { delimiter: ",", hasHeader: true });
    expect(result.ok).toBe(false);
  });
});

describe("jsonToCsv", () => {
  it("converts an array of objects into a header row plus data rows", () => {
    const result = jsonToCsv(
      JSON.stringify([
        { name: "Ada", age: 36 },
        { name: "Grace", age: 85 },
      ]),
      { delimiter: "," },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("name,age\nAda,36\nGrace,85");
    }
  });

  it("wraps a single object into a one-row CSV", () => {
    const result = jsonToCsv(JSON.stringify({ name: "Ada", age: 36 }), {
      delimiter: ",",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("name,age\nAda,36");
  });

  it("unions keys across objects that don't all share the same fields", () => {
    const result = jsonToCsv(
      JSON.stringify([{ name: "Ada" }, { name: "Grace", age: 85 }]),
      { delimiter: "," },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("name,age\nAda,\nGrace,85");
    }
  });

  it("stringifies nested objects/arrays into a single cell", () => {
    const result = jsonToCsv(JSON.stringify([{ id: 1, tags: ["a", "b"] }]), {
      delimiter: ",",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('id,tags\n1,"[""a"",""b""]"');
    }
  });

  it("uses the chosen delimiter and quotes fields that contain it", () => {
    const result = jsonToCsv(JSON.stringify([{ note: "a;b" }]), {
      delimiter: ";",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('note\n"a;b"');
  });

  it("rejects empty input", () => {
    expect(jsonToCsv("", { delimiter: "," }).ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    expect(jsonToCsv("{not json", { delimiter: "," }).ok).toBe(false);
  });

  it("rejects an empty array", () => {
    expect(jsonToCsv("[]", { delimiter: "," }).ok).toBe(false);
  });

  it("rejects an array of non-objects", () => {
    expect(jsonToCsv("[1, 2, 3]", { delimiter: "," }).ok).toBe(false);
  });

  it("rejects a plain string or number", () => {
    expect(jsonToCsv('"just a string"', { delimiter: "," }).ok).toBe(false);
  });
});
