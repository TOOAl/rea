import type { DecodedPng } from "./PngVisualDiffCore.js";

const parseHeader = (data: Buffer) => {
  if (data.byteLength !== 13) throw new TypeError("Invalid PNG header");
  const width = data.readUInt32BE(0);
  const height = data.readUInt32BE(4);
  const bitDepth = data[8] ?? 0;
  const colorType = data[9] ?? -1;
  const validDepth =
    (colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth)) ||
    (colorType === 2 && [8, 16].includes(bitDepth)) ||
    (colorType === 3 && [1, 2, 4, 8].includes(bitDepth)) ||
    (colorType === 4 && [8, 16].includes(bitDepth)) ||
    (colorType === 6 && [8, 16].includes(bitDepth));
  if (
    width === 0 ||
    height === 0 ||
    width > 0x7fffffff ||
    height > 0x7fffffff ||
    !validDepth ||
    data[10] !== 0 ||
    data[11] !== 0 ||
    (data[12] !== 0 && data[12] !== 1)
  )
    throw new TypeError("Invalid PNG header");
  return {
    width,
    height,
    colorType,
    bitDepth,
    interlace: data[12],
    channels: colorType === 6 ? 4 : 3,
    supported:
      bitDepth === 8 && (colorType === 2 || colorType === 6) && data[12] === 0,
  };
};

const unfilter = (
  raw: Buffer,
  width: number,
  height: number,
  channels: number,
): Buffer => {
  const rowBytes = width * channels;
  const decoded = Buffer.alloc(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (rowBytes + 1);
    const outputOffset = row * rowBytes;
    const filter = raw[rawOffset];
    if (filter === undefined || filter > 4)
      throw new TypeError("Unsupported PNG filter");
    for (let column = 0; column < rowBytes; column += 1) {
      const source = raw[rawOffset + 1 + column] ?? 0;
      const left =
        column >= channels
          ? (decoded[outputOffset + column - channels] ?? 0)
          : 0;
      const above =
        row > 0 ? (decoded[outputOffset + column - rowBytes] ?? 0) : 0;
      const upperLeft =
        row > 0 && column >= channels
          ? (decoded[outputOffset + column - rowBytes - channels] ?? 0)
          : 0;
      decoded[outputOffset + column] = applyFilter({
        filter,
        source,
        left,
        above,
        upperLeft,
      });
    }
  }
  return decoded;
};

const expandRgba = (
  decoded: Buffer,
  channels: number,
  transparentColor: readonly number[] | undefined,
): Buffer => {
  if (channels === 4) return decoded;
  const rgba = Buffer.alloc((decoded.length / channels) * 4);
  for (
    let source = 0, target = 0;
    source < decoded.length;
    source += 3, target += 4
  ) {
    rgba[target] = decoded[source] ?? 0;
    rgba[target + 1] = decoded[source + 1] ?? 0;
    rgba[target + 2] = decoded[source + 2] ?? 0;
    // PNG tRNS keys are 16-bit values; values above 255 cannot match 8-bit samples.
    rgba[target + 3] =
      transparentColor !== undefined &&
      transparentColor.every(
        (value, channel) => decoded[source + channel] === value,
      )
        ? 0
        : 255;
  }
  return rgba;
};

interface ApplyFilterOptions {
  readonly filter: number;
  readonly source: number;
  readonly left: number;
  readonly above: number;
  readonly upperLeft: number;
}

const applyFilter = (options: ApplyFilterOptions): number => {
  const { filter, source, left, above, upperLeft } = options;
  switch (filter) {
    case 0:
      return source;
    case 1:
      return (source + left) & 0xff;
    case 2:
      return (source + above) & 0xff;
    case 3:
      return (source + Math.floor((left + above) / 2)) & 0xff;
    case 4:
      return (source + paeth(left, above, upperLeft)) & 0xff;
    default:
      throw new TypeError("Unsupported PNG filter");
  }
};

const paeth = (left: number, above: number, upperLeft: number): number => {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
    ? left
    : aboveDistance <= upperLeftDistance
      ? above
      : upperLeft;
};

const dimensions = ({ width, height }: DecodedPng) => ({ width, height });

const limitations = (): string[] => [
  "Pixel comparison does not perform OCR, semantic layout analysis, or perceptual color correction.",
  "Only non-interlaced 8-bit RGB and RGBA PNG screenshots are accepted.",
  "PNG tRNS transparency is accepted only as a six-byte RGB color key; tRNS on RGBA or with another length is rejected.",
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
