import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordGeneratorTool from "./PasswordGeneratorTool";

describe("PasswordGeneratorTool", () => {
  it("generates a password of the configured length by default", async () => {
    const user = userEvent.setup();
    render(<PasswordGeneratorTool />);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    const result = screen.getByLabelText("Generated result");
    expect(result.textContent).toHaveLength(20);
  });

  it("generates a passphrase with the configured word count in passphrase mode", async () => {
    const user = userEvent.setup();
    render(<PasswordGeneratorTool />);
    await user.click(screen.getByRole("tab", { name: "Passphrase" }));
    await user.click(screen.getByRole("button", { name: "Generate" }));
    const result = screen.getByLabelText("Generated result");
    expect(result.textContent?.split("-")).toHaveLength(5);
  });

  it("shows an error instead of a result when no character set is selected", async () => {
    const user = userEvent.setup();
    render(<PasswordGeneratorTool />);
    await user.click(screen.getByLabelText("Lowercase (a-z)"));
    await user.click(screen.getByLabelText("Uppercase (A-Z)"));
    await user.click(screen.getByLabelText("Numbers (0-9)"));
    await user.click(screen.getByLabelText("Symbols (!@#…)"));
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByLabelText("Generated result")).not.toBeInTheDocument();
  });

  it("clears the result on Reset", async () => {
    const user = userEvent.setup();
    render(<PasswordGeneratorTool />);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(screen.getByLabelText("Generated result")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.queryByLabelText("Generated result")).not.toBeInTheDocument();
  });
});
