import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageWatermarkStudioTool from "./ImageWatermarkStudioTool";

vi.mock(
  "@/islands/image-watermark-studio/aiModelLoader",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("./image-watermark-studio/aiModelLoader")
      >();
    return {
      ...actual,
      fetchModelBytes: vi.fn(async (onProgress: (p: unknown) => void) => {
        onProgress({ loadedBytes: 10, totalBytes: 10, fromCache: false });
        return new ArrayBuffer(10);
      }),
      createInpaintSession: vi.fn(async () => ({
        session: { run: vi.fn(), outputNames: ["output"] },
        ort: { Tensor: class {} },
        backend: "wasm" as const,
      })),
    };
  },
);

vi.mock("@/islands/image-watermark-studio/aiRunner", () => ({
  runAIInstances: vi.fn(
    async (image: {
      data: Uint8ClampedArray;
      width: number;
      height: number;
    }) => ({
      data: new Uint8ClampedArray(image.data),
      width: image.width,
      height: image.height,
    }),
  ),
}));

function fakeImageFile(
  name = "photo.png",
  type = "image/png",
  size = 2048,
): File {
  return new File([new Uint8Array(size)], name, { type });
}

class FakeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(
    dataOrWidth: Uint8ClampedArray | number,
    widthOrHeight: number,
    height?: number,
  ) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height as number;
    } else {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }
  }
}

function makeMockCtx() {
  return {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
    textAlign: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({
      width: 80,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 4,
    })),
    getImageData: vi.fn(
      (_x: number, _y: number, w: number, h: number) => new FakeImageData(w, h),
    ),
    createImageData: vi.fn((w: number, h: number) => new FakeImageData(w, h)),
    putImageData: vi.fn(),
  };
}

/** jsdom implements neither createImageBitmap nor a 2D canvas context, nor ImageData/pointer capture. */
function mockCanvasSupport() {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(
      async () =>
        ({ width: 400, height: 300, close: vi.fn() }) as unknown as ImageBitmap,
    ),
  );
  vi.stubGlobal("ImageData", FakeImageData);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    makeMockCtx() as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) =>
      callback(new Blob([new Uint8Array(512)], { type: "image/png" })),
  );
  if (!("setPointerCapture" in HTMLElement.prototype)) {
    // @ts-expect-error -- jsdom doesn't implement pointer capture at all
    HTMLElement.prototype.setPointerCapture = vi.fn();
  } else {
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
      () => {},
    );
  }
}

describe("ImageWatermarkStudioTool", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows an error for a non-image file", async () => {
    render(<ImageWatermarkStudioTool />);
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Image file"), {
      target: { files: [textFile] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /isn't an image/i,
    );
  });

  it("loads an image and shows the watermark editor by default", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    expect(
      await screen.findByRole("tab", { name: "Add watermark" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Watermark text")).toBeInTheDocument();
  });

  it("draws the watermark text onto the canvas as it's typed", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    const textInput = await screen.findByLabelText("Watermark text");
    fireEvent.change(textInput, { target: { value: "Hello" } });

    const ctx = (
      HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>
    ).mock.results[0]?.value;
    await waitFor(() =>
      expect(ctx.fillText).toHaveBeenCalledWith("Hello", 0, 0),
    );
  });

  it("switches to repair mode and shows the permission reminder", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    await user.click(
      await screen.findByRole("tab", { name: "Remove / repair" }),
    );

    expect(
      screen.getByText(
        /Only use this on images you own or have permission to edit/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("records a Quick repair stroke as an undoable operation", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await user.click(
      await screen.findByRole("tab", { name: "Remove / repair" }),
    );
    await user.click(screen.getByRole("tab", { name: "Quick repair" }));

    const canvas = screen.getByRole("img", { name: /repair preview/i });
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 55, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 55, clientY: 55, pointerId: 1 });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled(),
    );
    expect(screen.getByText("1 repair edit")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("defaults repair mode to AI removal and lets the user build/undo/clear a selection before a model is loaded", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await user.click(
      await screen.findByRole("tab", { name: "Remove / repair" }),
    );

    expect(
      screen.getByRole("tab", { name: "AI removal (recommended)" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("button", { name: /load ai model/i }),
    ).toBeInTheDocument();
    // Remove is disabled until a model is loaded, even with a selection.
    const removeButton = screen.getByRole("button", { name: "Remove" });
    expect(removeButton).toBeDisabled();

    const canvas = screen.getByRole("img", { name: /repair preview/i });
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 55, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 55, clientY: 55, pointerId: 1 });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Undo selection" }),
      ).toBeEnabled(),
    );
    // Still disabled: a selection alone isn't enough, the AI model must be loaded too.
    expect(removeButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Undo selection" }));
    expect(
      screen.getByRole("button", { name: "Undo selection" }),
    ).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });

  it("loads the AI model, runs Remove on a selection, and records it as an undoable edit", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await user.click(
      await screen.findByRole("tab", { name: "Remove / repair" }),
    );

    await user.click(screen.getByRole("button", { name: /load ai model/i }));
    await screen.findByText(/AI model ready/i);

    const canvas = screen.getByRole("img", { name: /repair preview/i });
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 55, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 55, clientY: 55, pointerId: 1 });

    const removeButton = await screen.findByRole("button", { name: "Remove" });
    await waitFor(() => expect(removeButton).toBeEnabled());
    await user.click(removeButton);

    await waitFor(() =>
      expect(screen.getByText("1 repair edit")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    // The selection is cleared after a successful pass, ready for another.
    expect(
      screen.getByRole("button", { name: "Undo selection" }),
    ).toBeDisabled();
  });

  it("renders a full-resolution result and downloads it", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    await user.click(
      screen.getByRole("button", {
        name: "Render full-resolution watermarked image",
      }),
    );

    const downloadButton = await screen.findByRole("button", {
      name: "Download watermarked image",
    });
    await user.click(downloadButton);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("clears everything on Reset", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);

    const input = screen.getByLabelText("Image file") as HTMLInputElement;
    await user.upload(input, fakeImageFile());
    await screen.findByRole("tab", { name: "Add watermark" });

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.queryByRole("tab", { name: "Add watermark" }),
    ).not.toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("surfaces a friendly error instead of crashing when image decoding is unavailable", async () => {
    const user = userEvent.setup();
    render(<ImageWatermarkStudioTool />);
    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't read that image/i,
    );
  });
});
