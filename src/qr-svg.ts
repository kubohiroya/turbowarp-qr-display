import QRCode from 'qrcode';
import {QrDisplayError} from './errors.js';

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export const QR_ERROR_CORRECTION_LEVELS: readonly QrErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];

/** White border the QR specification asks for, in modules. */
export const QUIET_ZONE_MODULES = 4;

/**
 * Width and height of the SVG in stage units.
 *
 * TurboWarp sizes an SVG skin by its viewBox, so the viewBox is this size and
 * the modules are scaled into it. A fixed size keeps every QR the same size on
 * stage whatever it holds, and the sprite's size block scales it from there.
 */
export const QR_SVG_SIZE = 320;

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

export function createQrSvg(text: string, level: QrErrorCorrectionLevel = 'M'): string {
  const symbol = createQrSymbol(text, level);
  const viewSize = symbol.size + QUIET_ZONE_MODULES * 2;
  const commands: string[] = [];
  for (let row = 0; row < symbol.size; row += 1) {
    for (let column = 0; column < symbol.size; column += 1) {
      if (symbol.isDark(row, column)) {
        commands.push(`M${column + QUIET_ZONE_MODULES} ${row + QUIET_ZONE_MODULES}h1v1h-1z`);
      }
    }
  }
  const scale = QR_SVG_SIZE / viewSize;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SVG_SIZE}" height="${QR_SVG_SIZE}" ` +
    `viewBox="0 0 ${QR_SVG_SIZE} ${QR_SVG_SIZE}" shape-rendering="crispEdges">` +
    `<rect width="${QR_SVG_SIZE}" height="${QR_SVG_SIZE}" fill="#fff"/>` +
    `<g transform="scale(${scale})"><path d="${commands.join('')}" fill="#000"/></g></svg>`
  );
}
