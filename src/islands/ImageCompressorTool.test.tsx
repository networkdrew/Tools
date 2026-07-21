import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageCompressorTool from "./ImageCompressorTool";

function fakeImageFile(
  name = "photo.png",
  type = "image/png",
  size = 2048,
): File {
  return new File([new Uint8Array(size)], name, { type });
}

/**
 * jsdom implements neither createImageBitmap nor a 2D canvas context, so the
 * "real browser" path has to be stubbed to exercise compression. Tests that
 * don't call this rely on that same absence to verify the graceful fallback.
 */
function mockCanvasSupport() {
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
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) =>
      callback(new Blob([new Uint8Array(512)], { type: "image/jpeg" })),
  );
}

describe("ImageCompressorTool", () => {
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

  it("compresses a selected image and shows a downloadable result", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCompressorTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    expect(await screen.findByText("2.0 KB")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compress image" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Download compressed image" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/smaller/)).toBeInTheDocument();
  });

  it("shows an error for a non-image file", async () => {
    render(<ImageCompressorTool />);

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
    render(<ImageCompressorTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't read that image/i,
    );
  });

  it("clears the selected file and results on Reset", async () => {
    mockCanvasSupport();
    const user = userEvent.setup();
    render(<ImageCompressorTool />);

    const input = screen.getByLabelText("Image file") as HTMLInputElement;
    await user.upload(input, fakeImageFile());
    await user.click(screen.getByRole("button", { name: "Compress image" }));
    await waitFor(() =>
      screen.getByRole("button", { name: "Download compressed image" }),
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.queryByRole("button", { name: "Download compressed image" }),
    ).not.toBeInTheDocument();
    expect(input.value).toBe("");
  });
});
