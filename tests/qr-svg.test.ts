import jsQR from 'jsqr';
import {describe, expect, it} from 'vitest';
import {
  createQrSvg,
  createQrSymbol,
  parseErrorCorrectionLevel,
  QR_SVG_SIZE,
  QUIET_ZONE_MODULES
} from '../src/qr-svg.js';

/** Paints the SVG's module path back into pixels, the way a camera would see it. */
function rasterize(svg: string, scale = 4): {data: Uint8ClampedArray; width: number} {
  const moduleSize = Number(/scale\(([\d.]+)\)/.exec(svg)?.[1]);
  const width = Math.round(QR_SVG_SIZE / moduleSize) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  const path = /<path d="([^"]*)"/.exec(svg)?.[1] ?? '';
  for (const match of path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const column = Number(match[1]);
    const row = Number(match[2]);
    for (let y = 0; y < scale; y += 1) {
      for (let x = 0; x < scale; x += 1) {
        const pixel = (row * scale + y) * width + column * scale + x;
        data[pixel * 4] = 0;
        data[pixel * 4 + 1] = 0;
        data[pixel * 4 + 2] = 0;
      }
    }
  }
  return {data, width};
}

describe('createQrSvg', () => {
  it('reads back the same text, including non-ASCII text', () => {
    for (const text of ['Hello, world!', 'カメラの校正プロファイル', '{"fx":612.3,"fy":611.8}']) {
      const image = rasterize(createQrSvg(text, 'M'));
      expect(jsQR(image.data, image.width, image.width)?.data).toBe(text);
    }
  });

  it('reads back a calibration-profile-sized text at the highest level', () => {
    const text = JSON.stringify({profile: 'x'.repeat(440)});
    const image = rasterize(createQrSvg(text, 'H'));
    expect(jsQR(image.data, image.width, image.width)?.data).toBe(text);
  });

  it('sizes the viewBox, which TurboWarp measures, and keeps a quiet zone', () => {
    const svg = createQrSvg('size', 'L');
    const symbol = createQrSymbol('size', 'L');
    const viewSize = symbol.size + QUIET_ZONE_MODULES * 2;
    expect(svg).toContain(`viewBox="0 0 ${QR_SVG_SIZE} ${QR_SVG_SIZE}"`);
    expect(svg).toContain(`scale(${QR_SVG_SIZE / viewSize})`);
    expect(svg).toContain(`M${QUIET_ZONE_MODULES} ${QUIET_ZONE_MODULES}h1v1h-1z`);
    expect(svg).not.toContain('100%');
  });

  it('grows the symbol with the error correction level', () => {
    const text = 'a'.repeat(100);
    expect(createQrSymbol(text, 'H').version).toBeGreaterThan(createQrSymbol(text, 'L').version);
  });

  it('names the failure without repeating the text', () => {
    const secret = 'secret-'.repeat(1000);
    expect(() => createQrSvg(secret, 'H')).toThrow(
      expect.objectContaining({code: 'text-too-long', message: expect.not.stringContaining('secret')})
    );
    expect(() => createQrSvg('', 'M')).toThrow(expect.objectContaining({code: 'empty-text'}));
  });

  it('accepts the four levels in either case', () => {
    expect(parseErrorCorrectionLevel(' h ')).toBe('H');
    expect(parseErrorCorrectionLevel('q')).toBe('Q');
    expect(() => parseErrorCorrectionLevel('X')).toThrow(
      expect.objectContaining({code: 'invalid-level'})
    );
  });
});
