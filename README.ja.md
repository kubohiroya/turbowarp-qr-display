# TurboWarp QR Display

[English](README.md) | **日本語**

TurboWarp QR Displayは、任意の文字列をQRコードにしてスプライトに表示するTurboWarp拡張です。QRコードはスプライトのコスチュームを変更せずに置き換えて表示し、隠したとき・プロジェクトを止めたとき・スプライトを削除したときに元のコスチュームへ戻ります。表示内容はプロジェクトに保存されません。

QRによる受け渡しの「表示する側」です。読み取る側は、別の端末のカメラと`@kubohiroya/turbowarp-jsqr`などで行います。

**[English guide](https://kubohiroya.github.io/turbowarp-qr-display/)** ·
**[日本語ガイド](https://kubohiroya.github.io/turbowarp-qr-display/ja/)**

## できること

- 文字列をUTF-8で符号化します。日本語もそのまま読み戻せます。
- 誤り訂正レベルを`L`・`M`・`Q`・`H`から選べます。
- QRコードは余白込みで幅320（ステージ単位）で表示されます。大きさはスプライトの大きさブロックで変えられます。
- 表示できなかった理由（`text-too-long`など）を返します。
- 同じ表示機能を他のunsandboxed拡張へ公開します。

## 要件と安全性

- TurboWarpの「Run extension without sandbox」。スプライトの描画スキンを差し替えるため、サンドボックスでは動きません。
- 符号化する文字列はブラウザの外へ出ません。エラーメッセージにも含めません。
- 表示先は元のスプライトです。ステージとクローンには表示できません。

## インストール

```text
https://cdn.jsdelivr.net/npm/@kubohiroya/turbowarp-qr-display@0.1.0/dist/qr-display.js
```

npm hostでは次を使います。

```bash
pnpm add @kubohiroya/turbowarp-qr-display@0.1.0
```

## Quick start

```text
when this sprite clicked
show [(profile)] as QR code with error correction [H]
wait until <not <showing QR code?>>
```

QRコード1枚に入るのは、レベル`H`で1273バイト、レベル`L`で2953バイトまでです。コスチュームを切り替えるとQRコードは外れ、`showing QR code?`がそれを返します。

## ブロック一覧

- `show [TEXT] as QR code with error correction [LEVEL]`: 文字列をQRコードにして、このスプライトのコスチュームの代わりに表示します。
- `hide QR code`: QRコードを外し、コスチュームを戻します。
- `showing QR code?`: このスプライトがQRコードを表示中かを返します。
- `QR code error`: 直前の表示が失敗した理由を返します。成功したときは空です。

## Runtime API

他のunsandboxed拡張は`Scratch.vm.runtime.ext_kubohiroyaqrdisplay`を参照できます。APIで表示したQRコードも、ブロックで表示したものと同じく停止・読み込み・削除で外れます。

```js
const qr = Scratch.vm.runtime.ext_kubohiroyaqrdisplay;
qr.show(util.target, text, "H");
qr.isShowing(util.target);
qr.hide(util.target);
const svg = qr.createQrSvg(text, "M");
```

`show()`は、`code`が`empty-text`・`text-too-long`・`invalid-level`・`invalid-target`・`renderer-unavailable`のいずれかであるエラーを投げます。

## 由来

QR生成とスプライトの一時スキンは`@kubohiroya/turbowarp-webrtc-qrcode-pairing`から、WebRTCと分割転送を除いて切り出したものです。

TurboWarp TM is not affiliated with this project.

## 開発

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
```

## ライセンス

SPDX-License-Identifier: MPL-2.0
