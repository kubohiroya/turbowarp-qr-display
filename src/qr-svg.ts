import QRCode from 'qrcode';
import {QrDisplayError} from './errors.js';

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export const QR_ERROR_CORRECTION_LEVELS: readonly QrErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];

/** White border the QR specification asks for, in modules. */
export const QUIET_ZONE_MODULES = 4;

/**
 * The largest the code is drawn, in stage units, unless the caller asks for
 * another limit. The sprite's size block scales it from there.
 */
export const QR_SVG_SIZE = 320;

/** How a code is laid out on stage. */
export interface QrLayout {
  /** Stage units per module. Always a whole number. */
  moduleSize: number;
  /** Modules per side, including the quiet zone. */
  modules: number;
  /** Width and height in stage units: `modules * moduleSize`. */
  side: number;
}

export interface QrSvgOptions {
  /**
   * The largest side allowed, in stage units. The module size is the largest
   * whole number that keeps the code within it. Defaults to `QR_SVG_SIZE`.
   */
  maxSize?: number;
}

export interface QrSymbol {
  /** QR version, 1 to 40. */
  version: number;
  /** Modules per side, without the quiet zone. */
  size: number;
  isDark(row: number, column: number): boolean;
}

export function parseErrorCorrectionLevel(value: unknown): QrErrorCorrectionLevel {
  const level = String(value ?? '').trim().toUpperCase();
  if ((QR_ERROR_CORRECTION_LEVELS as readonly string[]).includes(level)) {
    return level as QrErrorCorrectionLevel;
  }
  throw new QrDisplayError('invalid-level', 'Error correction level must be L, M, Q or H.');
}

/** Encodes text as UTF-8 bytes, so any language reads back unchanged. */
export function createQrSymbol(text: string, level: QrErrorCorrectionLevel = 'M'): QrSymbol {
  if (text === '') throw new QrDisplayError('empty-text', 'There is no text to encode.');
  let qr: ReturnType<typeof QRCode.create>;
  try {
    qr = QRCode.create([{data: new TextEncoder().encode(text), mode: 'byte'}], {
      errorCorrectionLevel: level
    });
  } catch (error) {
    throw new QrDisplayError(
      'text-too-long',
      `The text does not fit in one QR code at error correction level ${level}.`,
      {cause: error}
    );
  }
  return {
    version: qr.version,
    size: qr.modules.size,
    isDark: (row, column) => Boolean(qr.modules.get(row, column))
  };
}

/**
 * Lays a symbol out with a whole number of stage units per module.
 *
 * TurboWarp sizes an SVG skin by its viewBox and rasterizes it at power-of-two
 * scales. A code scaled into a fixed size has modules a fraction of a unit
 * wide, and every rasterization then rounds some modules down and others up:
 * the grid comes out uneven, and whether a reader decodes it changes with the
 * size and the screen's pixel ratio. Read back from TurboWarp's stage with
 * jsQR, a 698-byte profile drawn at 79% of a 320-unit code decoded at some
 * pixel ratios and not others; drawn at two whole units per module it decoded
 * at 1, 1.5, 2, 2.5 and 3. The price is size: the side is a multiple of the
 * module count, so it can come out smaller than the limit.
 */
export function layoutQr(symbol: QrSymbol, options: QrSvgOptions = {}): QrLayout {
  const maxSize = options.maxSize ?? QR_SVG_SIZE;
  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    throw new QrDisplayError('invalid-size', 'The QR code size must be a positive number of stage units.');
  }
  const modules = symbol.size + QUIET_ZONE_MODULES * 2;
  const moduleSize = Math.max(1, Math.floor(maxSize / modules));
  return {moduleSize, modules, side: modules * moduleSize};
}

export function createQrSvg(
  text: string,
  level: QrErrorCorrectionLevel = 'M',
  options: QrSvgOptions = {}
): string {
  const symbol = createQrSymbol(text, level);
  const {moduleSize: unit, side} = layoutQr(symbol, options);
  const commands: string[] = [];
  for (let row = 0; row < symbol.size; row += 1) {
    for (let column = 0; column < symbol.size; column += 1) {
      if (symbol.isDark(row, column)) {
        const x = (column + QUIET_ZONE_MODULES) * unit;
        const y = (row + QUIET_ZONE_MODULES) * unit;
        commands.push(`M${x} ${y}h${unit}v${unit}h-${unit}z`);
      }
    }
  }
  // Width and height equal to the viewBox, so a renderer that reads either
  // gets the same size, and every coordinate is a whole number.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" ` +
    `viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">` +
    `<rect width="${side}" height="${side}" fill="#fff"/>` +
    `<path d="${commands.join('')}" fill="#000"/></svg>`
  );
}
