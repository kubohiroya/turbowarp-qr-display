# TurboWarp QR Display

**English** | [日本語](README.ja.md)

TurboWarp QR Display shows any text as a QR code on a sprite. The QR code takes
the place of the sprite's costume without changing it, and the costume comes back
when the QR code is hidden, the project stops, or the sprite is removed. Nothing
of the display is saved into the project.

It is the display half of a QR round trip: another device reads the code with a
camera, for example with `@kubohiroya/turbowarp-jsqr`.

**[Open the user guide](https://kubohiroya.github.io/turbowarp-qr-display/)** ·
**[日本語ガイド](https://kubohiroya.github.io/turbowarp-qr-display/ja/)**

## What it does

- Encodes text as UTF-8, so Japanese and other non-ASCII text reads back unchanged.
- Lets the project choose the error correction level: `L`, `M`, `Q` or `H`.
- Shows the QR code 320 stage units wide with its quiet zone; the size block scales it.
- Reports why a QR code could not be shown, such as `text-too-long`.
- Exposes the same display to other unsandboxed extensions.

## Requirements and Safety

- TurboWarp custom extensions loaded with **Run extension without sandbox**. The
  extension swaps a sprite's renderer skin, which the sandbox does not allow.
- The encoded text stays in the browser. Error messages never contain it.
- A QR code is shown on an original sprite, not on the stage or a clone.

## Installation

```text
https://cdn.jsdelivr.net/npm/@kubohiroya/turbowarp-qr-display@0.1.0/dist/qr-display.js
```

For npm hosts:

```bash
pnpm add @kubohiroya/turbowarp-qr-display@0.1.0
```

## Quick Start

```text
when this sprite clicked
show [(profile)] as QR code with error correction [H]
wait until <not <showing QR code?>>
```

A single QR code holds up to 1273 bytes at level `H` and 2953 bytes at level `L`.
Switching costume takes the QR code off, which `showing QR code?` reports.

## Block Reference

<!-- BEGIN GENERATED BLOCKS -->

### `show [TEXT] as QR code with error correction [LEVEL]`

Shows the text as a QR code in place of this sprite's costume. The costume itself is not changed and comes back when the QR code is hidden or the project stops.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `showQrCode` |
| `TEXT` | String, default: `Hello, world!` |
| `LEVEL` | String, default: `M` |

### `hide QR code`

Puts this sprite's costume back in place of its QR code.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `hideQrCode` |

### `showing QR code?`

Reports whether this sprite is showing a QR code. Switching costume takes the QR code off.

| Property | Value |
|---|---|
| Type | Boolean |
| Opcode | `isShowingQrCode` |

### `QR code error`

Reports why the last show block of this extension failed, such as text-too-long, or nothing when it succeeded.

| Property | Value |
|---|---|
| Type | Reporter |
| Opcode | `lastQrCodeError` |

<!-- END GENERATED BLOCKS -->

## Runtime API

Other unsandboxed extensions can access `Scratch.vm.runtime.ext_kubohiroyaqrdisplay`.
A QR code shown through the API ends on the same stop, load and removal events as
one shown by a block.

```js
const qr = Scratch.vm.runtime.ext_kubohiroyaqrdisplay;
qr.show(util.target, text, "H");
qr.isShowing(util.target);
qr.hide(util.target);
const svg = qr.createQrSvg(text, "M");
```

`show()` throws an error with a `code` of `empty-text`, `text-too-long`,
`invalid-level`, `invalid-target` or `renderer-unavailable`.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
```

## Build Workflow

```text
TypeScript source + qrcode
  -> Vite
  -> vite-plugin-turbowarp-extension
  -> dist/qr-display.js

Extension config + block definitions
  -> extension manifest plugin
  -> dist/extension-manifest.json
```

## Project structure

- `src/config.ts`: extension metadata
- `src/block-definitions.json`: canonical block metadata used by both the extension and README generator
- `src/qr-svg.ts`: text to QR symbol and SVG
- `src/sprite-display.ts`: swaps a sprite's skin and restores its costume
- `src/extension.ts`: blocks and runtime capability
- `src/index.ts`: extension registration entry point
- `schemas/extension-manifest.schema.json`: JSON Schema for the generated API contract
- `tests/`: unit tests, including a decode of every generated SVG with jsQR
- `dist/`: tracked TurboWarp JavaScript and extension API manifest

## Origin

The QR generation and the temporary sprite skin come from
`@kubohiroya/turbowarp-webrtc-qrcode-pairing`, without its WebRTC and multi-part transport.

TurboWarp TM is not affiliated with this project.

## License

SPDX-License-Identifier: MPL-2.0
