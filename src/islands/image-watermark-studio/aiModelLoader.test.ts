import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchModelBytes,
  hasLowDeviceMemory,
  isWebGPUSupported,
  MODEL_URL,
} from "./aiModelLoader";

function makeStreamingResponse(totalBytes: number, chunkSize = 1024): Response {
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunkSize, totalBytes - sent);
      controller.enqueue(new Uint8Array(size));
      sent += size;
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Length": String(totalBytes) },
  });
}

describe("fetchModelBytes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads via fetch and reports progress when nothing is cached", async () => {
    vi.stubGlobal(
      "caches",
      undefined as unknown as CacheStorage, // simulate an environment without Cache Storage
    );
    const totalBytes = 5000;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe(MODEL_URL);
        return makeStreamingResponse(totalBytes);
      }),
    );

    const updates: {
      loadedBytes: number;
      totalBytes: number;
      fromCache: boolean;
    }[] = [];
    const buffer = await fetchModelBytes((p) => updates.push(p));

    expect(buffer.byteLength).toBe(totalBytes);
    expect(updates.length).toBeGreaterThan(1);
    expect(updates[updates.length - 1]).toEqual({
      loadedBytes: totalBytes,
      totalBytes,
      fromCache: false,
    });
    expect(updates.every((u) => !u.fromCache)).toBe(true);
  });

  it("reads from the cache and skips the network when a cached copy exists", async () => {
    const cachedBytes = new Uint8Array(2048);
    const fakeCache = {
      match: vi.fn(async () => new Response(cachedBytes)),
      put: vi.fn(),
    };
    vi.stubGlobal("caches", {
      open: vi.fn(async () => fakeCache),
    } as unknown as CacheStorage);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const updates: { fromCache: boolean }[] = [];
    const buffer = await fetchModelBytes((p) => updates.push(p));

    expect(buffer.byteLength).toBe(cachedBytes.byteLength);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(updates).toHaveLength(1);
    expect(updates[0]?.fromCache).toBe(true);
  });

  it("throws a friendly error when the network request fails", async () => {
    vi.stubGlobal("caches", undefined as unknown as CacheStorage);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    await expect(fetchModelBytes(() => {})).rejects.toThrow(
      /couldn't download/i,
    );
  });
});

describe("isWebGPUSupported", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when navigator.gpu is absent", async () => {
    expect(await isWebGPUSupported()).toBe(false);
  });

  it("returns true when an adapter can be requested", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      gpu: { requestAdapter: vi.fn(async () => ({})) },
    });
    expect(await isWebGPUSupported()).toBe(true);
  });

  it("returns false when requestAdapter resolves to null", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      gpu: { requestAdapter: vi.fn(async () => null) },
    });
    expect(await isWebGPUSupported()).toBe(false);
  });
});

describe("hasLowDeviceMemory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false when deviceMemory is unreported", () => {
    expect(hasLowDeviceMemory()).toBe(false);
  });

  it("is true for a reported low-memory device", () => {
    vi.stubGlobal("navigator", { ...navigator, deviceMemory: 2 });
    expect(hasLowDeviceMemory()).toBe(true);
  });

  it("is false for a reported high-memory device", () => {
    vi.stubGlobal("navigator", { ...navigator, deviceMemory: 8 });
    expect(hasLowDeviceMemory()).toBe(false);
  });
});
