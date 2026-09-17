# TurboWarp QR Display

[English](README.md) | **日本語**

TurboWarp QR Displayは、任意の文字列をQRコードにしてスプライトに表示するTurboWarp拡張です。QRコードはスプライトのコスチュームを変更せずに置き換えて表示し、隠したとき・プロジェクトを止めたとき・スプライトを削除したときに元のコスチュームへ戻ります。表示内容はプロジェクトに保存されません。

QRによる受け渡しの「表示する側」です。読み取る側は、別の端末のカメラと`@kubohiroya/turbowarp-jsqr`などで行います。

**[English guide](https://kubohiroya.github.io/turbowarp-qr-display/)** ·
**[日本語ガイド](https://kubohiroya.github.io/turbowarp-qr-display/ja/)**

## できること

- 文字列をUTF-8で符号化します。日本語もそのまま読み戻せます。
- 誤り訂正レベルを`L`・`M`・`Q`・`H`から選べます。
- モジュール（QRコードの1マス）を整数のステージ単位で描きます。TurboWarpが描き直しても格子が不揃いになりません。大きさは余白込みで最大320、または指定した大きさ以内です。
- 表示したQRコードの大きさを返すので、周りの配置に使えます。
- 表示できなかった理由（`text-too-long`など）を返します。
- 同じ表示機能を他のunsandboxed拡張へ公開します。

## 要件と安全性

- TurboWarpの「Run extension without sandbox」。スプライトの描画スキンを差し替えるため、サンドボックスでは動きません。
- 符号化する文字列はブラウザの外へ出ません。エラーメッセージにも含めません。
- 表示先は元のスプライトです。ステージとクローンには表示できません。

## インストール

```text
https://cdn.jsdelivr.net/npm/@kubohiroya/turbowarp-qr-display@0.2.0/dist/qr-display.js
```

npm hostでは次を使います。

```bash
pnpm add @kubohiroya/turbowarp-qr-display@0.2.0
```

## Quick start

```text
when this sprite clicked
show [(profile)] as QR code with error correction [H]
wait until <not <showing QR code?>>
```

QRコード1枚に入るのは、レベル`H`で1273バイト、レベル`L`で2953バイトまでです。

### 大きさと鮮明さ

TurboWarpはSVGコスチュームの大きさをviewBoxで決め、2のべき乗の倍率で描きます。1マスが小数の単位幅だと描くたびに丸め方が変わり、格子が不揃いになって、カメラやjsQRで読めるかどうかが大きさや画面の画素比で変わります。そこでこの拡張は、1マスを整数のステージ単位で描きます。一辺はマスの数×その整数になるため、上限より小さくなることがあります。

空いている場所に収めるには`show [TEXT] as QR code with error correction [LEVEL] within [SIZE] stage units`を使い、スプライトの大きさは100%のまま、x と y を奇数の位置に置いてください。698バイトのプロファイルを1マス2単位で描き、TurboWarpのステージをjsQRで読むと、画素比1・1.5・2・2.5・3のすべてで読めました。同じプロファイルを253単位に拡大縮小して描くと（1マス2.6単位）、読めない画素比がありました。QRコードは偶数の単位を中心に描くので、辺の位置はスプライトの位置だけで決まります。400〜1100バイトのコードをxとyが奇数の位置に置くと、画素比1・1.25・1.5・1.75・2・2.5・3のすべてで読め、ほかの位置では1.5や2.5で読めないことがありました。コスチュームを切り替えるとQRコードは外れ、`showing QR code?`がそれを返します。

## ブロック一覧

- `show [TEXT] as QR code with error correction [LEVEL]`: 文字列をQRコードにして、このスプライトのコスチュームの代わりに表示します。
- `hide QR code`: QRコードを外し、コスチュームを戻します。
- `showing QR code?`: このスプライトがQRコードを表示中かを返します。
- `show [TEXT] as QR code with error correction [LEVEL] within [SIZE] stage units`: 1マスを整数の単位にして、SIZE以内の大きさで表示します。スプライトは100%のままにします。
- `QR code size`: 表示中のQRコードの一辺（100%のときのステージ単位）を返します。表示していなければ0です。
- `QR code error`: 直前の表示が失敗した理由を返します。成功したときは空です。

## Runtime API

他のunsandboxed拡張は`Scratch.vm.runtime.ext_kubohiroyaqrdisplay`を参照できます。APIで表示したQRコードも、ブロックで表示したものと同じく停止・読み込み・削除で外れます。

```js
const qr = Scratch.vm.runtime.ext_kubohiroyaqrdisplay;
qr.show(util.target, text, "H");
qr.show(util.target, text, "L", { maxSize: 240 });
qr.qrLayout(text, "L", { maxSize: 240 }); // { moduleSize, modules, side }
qr.isShowing(util.target);
qr.hide(util.target);
const svg = qr.createQrSvg(text, "M");
```

`show()`は、`code`が`empty-text`・`text-too-long`・`invalid-level`・`invalid-size`・`invalid-target`・`renderer-unavailable`のいずれかであるエラーを投げます。

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
