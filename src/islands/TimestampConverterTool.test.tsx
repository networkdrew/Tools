import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimestampConverterTool from "./TimestampConverterTool";

describe("TimestampConverterTool", () => {
  it("converts a Unix seconds timestamp to a date", () => {
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText("Unix timestamp or date"), {
      target: { value: "1737331200" },
    });
    expect(screen.getByText("2025-01-20T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Unix timestamp (seconds)")).toBeInTheDocument();
  });

  it("shows an error for unparseable input", () => {
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText("Unix timestamp or date"), {
      target: { value: "not a real date" },
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears input on Reset", async () => {
    const user = userEvent.setup();
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText("Unix timestamp or date"), {
      target: { value: "1737331200" },
    });
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Unix timestamp or date")).toHaveValue("");
  });
});
