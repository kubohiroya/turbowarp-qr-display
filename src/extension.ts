import definitions from './block-definitions.json';
import {extensionConfig} from './config';
import {QrDisplayError} from './errors.js';
import {
  createQrSvg,
  createQrSymbol,
  layoutQr,
  parseErrorCorrectionLevel,
  type QrErrorCorrectionLevel,
  type QrSvgOptions
} from './qr-svg.js';
import {SpriteSkinDisplay} from './sprite-display.js';

type BlockTypeName = 'COMMAND' | 'REPORTER' | 'BOOLEAN';
type ArgumentTypeName = 'STRING' | 'NUMBER';

interface DefinitionArgument {
  type: ArgumentTypeName;
  defaultValue: string;
  menu?: string;
}

interface BlockDefinition {
  opcode: string;
  blockType: BlockTypeName;
  text: string;
  description: string;
  arguments: Record<string, DefinitionArgument>;
}

interface MenuDefinition {
  acceptReporters: boolean;
  items: string[];
}

const blockDefinitions = definitions.blocks as readonly BlockDefinition[];
const menuDefinitions = definitions.menus as Record<string, MenuDefinition>;

/**
 * Block facade and runtime capability.
 *
 * Other unsandboxed extensions reach the same display through
 * `Scratch.vm.runtime.ext_kubohiroyaqrdisplay`, so a QR they show is restored
 * by the same stop and removal handling as one shown by a block.
 */
export class QrDisplayExtension implements TurboWarpExtension {
  private readonly runtime: TurboWarpRuntime;
  private readonly display: SpriteSkinDisplay;
  private lastError = '';
  /** The side of the code each sprite shows, for the size reporter. */
  private readonly sides = new WeakMap<TurboWarpTarget, number>();

  /** The stop sign and the green flag both stop all, which ends every display. */
  private readonly stopListener = (): void => this.display.hideAll();
  private readonly disposeListener = (): void => this.dispose();
  private readonly targetRemovedListener = (target: unknown): void => {
    if (typeof target === 'object' && target !== null) this.display.hide(target as TurboWarpTarget);
  };

  public constructor(runtime: TurboWarpRuntime = Scratch.vm?.runtime ?? {}) {
    this.runtime = runtime;
    this.display = new SpriteSkinDisplay(runtime);
    runtime.on?.('PROJECT_STOP_ALL', this.stopListener);
    runtime.on?.('PROJECT_LOADED', this.stopListener);
    runtime.on?.('targetWasRemoved', this.targetRemovedListener);
    runtime.on?.('RUNTIME_DISPOSED', this.disposeListener);
    runtime[`ext_${extensionConfig.id}`] = this;
  }

  public getInfo(): Record<string, unknown> {
    return {
      id: extensionConfig.id,
      name: Scratch.translate(definitions.extensionName),
      blocks: blockDefinitions.map((block) => this.toScratchBlock(block)),
      menus: Object.fromEntries(
        Object.entries(menuDefinitions).map(([id, menu]) => [
          id,
          {acceptReporters: menu.acceptReporters, items: menu.items}
        ])
      )
    };
  }

  // --- Blocks --------------------------------------------------------------

  public showQrCode(args: {TEXT: unknown; LEVEL: unknown}, util?: TurboWarpBlockUtility): void {
    try {
      this.show(util?.target, Scratch.Cast.toString(args.TEXT), parseErrorCorrectionLevel(args.LEVEL));
      this.lastError = '';
    } catch (error) {
      this.lastError = error instanceof QrDisplayError ? error.code : 'renderer-unavailable';
      throw error;
    }
  }

  public showQrCodeWithin(
    args: {TEXT: unknown; LEVEL: unknown; SIZE: unknown},
    util?: TurboWarpBlockUtility
  ): void {
    try {
      this.show(util?.target, Scratch.Cast.toString(args.TEXT), parseErrorCorrectionLevel(args.LEVEL), {
        maxSize: Scratch.Cast.toNumber(args.SIZE)
      });
      this.lastError = '';
    } catch (error) {
      this.lastError = error instanceof QrDisplayError ? error.code : 'renderer-unavailable';
      throw error;
    }
  }

  public qrCodeSize(_args: unknown, util?: TurboWarpBlockUtility): number {
    const target = util?.target;
    return target && this.isShowing(target) ? (this.sides.get(target) ?? 0) : 0;
  }

  public hideQrCode(_args: unknown, util?: TurboWarpBlockUtility): void {
    this.hide(util?.target);
  }

  public isShowingQrCode(_args: unknown, util?: TurboWarpBlockUtility): boolean {
    return this.isShowing(util?.target);
  }

  public lastQrCodeError(): string {
    return this.lastError;
  }

  // --- Runtime capability --------------------------------------------------

  public createQrSvg(
    text: string,
    level: QrErrorCorrectionLevel = 'M',
    options: QrSvgOptions = {}
  ): string {
    return createQrSvg(text, level, options);
  }

  /** The module size and side a text would be drawn at, without drawing it. */
  public qrLayout(text: string, level: QrErrorCorrectionLevel = 'M', options: QrSvgOptions = {}) {
    return layoutQr(createQrSymbol(text, level), options);
  }

  public show(
    target: TurboWarpTarget | undefined,
    text: string,
    level: QrErrorCorrectionLevel = 'M',
    options: QrSvgOptions = {}
  ): void {
    const shown = this.display.validateTarget(target);
    const svg = createQrSvg(text, level, options);
    const {side} = layoutQr(createQrSymbol(text, level), options);
    // An even centre, whatever the side, so where the edges land depends
    // only on where the sprite is. Read back from TurboWarp's stage with jsQR,
    // codes of 400 to 1100 bytes at two or three units per module decoded at
    // pixel ratios 1, 1.25, 1.5, 1.75, 2, 2.5 and 3 when the sprite stood on
    // odd x and y; with the middle as the centre, which half the sizes put on
    // an odd unit, some decoded at 1.5 and 2.5 and some did not.
    const centre = 2 * Math.floor(side / 4);
    this.display.show(shown, svg, [centre, centre]);
    this.sides.set(shown, side);
  }

  public hide(target: TurboWarpTarget | undefined): void {
    this.display.hide(target);
  }

  public isShowing(target: TurboWarpTarget | undefined): boolean {
    return this.display.isShowing(target);
  }

  public dispose(): void {
    this.display.hideAll();
    this.runtime.off?.('PROJECT_STOP_ALL', this.stopListener);
    this.runtime.off?.('PROJECT_LOADED', this.stopListener);
    this.runtime.off?.('targetWasRemoved', this.targetRemovedListener);
    this.runtime.off?.('RUNTIME_DISPOSED', this.disposeListener);
  }

  private toScratchBlock(block: BlockDefinition): Record<string, unknown> {
    return {
      opcode: block.opcode,
      blockType: Scratch.BlockType[block.blockType],
      text: Scratch.translate(block.text),
      arguments: Object.fromEntries(
        Object.entries(block.arguments).map(([name, argument]) => [
          name,
          {
            type: Scratch.ArgumentType[argument.type],
            defaultValue: argument.defaultValue,
            ...(argument.menu === undefined ? {} : {menu: argument.menu})
          }
        ])
      )
    };
  }
}
