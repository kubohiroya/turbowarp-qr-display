import {parseFixedNumberInput} from '@kubohiroya/turbowarp-extension-data-editor';
import type {FixedInputBinding, FixedInputEditorOptions, JsonValue, LiteralValue} from '@kubohiroya/turbowarp-extension-data-editor';
import {fixedInputBundle} from './fixed-input-schema.js';

const existingNumber = (value: LiteralValue): number => {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && value.trim() === '')) throw new TypeError('Expected a numeric literal.');
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError('Expected a finite number.');
  return number;
};
const newNumber = (value: JsonValue): string => {
  const parsed = parseFixedNumberInput(value);
  if (parsed.kind !== 'valid') throw new TypeError('Invalid new numeric input.');
  return parsed.token;
};

function binding(opcode: string, argument: string, values?: readonly string[]): FixedInputBinding {
  return {argument, schemaBundle: fixedInputBundle(opcode, argument),
    control: values ? {kind: 'enum', choices: values.map(value => ({value}))} : {kind: 'number'},
    read(value) {
      if (!values) return existingNumber(value);
      if (typeof value !== 'string') throw new TypeError('Expected a string.');
      return projectEnum(opcode, argument, value);
    },
    encode(value) {
      if (!values) return newNumber(value);
      if (typeof value !== 'string' || !values.includes(value)) throw new TypeError('Invalid selection.');
      return value;
    },
    validateCandidate(value) {
      try {
        if (!values) existingNumber(value);
        else if (typeof value !== 'string' || !values.includes(value)) throw new TypeError('Invalid selection.');
        return [];
      } catch {return [{message: 'Invalid fixed input.'}];}
    }};
}

function projectEnum(_opcode: string, _argument: string, value: string): string {return value.trim().toUpperCase();}

export const fixedInputEditors: readonly FixedInputEditorOptions[] = [
  {apiVersion: 1, extensionId: 'kubohiroyaqrdisplay', editorId: 'fixed-showQrCode', opcodes: ['kubohiroyaqrdisplay_showQrCode'],
    contractId: 'turbowarp-qr-display/showQrCode', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-qr-display', nowMs: 0, settings: null}),
    bindings: [binding('showQrCode', 'LEVEL', ["L", "M", "Q", "H"])]},
  {apiVersion: 1, extensionId: 'kubohiroyaqrdisplay', editorId: 'fixed-showQrCodeWithin', opcodes: ['kubohiroyaqrdisplay_showQrCodeWithin'],
    contractId: 'turbowarp-qr-display/showQrCodeWithin', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-qr-display', nowMs: 0, settings: null}),
    bindings: [binding('showQrCodeWithin', 'LEVEL', ["L", "M", "Q", "H"]), binding('showQrCodeWithin', 'SIZE')]},
];

interface OptionalHost {
  gui?: {blockEditors?: {apiVersion?: number; registerFixedInputEditor?: (options: FixedInputEditorOptions) => () => void}};
  vm?: {runtime?: {on?: (event: string, listener: () => void) => void; off?: (event: string, listener: () => void) => void}};
}

/** Register only currently declared opcodes; release obsolete feature-flag scopes. */
export function fixedInputRegistration(scratch: unknown) {
  const host = (typeof scratch === 'object' && scratch !== null ? scratch : {}) as OptionalHost;
  let active: unknown;
  let activeOpcodes = '';
  const removers: (() => void)[] = [];
  let disposed = false;
  const dispose = () => {
    host.vm?.runtime?.off?.('RUNTIME_DISPOSED', shutdown);
    for (const remove of removers.splice(0).reverse()) remove();
    active = undefined; activeOpcodes = '';
  };
  const shutdown = () => {disposed = true; dispose();};
  return {
    ensure(opcodes: readonly string[]) {
      const api = host.gui?.blockEditors;
      const signature = [...new Set(opcodes)].sort().join('\0');
      if (disposed || (api === active && signature === activeOpcodes)) return;
      dispose();
      if (api?.apiVersion !== 1 || typeof api.registerFixedInputEditor !== 'function') return;
      try {
        for (const definition of fixedInputEditors) {
          if (definition.opcodes.every(opcode => opcodes.includes(opcode))) {
            const remove = api.registerFixedInputEditor.call(api, definition);
            if (typeof remove !== 'function') throw new TypeError('Invalid fixed registration cleanup.');
            removers.push(remove);
          }
        }
        active = api; activeOpcodes = signature;
        host.vm?.runtime?.on?.('RUNTIME_DISPOSED', shutdown);
      } catch (error) {dispose(); throw error;}
    },
    dispose: shutdown
  };
}
