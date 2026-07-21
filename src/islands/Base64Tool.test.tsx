import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Base64Tool from "./Base64Tool";

describe("Base64Tool", () => {
  it("encodes text to Base64", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "Hello, world!" },
    });
    await user.click(screen.getByRole("button", { name: "Encode" }));
    expect(screen.getByLabelText("Result")).toHaveValue("SGVsbG8sIHdvcmxkIQ==");
  });

  it("decodes Base64 back to text", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    await user.click(screen.getByRole("tab", { name: "Decode" }));
    fireEvent.change(screen.getByLabelText("Base64"), {
      target: { value: "SGVsbG8sIHdvcmxkIQ==" },
    });
    await user.click(screen.getByRole("button", { name: "Decode" }));
    expect(screen.getByLabelText("Result")).toHaveValue("Hello, world!");
  });

  it("shows an error for invalid Base64 input", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    await user.click(screen.getByRole("tab", { name: "Decode" }));
    fireEvent.change(screen.getByLabelText("Base64"), {
      target: { value: "not valid base64!!" },
    });
    await user.click(screen.getByRole("button", { name: "Decode" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears input and output on Reset", async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "hi" },
    });
    await user.click(screen.getByRole("button", { name: "Encode" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Text")).toHaveValue("");
    expect(screen.queryByLabelText("Result")).not.toBeInTheDocument();
  });
});
