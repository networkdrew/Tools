import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolDirectory } from "./ToolDirectory";
import { tools } from "@/lib/tools/registry";

describe("ToolDirectory", () => {
  it("shows every tool by default", () => {
    render(<ToolDirectory />);
    expect(
      screen.getByText(`Showing ${tools.length} of ${tools.length} tools`),
    ).toBeInTheDocument();
  });

  it("filters results as the user types", () => {
    render(<ToolDirectory />);
    fireEvent.change(screen.getByLabelText("Search tools"), {
      target: { value: "json" },
    });
    expect(screen.getByText("JSON Formatter & Validator")).toBeInTheDocument();
    expect(
      screen.queryByText("Base64 Encoder & Decoder"),
    ).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    render(<ToolDirectory />);
    await user.click(
      screen.getByRole("button", { name: "Security & Privacy" }),
    );
    expect(
      screen.getByText("Password & Passphrase Generator"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("JSON Formatter & Validator"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state with a clear-filters action when nothing matches", async () => {
    const user = userEvent.setup();
    render(<ToolDirectory />);
    fireEvent.change(screen.getByLabelText("Search tools"), {
      target: { value: "zzzznonexistent" },
    });
    expect(screen.getByText("No tools match your search.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      screen.getByText(`Showing ${tools.length} of ${tools.length} tools`),
    ).toBeInTheDocument();
  });
});
