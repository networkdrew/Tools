import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageExifViewerTool from "./ImageExifViewerTool";

function fakeImageFile(
  name = "photo.jpg",
  type = "image/jpeg",
  bytes = new Uint8Array(2048),
): File {
  return new File([bytes], name, { type });
}

function mockDecode(width = 800, height = 600) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(
      async () => ({ width, height, close: vi.fn() }) as unknown as ImageBitmap,
    ),
  );
}

describe("ImageExifViewerTool", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a clear message when no EXIF metadata is found", async () => {
    mockDecode();
    const user = userEvent.setup();
    render(<ImageExifViewerTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    expect(
      await screen.findByText(/no exif metadata was found/i),
    ).toBeInTheDocument();
    expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
    expect(screen.getByText("None detected")).toBeInTheDocument();
  });

  it("shows an error for an unsupported file type", async () => {
    render(<ImageExifViewerTool />);

    const bmpFile = new File([new Uint8Array(16)], "photo.bmp", {
      type: "image/bmp",
    });
    // fireEvent bypasses the input's `accept` filtering that userEvent.upload
    // applies, so this exercises validateImageFile's own type check directly.
    fireEvent.change(screen.getByLabelText("Image file"), {
      target: { files: [bmpFile] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /JPEG, PNG, or WebP/i,
    );
  });

  it("surfaces a friendly error instead of crashing when image decoding is unavailable", async () => {
    // No mockDecode() here — jsdom's real lack of createImageBitmap exercises
    // the same fallback a browser without it would hit.
    const user = userEvent.setup();
    render(<ImageExifViewerTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't read that image/i,
    );
  });

  it("parses and displays camera metadata from a JPEG with an EXIF block", async () => {
    mockDecode(4032, 3024);
    const user = userEvent.setup();
    render(<ImageExifViewerTool />);

    // Minimal JPEG: SOI + APP1 "Exif\0\0" + a tiny valid TIFF (IFD0 with one
    // ASCII Make tag "Canon") + SOS.
    const tiff = [
      0x49,
      0x49,
      42,
      0,
      8,
      0,
      0,
      0, // header, IFD0 at offset 8
      1,
      0, // one entry
      0x0f,
      0x01, // tag 0x010f (Make)
      2,
      0, // type ASCII
      6,
      0,
      0,
      0, // count 6 ("Canon\0")
      26,
      0,
      0,
      0, // out-of-line offset (right after this IFD)
      0,
      0,
      0,
      0, // next IFD offset
      67,
      97,
      110,
      111,
      110,
      0, // "Canon\0"
    ];
    const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    const length = payload.length + 2;
    const jpegBytes = Uint8Array.from([
      0xff,
      0xd8,
      0xff,
      0xe1,
      (length >> 8) & 0xff,
      length & 0xff,
      ...payload,
      0xff,
      0xda,
    ]);

    await user.upload(
      screen.getByLabelText("Image file"),
      fakeImageFile("photo.jpg", "image/jpeg", jpegBytes),
    );

    expect(await screen.findByText("Canon")).toBeInTheDocument();
    expect(screen.getByText("Make")).toBeInTheDocument();
    expect(
      screen.queryByText(/no exif metadata was found/i),
    ).not.toBeInTheDocument();
  });

  it("copies all metadata as text", async () => {
    mockDecode();
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ImageExifViewerTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());
    await waitFor(() =>
      screen.getByRole("button", { name: "Copy all metadata" }),
    );

    await user.click(screen.getByRole("button", { name: "Copy all metadata" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Dimensions"),
    );
  });

  it("clears the selection and results on Reset", async () => {
    mockDecode();
    const user = userEvent.setup();
    render(<ImageExifViewerTool />);

    const input = screen.getByLabelText("Image file") as HTMLInputElement;
    await user.upload(input, fakeImageFile());
    await waitFor(() => screen.getByRole("button", { name: "Reset" }));

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.queryByRole("button", { name: "Copy all metadata" }),
    ).not.toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("links to the Image Metadata Remover tool", async () => {
    mockDecode();
    const user = userEvent.setup();
    render(<ImageExifViewerTool />);

    await user.upload(screen.getByLabelText("Image file"), fakeImageFile());

    const link = await screen.findByRole("link", {
      name: "Open the Image Metadata Remover",
    });
    expect(link).toHaveAttribute("href", "/tools/image-metadata-remover/");
  });
});
