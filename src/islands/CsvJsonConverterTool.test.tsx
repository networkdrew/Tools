import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CsvJsonConverterTool from "./CsvJsonConverterTool";

describe("CsvJsonConverterTool", () => {
  it("converts CSV to JSON", async () => {
    const user = userEvent.setup();
    render(<CsvJsonConverterTool />);
    fireEvent.change(screen.getByLabelText("CSV"), {
      target: { value: "name,age\nAda,36" },
    });
    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByLabelText("Result")).toHaveValue(
      JSON.stringify([{ name: "Ada", age: "36" }], null, 2),
    );
  });

  it("converts JSON to CSV", async () => {
    const user = userEvent.setup();
    render(<CsvJsonConverterTool />);
    await user.click(screen.getByRole("tab", { name: "JSON to CSV" }));
    fireEvent.change(screen.getByLabelText("JSON"), {
      target: { value: '[{"name":"Ada","age":36}]' },
    });
    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByLabelText("Result")).toHaveValue("name,age\nAda,36");
  });

  it("shows an error for invalid JSON input", async () => {
    const user = userEvent.setup();
    render(<CsvJsonConverterTool />);
    await user.click(screen.getByRole("tab", { name: "JSON to CSV" }));
    fireEvent.change(screen.getByLabelText("JSON"), {
      target: { value: "{not json" },
    });
    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears input and output on Reset", async () => {
    const user = userEvent.setup();
    render(<CsvJsonConverterTool />);
    fireEvent.change(screen.getByLabelText("CSV"), {
      target: { value: "name\nAda" },
    });
    await user.click(screen.getByRole("button", { name: "Convert" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("CSV")).toHaveValue("");
    expect(screen.queryByLabelText("Result")).not.toBeInTheDocument();
  });

  it("respects the 'first row is header' toggle", async () => {
    const user = userEvent.setup();
    render(<CsvJsonConverterTool />);
    await user.click(screen.getByLabelText("First row is header"));
    fireEvent.change(screen.getByLabelText("CSV"), {
      target: { value: "Ada,36" },
    });
    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByLabelText("Result")).toHaveValue(
      JSON.stringify([["Ada", "36"]], null, 2),
    );
  });
});
