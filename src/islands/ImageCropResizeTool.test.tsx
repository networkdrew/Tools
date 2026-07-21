import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageCropResizeTool from "./ImageCropResizeTool";

function fakeImageFile(
  name = "photo.png",
  type = "image/png",
  size = 2048,
): File {
  return new File([new Uint8Array(size)], name, { type });
}

/**
 * jsdom implements neither createImageBitmap nor a 2D canvas context, so the
 * "real browser" path has to be stubbed to exercise cropping/resizing.
 * `alphaByte` controls what detectTransparency() reads back, letting tests
 * toggle the transparency warning.
 */
function mockCanvasSupport(alphaByte = 255, outputBlobType = "image/jpeg") {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(
      async () =>
        ({
          width: 800,
          height: 600,
          close: vi.fn(),
        }) as unknown as ImageBitmap,
    ),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    fillStyle: "",
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([0, 0, 0, alphaByte]),
    })),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) =>
      callback(new Blob([new Uint8Array(512)], { type: outputBlobType })),
  );
}

describe("ImageCropResizeTool", () => {
  beforeEach(() => {
    // jsdom doesn't implement these at all (not even as no-ops), so they
    // need a direct stub rather than a spy on an existing method.
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads an image and shows crop/resize controls with a live output preview", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    expect(await screen.findByText("2.0 KB")).toBeInTheDocument();

    expect(screen.getByLabelText("Crop preset")).toBeInTheDocument();
    expect(screen.getAllByText(/800×600px/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Crop & export image" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Output: 800×600px/)).toBeInTheDocument();
  });

  it("shows an error for a non-image file", async () => {
    render(<ImageCropResizeTool />);

    // fireEvent bypasses the input's `accept` filtering that userEvent.upload
    // applies, so this exercises validateImageFile's own type check directly
    // (a user can still pick a non-matching file via "All files" in the
    // native OS picker, so the check matters beyond what `accept` blocks).
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Image file"), {
      target: { files: [textFile] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /isn't an image/i,
    );
  });

  it("surfaces a friendly error instead of crashing when image decoding is unavailable", async () => {
    // No mockCanvasSupport() here — jsdom's real lack of createImageBitmap
    // exercises the same fallback a browser without it would hit.
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't read that image/i,
    );
  });

  it("prefills the resize fields from a preset with a suggested output size", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await screen.findByText("2.0 KB");

    await user.selectOptions(
      screen.getByLabelText("Crop preset"),
      "instagram-post",
    );

    expect(
      (screen.getByLabelText("Width (px)") as HTMLInputElement).value,
    ).toBe("1080");
    expect(
      (screen.getByLabelText("Height (px)") as HTMLInputElement).value,
    ).toBe("1080");
    expect(
      (screen.getByLabelText("Fit mode") as unknown as HTMLSelectElement).value,
    ).toBe("fill");
  });

  it("keeps width and height linked while aspect ratio is locked", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await screen.findByText("2.0 KB");

    await user.selectOptions(screen.getByLabelText("Crop preset"), "square");
    await user.selectOptions(screen.getByLabelText("Resize by"), "pixels");

    expect(screen.getByLabelText("Lock aspect ratio")).toBeChecked();

    const widthInput = screen.getByLabelText("Width (px)") as HTMLInputElement;
    fireEvent.change(widthInput, { target: { value: "300" } });

    expect(
      (screen.getByLabelText("Height (px)") as HTMLInputElement).value,
    ).toBe("300");
  });

  it("undoes and redoes a rotation", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await screen.findByText("2.0 KB");

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Rotate right" }));
    // 800x600 rotated 90 degrees becomes a 600x800 oriented canvas.
    expect(await screen.findByText(/600×800px/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() =>
      expect(screen.getAllByText(/800×600px/).length).toBeGreaterThan(0),
    );
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(await screen.findByText(/600×800px/)).toBeInTheDocument();
  });

  it("warns before exporting a transparent image to JPEG", async () => {
    mockCanvasSupport(128, "image/jpeg"); // non-opaque alpha byte
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(
      screen.getByLabelText("Image file"),
      fakeImageFile("photo.png", "image/png"),
    );
    await screen.findByText("2.0 KB");

    await user.selectOptions(
      screen.getByLabelText("Export format"),
      "image/jpeg",
    );

    expect(await screen.findByText(/transparent areas/i)).toBeInTheDocument();
  });

  it("warns that an animated GIF will be flattened to a single frame", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    // Minimal two-frame GIF so detectAnimation() reports it as animated.
    const gifBytes = Uint8Array.from([
      ...Array.from("GIF89a").map((c) => c.charCodeAt(0)),
      1,
      0,
      1,
      0,
      0,
      0,
      0, // logical screen descriptor, no global color table
      0x2c,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      2,
      1,
      0x41,
      0, // frame 1
      0x2c,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      2,
      1,
      0x41,
      0, // frame 2
      0x3b, // trailer
    ]);
    const gifFile = new File([gifBytes], "clip.gif", { type: "image/gif" });

    await user.upload(screen.getByLabelText("Image file"), gifFile);

    expect(
      await screen.findByText(/appears to be animated/i),
    ).toBeInTheDocument();
  });

  it("exports a cropped image and shows a downloadable result at the requested dimensions", async () => {
    mockCanvasSupport(255, "image/jpeg");
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await screen.findByText("2.0 KB");

    await user.click(
      screen.getByRole("button", { name: "Crop & export image" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Download cropped image" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("512 B")).toBeInTheDocument();
  });

  it("resets everything, including the file input and any result", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCropResizeTool />);

    const input = screen.getByLabelText("Image file") as HTMLInputElement;
    await user.upload(input, fakeImageFile());
    await screen.findByText("2.0 KB");
    await user.click(
      screen.getByRole("button", { name: "Crop & export image" }),
    );
    await waitFor(() =>
      screen.getByRole("button", { name: "Download cropped image" }),
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.queryByRole("button", { name: "Download cropped image" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Crop preset")).not.toBeInTheDocument();
    expect(input.value).toBe("");
  });
});
