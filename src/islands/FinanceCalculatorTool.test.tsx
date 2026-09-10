import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinanceCalculatorTool from "./FinanceCalculatorTool";

describe("FinanceCalculatorTool", () => {
  it("computes the default Mortgage Payment calculator", async () => {
    const user = userEvent.setup();
    render(<FinanceCalculatorTool />);

    fireEvent.change(screen.getByLabelText("Loan Amount (Principal)"), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText("Annual Interest Rate (%)"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Term (Years)"), {
      target: { value: "30" },
    });
    await user.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByText("$1,432.25")).toBeInTheDocument();
  });

  it("shows a specific error instead of silently treating a blank field as 0", async () => {
    const user = userEvent.setup();
    render(<FinanceCalculatorTool />);

    await user.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Loan amount must be a valid number.",
    );
  });

  it("switches to a different calculator and computes it", async () => {
    const user = userEvent.setup();
    render(<FinanceCalculatorTool />);

    await user.selectOptions(
      screen.getByLabelText("Choose Calculator"),
      "Loan-to-Value (LTV)",
    );
    fireEvent.change(screen.getByLabelText("Loan Amount"), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText("Asset/Property Value"), {
      target: { value: "250000" },
    });
    await user.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByText("80.00%")).toBeInTheDocument();
  });

  it("resets a calculator's fields and result", async () => {
    const user = userEvent.setup();
    render(<FinanceCalculatorTool />);

    fireEvent.change(screen.getByLabelText("Loan Amount (Principal)"), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText("Annual Interest Rate (%)"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Term (Years)"), {
      target: { value: "30" },
    });
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByText("$1,432.25")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Loan Amount (Principal)")).toHaveValue(null);
    expect(screen.queryByText("$1,432.25")).not.toBeInTheDocument();
  });
});
