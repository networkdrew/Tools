import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageFormatConverterTool from "./ImageFormatConverterTool";

function fakeImageFile(
  name = "photo.png",
  type = "image/png",
  size = 2048,
): File {
  return new File([new Uint8Array(size)], name, { type });
}

/**
 * jsdom implements neither createImageBitmap nor a 2D canvas context, so the
 * "real browser" path has to be stubbed to exercise conversion. `alphaByte`
 * controls what detectTransparency() reads back, letting tests toggle the
 * transparency warning.
 */
function mockCanvasSupport(alphaByte = 255, outputBlobType = "image/jpeg") {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(
      async () =>
        ({ width: 800, height: 600, close: vi.fn() }) as unknown as ImageBitmap,
    ),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([0, 0, 0, alphaByte]),
    })),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) =>
      callback(new Blob([new Uint8Array(512)], { type: outputBlobType })),
  );
}

describe("ImageFormatConverterTool", () => {
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

  it("converts a selected image and shows a downloadable result", async () => {
    mockCanvasSupport(255, "image/jpeg");
    const user = userEvent.setup();
    render(<ImageFormatConverterTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    expect(await screen.findByText("2.0 KB")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Convert to"), "image/jpeg");
    await user.click(screen.getByRole("button", { name: "Convert image" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Download converted image" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("512 B")).toBeInTheDocument();
  });

  it("shows an error for an unsupported file type", async () => {
    render(<ImageFormatConverterTool />);

    // fireEvent bypasses the input's `accept` filtering that userEvent.upload
    // applies, so this exercises validateImageFile's own type check directly
    // (a user can still pick a non-matching file via "All files" in the
    // native OS picker, so the check matters beyond what `accept` blocks).
    const svgFile = new File(["<svg></svg>"], "icon.svg", {
      type: "image/svg+xml",
    });
    fireEvent.change(screen.getByLabelText("Image file"), {
      target: { files: [svgFile] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /isn't supported here/i,
    );
  });

  it("surfaces a friendly error instead of crashing when image decoding is unavailable", async () => {
    // No mockCanvasSupport() here — jsdom's real lack of createImageBitmap
    // exercises the same fallback a browser without it would hit.
    const user = userEvent.setup();
    render(<ImageFormatConverterTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't read that image/i,
    );
  });

  it("warns before converting a transparent image to JPEG", async () => {
    mockCanvasSupport(128, "image/jpeg"); // non-opaque alpha byte
    const user = userEvent.setup();
    render(<ImageFormatConverterTool />);

    await user.upload(
      screen.getByLabelText("Image file"),
      fakeImageFile("photo.png", "image/png"),
    );
    await user.selectOptions(screen.getByLabelText("Convert to"), "image/jpeg");

    expect(await screen.findByText(/transparent areas/i)).toBeInTheDocument();

    // Switching to a format that keeps alpha should clear the warning.
    await user.selectOptions(screen.getByLabelText("Convert to"), "image/webp");
    expect(screen.queryByText(/transparent areas/i)).not.toBeInTheDocument();
  });

  it("warns that an animated GIF will be flattened to a single frame", async () => {
    mockCanvasSupport(255, "image/png");
    const user = userEvent.setup();
    render(<ImageFormatConverterTool />);

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

  it("clears the selected file and results on Reset", async () => {
    mockCanvasSupport(255, "image/jpeg");
    const user = userEvent.setup();
    render(<ImageFormatConverterTool />);

    const input = screen.getByLabelText("Image file") as HTMLInputElement;
    await user.upload(input, fakeImageFile());
    await user.click(screen.getByRole("button", { name: "Convert image" }));
    await waitFor(() =>
      screen.getByRole("button", { name: "Download converted image" }),
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.queryByRole("button", { name: "Download converted image" }),
    ).not.toBeInTheDocument();
    expect(input.value).toBe("");
  });
});
