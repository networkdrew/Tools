import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFDocument } from "pdf-lib";
import PdfSplitTool from "./PdfSplitTool";

// jsdom has no canvas/pdf.js worker support, and thumbnails are a display-only
// preview (the actual output always comes from pdf-lib), so the rendering
// module is stubbed out rather than exercised for real here.
vi.mock("@/islands/pdf-split/thumbnails", () => ({
  loadPdfJsDocument: vi.fn(async () => ({})),
  renderPageThumbnail: vi.fn(async () => "data:image/png;base64,mock"),
}));

async function makePdfFile(
  name: string,
  pageSizes: [number, number][],
): Promise<File> {
  const doc = await PDFDocument.create();
  for (const [w, h] of pageSizes) doc.addPage([w, h]);
  const bytes = await doc.save();
  return new File([new Uint8Array(bytes)], name, { type: "application/pdf" });
}

describe("PdfSplitTool", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a PDF and shows its filename, size, and page count", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("report.pdf", [
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Extract selected pages/ }),
    ).toBeChecked();
  });

  it("shows an error for a non-PDF file and doesn't load it", async () => {
    render(<PdfSplitTool />);

    const notPdf = new File([new Uint8Array(10)], "photo.png", {
      type: "image/png",
    });
    // user-event's upload() silently drops files that don't match the
    // input's `accept` attribute, so this needs a raw change event to reach
    // the app's own validation instead.
    fireEvent.change(screen.getByLabelText("PDF file"), {
      target: { files: [notPdf] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /isn't a PDF file/,
    );
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
  });

  it("shows an error for a corrupted PDF", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const corrupted = new File(
      [new TextEncoder().encode("%PDF-1.7\nnot really a pdf")],
      "bad.pdf",
      { type: "application/pdf" },
    );
    await user.upload(screen.getByLabelText("PDF file"), corrupted);

    expect(await screen.findByRole("alert")).toHaveTextContent(/corrupted/);
  });

  it("applies a typed page range and extracts the selection", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [
      [100, 100],
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.type(screen.getByLabelText("Select by range"), "1, 3");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByText("2 of 4 pages selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByRole("button", { name: "Download PDF" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Built a PDF with 2 pages/)).toBeInTheDocument();
  });

  it("shows an error for an invalid typed range instead of applying it", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.type(screen.getByLabelText("Select by range"), "5-9");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/out of range/);
    expect(screen.getByText("0 of 2 pages selected")).toBeInTheDocument();
  });

  it("rejects generating without selecting any pages", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [[100, 100]]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Select at least one page/,
    );
  });

  it("rotates an individual page", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [[100, 100]]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(
      screen.getByRole("button", { name: "Rotate page 1 right" }),
    );
    expect(screen.getByText(/rotated 90°/)).toBeInTheDocument();
  });

  it("splits every page into a ZIP of separate PDFs", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(
      screen.getByRole("radio", {
        name: /Split every page into separate files/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByRole("button", { name: "Download ZIP" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Built 3 PDFs/)).toBeInTheDocument();
  });

  it("rejects a fixed-count split with an invalid page count", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(
      screen.getByRole("radio", { name: /Split by fixed page count/ }),
    );
    const pagesPerFile = screen.getByLabelText("Pages per file");
    fireEvent.change(pagesPerFile, { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/whole number/);
  });

  it("splits by custom ranges typed one per line", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [
      [100, 100],
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(
      screen.getByRole("radio", { name: /Split by custom ranges/ }),
    );
    fireEvent.change(screen.getByLabelText(/Ranges/), {
      target: { value: "1-2\n3-4" },
    });
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByRole("button", { name: "Download ZIP" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Built 2 PDFs/)).toBeInTheDocument();
  });

  it("removes selected pages, keeping the rest", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(
      screen.getByRole("radio", { name: /Remove selected pages/ }),
    );
    await user.click(screen.getByLabelText("Select page 2 to remove"));
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByRole("button", { name: "Download PDF" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Built a PDF with 2 pages/)).toBeInTheDocument();
  });

  it("resets everything back to the empty state", async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool />);

    const file = await makePdfFile("doc.pdf", [[100, 100]]);
    await user.upload(screen.getByLabelText("PDF file"), file);
    await screen.findByText("doc.pdf");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(screen.queryByText("doc.pdf")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Generate" }),
    ).not.toBeInTheDocument();
  });
});
