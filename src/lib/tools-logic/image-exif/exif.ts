/**
 * Extracts human-readable EXIF/GPS fields from a JPEG, PNG, or WebP file.
 * Only tags that are actually present are reported — nothing here guesses or
 * fills in a value that wasn't found in the file. Any malformed or truncated
 * TIFF structure degrades to "no metadata found" rather than throwing,
 * since a corrupt EXIF block shouldn't block viewing an otherwise-valid image.
 */
import { findTiffBase } from "./locate";
import {
  readAsciiValue,
  readByteValue,
  readIfd,
  readLongOrShortValue,
  readRationalValue,
  readTiffHeader,
  type Ifd,
} from "./tiff";

const TAG = {
  MAKE: 0x010f,
  MODEL: 0x0110,
  ORIENTATION: 0x0112,
  SOFTWARE: 0x0131,
  DATETIME: 0x0132,
  EXIF_IFD_POINTER: 0x8769,
  GPS_IFD_POINTER: 0x8825,
  EXPOSURE_TIME: 0x829a,
  FNUMBER: 0x829d,
  ISO: 0x8827,
  DATETIME_ORIGINAL: 0x9003,
  FLASH: 0x9209,
  FOCAL_LENGTH: 0x920a,
  COLOR_SPACE: 0xa001,
  LENS_MODEL: 0xa434,
  GPS_LAT_REF: 0x0001,
  GPS_LAT: 0x0002,
  GPS_LON_REF: 0x0003,
  GPS_LON: 0x0004,
  GPS_ALT_REF: 0x0005,
  GPS_ALT: 0x0006,
} as const;

export interface ExifField {
  label: string;
  value: string;
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  mapUrl: string;
}

export interface ExifData {
  camera: ExifField[];
  capture: ExifField[];
  image: ExifField[];
  gps: ExifField[];
  gpsCoordinates: GpsCoordinates | null;
  hasMetadata: boolean;
}

function ascii(view: DataView, ifd: Ifd, tag: number): string | undefined {
  const entry = ifd.entries.get(tag);
  return entry ? readAsciiValue(view, entry) : undefined;
}

function longOrShort(
  view: DataView,
  ifd: Ifd,
  tag: number,
  littleEndian: boolean,
): number | undefined {
  const entry = ifd.entries.get(tag);
  return entry ? readLongOrShortValue(view, entry, littleEndian) : undefined;
}

function rational(
  view: DataView,
  ifd: Ifd,
  tag: number,
  littleEndian: boolean,
  index = 0,
): number | undefined {
  const entry = ifd.entries.get(tag);
  return entry
    ? readRationalValue(view, entry, littleEndian, index)
    : undefined;
}

function formatExifDate(raw: string): string {
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(raw);
  return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}` : raw;
}

function formatExposureTime(seconds: number): string {
  if (seconds <= 0) return `${seconds} s`;
  if (seconds >= 1) return `${Math.round(seconds * 10) / 10} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

function formatFNumber(value: number): string {
  return `f/${Math.round(value * 10) / 10}`;
}

function formatFocalLength(value: number): string {
  return `${Math.round(value * 10) / 10} mm`;
}

const ORIENTATION_LABELS: Record<number, string> = {
  1: "Normal",
  2: "Mirrored horizontally",
  3: "Rotated 180°",
  4: "Mirrored vertically",
  5: "Mirrored horizontally, rotated 90° CCW",
  6: "Rotated 90° CW",
  7: "Mirrored horizontally, rotated 90° CW",
  8: "Rotated 90° CCW",
};

function formatOrientation(value: number): string {
  const label = ORIENTATION_LABELS[value];
  return label ? `${value} — ${label}` : `${value}`;
}

function formatColorSpace(value: number): string {
  if (value === 1) return "sRGB";
  if (value === 0xffff) return "Uncalibrated";
  return `Unknown (${value})`;
}

function formatFlash(value: number): string {
  return (value & 0x1) === 1 ? "Flash fired" : "Flash did not fire";
}

function formatCoordinate(
  decimal: number,
  positive: string,
  negative: string,
): string {
  return `${Math.abs(decimal).toFixed(6)}° ${decimal >= 0 ? positive : negative}`;
}

function readGpsDecimal(
  view: DataView,
  ifd: Ifd,
  refTag: number,
  valueTag: number,
  littleEndian: boolean,
): number | undefined {
  const ref = ascii(view, ifd, refTag);
  const entry = ifd.entries.get(valueTag);
  if (!ref || !entry) return undefined;

  const degrees = readRationalValue(view, entry, littleEndian, 0);
  const minutes = readRationalValue(view, entry, littleEndian, 1);
  const seconds = readRationalValue(view, entry, littleEndian, 2);
  if (degrees === undefined || minutes === undefined || seconds === undefined) {
    return undefined;
  }

  const decimal = degrees + minutes / 60 + seconds / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

export function extractExif(
  bytes: Uint8Array,
  mimeType: string,
  dimensions: { width: number; height: number },
  hasColorProfile: boolean,
): ExifData {
  const camera: ExifField[] = [];
  const capture: ExifField[] = [];
  const image: ExifField[] = [
    {
      label: "Dimensions",
      value: `${dimensions.width} × ${dimensions.height} px`,
    },
  ];
  const gps: ExifField[] = [];
  let gpsCoordinates: GpsCoordinates | null = null;
  let hasMetadata = false;

  try {
    const base = findTiffBase(bytes, mimeType);
    if (base !== null) {
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      const header = readTiffHeader(view, base);

      if (header) {
        const { littleEndian, ifd0Offset } = header;
        const ifd0 = readIfd(view, base, ifd0Offset, littleEndian);

        if (ifd0) {
          const make = ascii(view, ifd0, TAG.MAKE);
          const model = ascii(view, ifd0, TAG.MODEL);
          const software = ascii(view, ifd0, TAG.SOFTWARE);
          const dateTime = ascii(view, ifd0, TAG.DATETIME);
          const orientation = longOrShort(
            view,
            ifd0,
            TAG.ORIENTATION,
            littleEndian,
          );

          if (make) camera.push({ label: "Make", value: make });
          if (model) camera.push({ label: "Model", value: model });
          if (software) camera.push({ label: "Software", value: software });
          if (orientation !== undefined) {
            image.push({
              label: "Orientation",
              value: formatOrientation(orientation),
            });
          }
          if (make || model || software || orientation !== undefined)
            hasMetadata = true;

          const exifPointer = ifd0.entries.get(TAG.EXIF_IFD_POINTER);
          const exifOffset = exifPointer
            ? readLongOrShortValue(view, exifPointer, littleEndian)
            : undefined;
          const exifIfd =
            exifOffset !== undefined
              ? readIfd(view, base, exifOffset, littleEndian)
              : null;

          let dateTimeOriginal: string | undefined;
          if (exifIfd) {
            dateTimeOriginal = ascii(view, exifIfd, TAG.DATETIME_ORIGINAL);
            const lensModel = ascii(view, exifIfd, TAG.LENS_MODEL);
            const exposureTime = rational(
              view,
              exifIfd,
              TAG.EXPOSURE_TIME,
              littleEndian,
            );
            const fNumber = rational(view, exifIfd, TAG.FNUMBER, littleEndian);
            const iso = longOrShort(view, exifIfd, TAG.ISO, littleEndian);
            const focalLength = rational(
              view,
              exifIfd,
              TAG.FOCAL_LENGTH,
              littleEndian,
            );
            const flash = longOrShort(view, exifIfd, TAG.FLASH, littleEndian);
            const colorSpace = longOrShort(
              view,
              exifIfd,
              TAG.COLOR_SPACE,
              littleEndian,
            );

            if (lensModel)
              camera.push({ label: "Lens Model", value: lensModel });
            if (exposureTime !== undefined) {
              capture.push({
                label: "Exposure Time",
                value: formatExposureTime(exposureTime),
              });
            }
            if (fNumber !== undefined) {
              capture.push({
                label: "Aperture",
                value: formatFNumber(fNumber),
              });
            }
            if (iso !== undefined)
              capture.push({ label: "ISO", value: `ISO ${iso}` });
            if (focalLength !== undefined) {
              capture.push({
                label: "Focal Length",
                value: formatFocalLength(focalLength),
              });
            }
            if (flash !== undefined)
              capture.push({ label: "Flash", value: formatFlash(flash) });
            if (colorSpace !== undefined) {
              image.push({
                label: "Color Space",
                value: formatColorSpace(colorSpace),
              });
            }

            if (
              lensModel ||
              exposureTime !== undefined ||
              fNumber !== undefined ||
              iso !== undefined ||
              focalLength !== undefined ||
              flash !== undefined ||
              colorSpace !== undefined ||
              dateTimeOriginal
            ) {
              hasMetadata = true;
            }
          }

          const dateTaken = dateTimeOriginal ?? dateTime;
          if (dateTaken) {
            capture.unshift({
              label: "Date Taken",
              value: formatExifDate(dateTaken),
            });
          }

          const gpsPointer = ifd0.entries.get(TAG.GPS_IFD_POINTER);
          const gpsOffset = gpsPointer
            ? readLongOrShortValue(view, gpsPointer, littleEndian)
            : undefined;
          const gpsIfd =
            gpsOffset !== undefined
              ? readIfd(view, base, gpsOffset, littleEndian)
              : null;

          if (gpsIfd) {
            const latitude = readGpsDecimal(
              view,
              gpsIfd,
              TAG.GPS_LAT_REF,
              TAG.GPS_LAT,
              littleEndian,
            );
            const longitude = readGpsDecimal(
              view,
              gpsIfd,
              TAG.GPS_LON_REF,
              TAG.GPS_LON,
              littleEndian,
            );

            if (latitude !== undefined && longitude !== undefined) {
              gps.push({
                label: "Latitude",
                value: formatCoordinate(latitude, "N", "S"),
              });
              gps.push({
                label: "Longitude",
                value: formatCoordinate(longitude, "E", "W"),
              });

              const altitude = rational(
                view,
                gpsIfd,
                TAG.GPS_ALT,
                littleEndian,
              );
              if (altitude !== undefined) {
                const altRefEntry = gpsIfd.entries.get(TAG.GPS_ALT_REF);
                const altRef = altRefEntry
                  ? readByteValue(view, altRefEntry)
                  : 0;
                gps.push({
                  label: "Altitude",
                  value: `${altitude.toFixed(1)} m ${altRef === 1 ? "below sea level" : "above sea level"}`,
                });
              }

              const lat = Math.round(latitude * 1e6) / 1e6;
              const lon = Math.round(longitude * 1e6) / 1e6;
              gpsCoordinates = {
                latitude: lat,
                longitude: lon,
                mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`,
              };
              hasMetadata = true;
            }
          }
        }
      }
    }
  } catch {
    // A malformed TIFF structure degrades to "no metadata found" below.
  }

  image.push({
    label: "Color Profile",
    value: hasColorProfile ? "Embedded ICC profile detected" : "None detected",
  });

  return { camera, capture, image, gps, gpsCoordinates, hasMetadata };
}
