import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {QrDisplayExtension} from '../src/extension.js';

type Listener = (...args: unknown[]) => void;

interface Stage {
  centres: Map<number, [number, number] | undefined>;
  runtime: TurboWarpRuntime;
  sprite: TurboWarpTarget;
  drawableSkins: Map<number, number>;
  skins: Map<number, string>;
  emit(event: string, ...args: unknown[]): void;
  listeners: Map<string, Set<Listener>>;
}

const DRAWABLE = 3;
const COSTUME_SKINS = [7, 8];

function createStage(): Stage {
  const skins = new Map<number, string>();
  const drawableSkins = new Map<number, number>([[DRAWABLE, COSTUME_SKINS[0] as number]]);
  const listeners = new Map<string, Set<Listener>>();
  const centres = new Map<number, [number, number] | undefined>();
  let nextSkinId = 100;
  const drawables: Array<{_skin?: {_id?: number}} | undefined> = [];
  drawables[DRAWABLE] = {
    get _skin() {
      return {_id: drawableSkins.get(DRAWABLE) as number};
    }
  };
  const renderer: TurboWarpRenderer = {
    createSVGSkin: (svg, rotationCenter) => {
      const id = nextSkinId++;
      skins.set(id, svg);
      centres.set(id, rotationCenter);
      return id;
    },
    destroySkin: (id) => {
      skins.delete(id);
    },
    updateDrawableSkinId: (drawable, skinId) => {
      drawableSkins.set(drawable, skinId);
    },
    _allDrawables: drawables
  };
  const sprite: TurboWarpTarget = {
    drawableID: DRAWABLE,
    isStage: false,
    isOriginal: true,
    currentCostume: 0,
    getCostumes: () => COSTUME_SKINS.map((skinId) => ({skinId}))
  };
  const runtime: TurboWarpRuntime = {
    renderer,
    targets: [sprite],
    requestRedraw: vi.fn(),
    on: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    },
    off: (event, listener) => {
      listeners.get(event)?.delete(listener);
    }
  };
  return {
    runtime,
    sprite,
    drawableSkins,
    skins,
    centres,
    listeners,
    emit: (event, ...args) => {
      for (const listener of listeners.get(event) ?? []) listener(...args);
    }
  };
}

beforeEach(() => {
  vi.stubGlobal('Scratch', {
    extensions: {unsandboxed: true, register: vi.fn()},
    BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', HAT: 'hat'},
    ArgumentType: {STRING: 'string', NUMBER: 'number', BOOLEAN: 'Boolean'},
    Cast: {toString: String, toNumber: Number},
    translate: (value: string) => value
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QrDisplayExtension', () => {
  it('publishes its blocks, the level menu and a runtime capability', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    expect(stage.runtime.ext_kubohiroyaqrdisplay).toBe(extension);
    const info = extension.getInfo() as {
      id: string;
      blocks: Array<{opcode: string; arguments: Record<string, {menu?: string}>}>;
      menus: Record<string, {items: string[]}>;
    };
    expect(info.id).toBe('kubohiroyaqrdisplay');
    expect(info.blocks.map((block) => block.opcode)).toEqual([
      'showQrCode',
      'showQrCodeWithin',
      'qrCodeSize',
      'hideQrCode',
      'isShowingQrCode',
      'lastQrCodeError'
    ]);
    expect(info.blocks[0]?.arguments.LEVEL?.menu).toBe('errorCorrectionLevels');
    expect(info.menus.errorCorrectionLevels?.items).toEqual(['L', 'M', 'Q', 'H']);
  });

  it('shows the QR in place of the costume and puts the costume back', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const util = {target: stage.sprite};

    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, util);
    const qrSkin = stage.drawableSkins.get(DRAWABLE) as number;
    expect(qrSkin).not.toBe(COSTUME_SKINS[0]);
    expect(stage.skins.get(qrSkin)).toContain('<svg');
    expect(extension.isShowingQrCode({}, util)).toBe(true);

    extension.hideQrCode({}, util);
    expect(stage.drawableSkins.get(DRAWABLE)).toBe(COSTUME_SKINS[0]);
    expect(stage.skins.has(qrSkin)).toBe(false);
    expect(extension.isShowingQrCode({}, util)).toBe(false);
  });

  it('fits the code within a size and reports the size it came out at', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const util = {target: stage.sprite};
    expect(extension.qrCodeSize({}, util)).toBe(0);
    const text = JSON.stringify({profile: 'x'.repeat(640)});
    extension.showQrCodeWithin({TEXT: text, LEVEL: 'L', SIZE: '253'}, util);
    const layout = extension.qrLayout(text, 'L', {maxSize: 253});
    expect(extension.qrCodeSize({}, util)).toBe(layout.side);
    expect(layout.side).toBeLessThanOrEqual(253);
    const svg = stage.skins.get(stage.drawableSkins.get(DRAWABLE) as number);
    expect(svg).toContain(`viewBox="0 0 ${layout.side} ${layout.side}"`);
    // Centred on an even unit whatever the side, so the edges' position
    // depends only on the sprite's.
    const centre = stage.centres.get(stage.drawableSkins.get(DRAWABLE) as number);
    const even = 2 * Math.floor(layout.side / 4);
    expect(centre).toEqual([even, even]);
    extension.hideQrCode({}, util);
    expect(extension.qrCodeSize({}, util)).toBe(0);
    expect(() => extension.showQrCodeWithin({TEXT: text, LEVEL: 'L', SIZE: '0'}, util)).toThrow();
    expect(extension.lastQrCodeError()).toBe('invalid-size');
  });

  it('replaces one QR with the next without leaking skins', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const util = {target: stage.sprite};
    extension.showQrCode({TEXT: 'one', LEVEL: 'L'}, util);
    extension.showQrCode({TEXT: 'two', LEVEL: 'H'}, util);
    expect(stage.skins.size).toBe(1);
    extension.hideQrCode({}, util);
    expect(stage.skins.size).toBe(0);
    expect(stage.drawableSkins.get(DRAWABLE)).toBe(COSTUME_SKINS[0]);
  });

  it('restores the costume the sprite wears when the QR ends', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const util = {target: stage.sprite};
    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, util);
    stage.sprite.currentCostume = 1;
    extension.hideQrCode({}, util);
    expect(stage.drawableSkins.get(DRAWABLE)).toBe(COSTUME_SKINS[1]);
  });

  it('reports a costume switch as the end of the QR', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const util = {target: stage.sprite};
    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, util);
    stage.drawableSkins.set(DRAWABLE, COSTUME_SKINS[1] as number);
    expect(extension.isShowingQrCode({}, util)).toBe(false);
  });

  it.each(['PROJECT_STOP_ALL', 'PROJECT_LOADED'])('ends every QR on %s', (event) => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, {target: stage.sprite});
    stage.emit(event);
    expect(stage.drawableSkins.get(DRAWABLE)).toBe(COSTUME_SKINS[0]);
    expect(stage.skins.size).toBe(0);
  });

  it('keeps the QR up when a script merely finishes', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, {target: stage.sprite});
    stage.emit('PROJECT_RUN_STOP');
    expect(extension.isShowingQrCode({}, {target: stage.sprite})).toBe(true);
  });

  it('drops the skin of a removed sprite without touching its drawable', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, {target: stage.sprite});
    const qrSkin = stage.drawableSkins.get(DRAWABLE);
    stage.runtime.targets = [];
    stage.emit('targetWasRemoved', stage.sprite);
    expect(stage.skins.size).toBe(0);
    expect(stage.drawableSkins.get(DRAWABLE)).toBe(qrSkin);
  });

  it('ends displays and listeners when the runtime is disposed', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    extension.showQrCode({TEXT: 'hello', LEVEL: 'M'}, {target: stage.sprite});
    stage.emit('RUNTIME_DISPOSED');
    expect(stage.skins.size).toBe(0);
    for (const listeners of stage.listeners.values()) expect(listeners.size).toBe(0);
  });

  it('reports why a show failed and clears it on success', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const util = {target: stage.sprite};
    expect(() => extension.showQrCode({TEXT: 'x'.repeat(4000), LEVEL: 'H'}, util)).toThrow();
    expect(extension.lastQrCodeError()).toBe('text-too-long');
    expect(stage.drawableSkins.get(DRAWABLE)).toBe(COSTUME_SKINS[0]);
    expect(() => extension.showQrCode({TEXT: 'x', LEVEL: 'M'}, {target: {isStage: true}})).toThrow();
    expect(extension.lastQrCodeError()).toBe('invalid-target');
    extension.showQrCode({TEXT: 'x', LEVEL: 'M'}, util);
    expect(extension.lastQrCodeError()).toBe('');
  });

  it('refuses clones', () => {
    const stage = createStage();
    const extension = new QrDisplayExtension(stage.runtime);
    const clone = {...stage.sprite, isOriginal: false};
    expect(() => extension.show(clone, 'x')).toThrow(expect.objectContaining({code: 'invalid-target'}));
  });
});
