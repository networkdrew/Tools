import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFDocument } from "pdf-lib";
import PdfMergeTool from "./PdfMergeTool";

async function makePdfFile(
  name: string,
  pageSizes: [number, number][],
): Promise<File> {
  const doc = await PDFDocument.create();
  for (const [w, h] of pageSizes) doc.addPage([w, h]);
  const bytes = await doc.save();
  return new File([new Uint8Array(bytes)], name, { type: "application/pdf" });
}

describe("PdfMergeTool", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds PDF files and shows their name, size, and page count", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const fileA = await makePdfFile("a.pdf", [
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF files"), fileA);

    expect(await screen.findByText("a.pdf")).toBeInTheDocument();
    const fileRow = screen.getByText("a.pdf").closest("li") as HTMLElement;
    expect(within(fileRow).getByText(/2 pages/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Merge & prepare download" }),
    ).toBeInTheDocument();
  });

  it("shows an error for a non-PDF file and doesn't add it", async () => {
    render(<PdfMergeTool />);

    const notPdf = new File([new Uint8Array(10)], "photo.png", {
      type: "image/png",
    });
    // user-event's upload() silently drops files that don't match the
    // input's `accept` attribute, so this needs a raw change event to
    // reach the app's own validation instead.
    fireEvent.change(screen.getByLabelText("PDF files"), {
      target: { files: [notPdf] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /isn't a PDF file/,
    );
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
  });

  it("shows an error for a corrupted PDF", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const corrupted = new File(
      [new TextEncoder().encode("%PDF-1.7\nnot really a pdf")],
      "bad.pdf",
      { type: "application/pdf" },
    );
    await user.upload(screen.getByLabelText("PDF files"), corrupted);

    expect(await screen.findByRole("alert")).toHaveTextContent(/corrupted/);
  });

  it("expands a file to show its pages, and supports rotate/remove", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const fileA = await makePdfFile("a.pdf", [
      [100, 100],
      [200, 200],
    ]);
    await user.upload(screen.getByLabelText("PDF files"), fileA);
    await screen.findByText("a.pdf");

    await user.click(screen.getByRole("button", { name: "Show pages" }));
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();

    const page1Row = screen.getByText("Page 1").closest("li") as HTMLElement;
    await user.click(within(page1Row).getByText("Rotate right"));
    expect(screen.getByText(/rotated 90°/)).toBeInTheDocument();

    await user.click(within(page1Row).getByText("Remove"));
    expect(screen.queryByText("Page 1")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("reorders files with the move up/down controls", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const fileA = await makePdfFile("a.pdf", [[100, 100]]);
    const fileB = await makePdfFile("b.pdf", [[100, 100]]);
    await user.upload(screen.getByLabelText("PDF files"), [fileA, fileB]);
    await screen.findByText("a.pdf");
    await screen.findByText("b.pdf");

    const rowsBefore = screen
      .getAllByText(/^[ab]\.pdf$/)
      .map((el) => el.textContent);
    expect(rowsBefore).toEqual(["a.pdf", "b.pdf"]);

    const bRow = screen.getByText("b.pdf").closest("li") as HTMLElement;
    await user.click(within(bRow).getByText("Move up"));

    const rowsAfter = screen
      .getAllByText(/^[ab]\.pdf$/)
      .map((el) => el.textContent);
    expect(rowsAfter).toEqual(["b.pdf", "a.pdf"]);
  });

  it("merges files and offers a download", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const fileA = await makePdfFile("a.pdf", [[100, 100]]);
    await user.upload(screen.getByLabelText("PDF files"), fileA);
    await screen.findByText("a.pdf");

    await user.click(
      screen.getByRole("button", { name: "Merge & prepare download" }),
    );

    expect(
      await screen.findByRole("button", { name: "Download merged PDF" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Merged 1 page/)).toBeInTheDocument();
  });

  it("undo restores a removed page", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const fileA = await makePdfFile("a.pdf", [
      [100, 100],
      [200, 200],
    ]);
    await user.upload(screen.getByLabelText("PDF files"), fileA);
    await screen.findByText("a.pdf");
    await user.click(screen.getByRole("button", { name: "Show pages" }));

    const page1Row = screen.getByText("Page 1").closest("li") as HTMLElement;
    await user.click(within(page1Row).getByText("Remove"));
    expect(screen.queryByText("Page 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Page 1")).toBeInTheDocument();
  });

  it("resets everything back to the empty state", async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool />);

    const fileA = await makePdfFile("a.pdf", [[100, 100]]);
    await user.upload(screen.getByLabelText("PDF files"), fileA);
    await screen.findByText("a.pdf");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(screen.queryByText("a.pdf")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Merge & prepare download" }),
    ).not.toBeInTheDocument();
  });
});
