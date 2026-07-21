import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JsonFormatterTool from "./JsonFormatterTool";

describe("JsonFormatterTool", () => {
  it("formats valid JSON when Format is clicked", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: { value: '{"a":1}' },
    });
    await user.click(screen.getByRole("button", { name: "Format" }));
    expect(screen.getByLabelText("Result")).toHaveValue('{\n  "a": 1\n}');
  });

  it("shows an error for invalid JSON instead of a result", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: { value: "{not valid}" },
    });
    await user.click(screen.getByRole("button", { name: "Format" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByLabelText("Result")).not.toBeInTheDocument();
  });

  it("clears input and output on Reset", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: { value: '{"a":1}' },
    });
    await user.click(screen.getByRole("button", { name: "Format" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("JSON input")).toHaveValue("");
    expect(screen.queryByLabelText("Result")).not.toBeInTheDocument();
  });
});
