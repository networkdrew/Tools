import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QrCodeGeneratorTool from "./QrCodeGeneratorTool";

describe("QrCodeGeneratorTool", () => {
  it("generates a QR code preview for text input", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorTool />);
    fireEvent.change(screen.getByLabelText("Text or URL"), {
      target: { value: "https://example.com" },
    });
    await user.click(screen.getByRole("button", { name: "Generate QR code" }));
    expect(screen.getByText(/modules/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download PNG" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download SVG" }),
    ).toBeInTheDocument();
  });

  it("shows an error for empty input", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorTool />);
    await user.click(screen.getByRole("button", { name: "Generate QR code" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears input and result on Reset", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorTool />);
    fireEvent.change(screen.getByLabelText("Text or URL"), {
      target: { value: "hello" },
    });
    await user.click(screen.getByRole("button", { name: "Generate QR code" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Text or URL")).toHaveValue("");
    expect(screen.queryByText(/modules/)).not.toBeInTheDocument();
  });

  it("surfaces a friendly error instead of crashing when PNG rendering is unavailable", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorTool />);
    fireEvent.change(screen.getByLabelText("Text or URL"), {
      target: { value: "hello" },
    });
    await user.click(screen.getByRole("button", { name: "Generate QR code" }));
    // jsdom doesn't implement 2D canvas rendering, so getContext("2d")
    // returns null here — this exercises the same fallback a real browser
    // without canvas support would hit.
    await user.click(screen.getByRole("button", { name: "Download PNG" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't render/i);
  });
});
