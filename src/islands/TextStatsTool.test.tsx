import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextStatsTool from "./TextStatsTool";

describe("TextStatsTool", () => {
  it("updates word and character counts as text changes", () => {
    render(<TextStatsTool />);
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "one two three" },
    });
    const group = screen.getByRole("group", { name: "Text statistics" });
    expect(group).toHaveTextContent("3");
  });

  it("applies a cleanup transform to the text", async () => {
    const user = userEvent.setup();
    render(<TextStatsTool />);
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "hello world" },
    });
    await user.click(screen.getByRole("button", { name: "UPPERCASE" }));
    expect(screen.getByLabelText("Text")).toHaveValue("HELLO WORLD");
  });

  it("clears text on Reset", async () => {
    const user = userEvent.setup();
    render(<TextStatsTool />);
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "hello world" },
    });
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Text")).toHaveValue("");
  });
});
