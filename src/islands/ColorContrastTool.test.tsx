import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColorContrastTool from "./ColorContrastTool";

describe("ColorContrastTool", () => {
  it("shows a 21:1 ratio and full passes for black on white by default", () => {
    render(<ColorContrastTool />);
    expect(screen.getByText(/21\.00/)).toBeInTheDocument();
    expect(screen.getAllByText("Pass")).toHaveLength(5);
  });

  it("updates the ratio live as colors change", () => {
    render(<ColorContrastTool />);
    fireEvent.change(screen.getByLabelText("Background color"), {
      target: { value: "#111111" },
    });
    expect(screen.queryByText(/21\.00/)).not.toBeInTheDocument();
  });

  it("shows failing checks for low-contrast colors", () => {
    render(<ColorContrastTool />);
    fireEvent.change(screen.getByLabelText("Text color"), {
      target: { value: "#999999" },
    });
    fireEvent.change(screen.getByLabelText("Background color"), {
      target: { value: "#aaaaaa" },
    });
    expect(screen.getAllByText("Fail").length).toBeGreaterThan(0);
  });

  it("shows an error for an invalid color instead of crashing", () => {
    render(<ColorContrastTool />);
    fireEvent.change(screen.getByLabelText("Text color"), {
      target: { value: "not-a-color" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/text color/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("swaps text and background colors", () => {
    render(<ColorContrastTool />);
    fireEvent.change(screen.getByLabelText("Text color"), {
      target: { value: "#ff0000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Swap colors" }));
    expect(screen.getByLabelText("Background color")).toHaveValue("#ff0000");
    expect(screen.getByLabelText("Text color")).toHaveValue("#ffffff");
  });

  it("resets to the default black-on-white colors", async () => {
    const user = userEvent.setup();
    render(<ColorContrastTool />);
    fireEvent.change(screen.getByLabelText("Text color"), {
      target: { value: "#ff0000" },
    });
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Text color")).toHaveValue("#000000");
    expect(screen.getByLabelText("Background color")).toHaveValue("#ffffff");
    expect(screen.getByText(/21\.00/)).toBeInTheDocument();
  });
});
