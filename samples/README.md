# Qr Displayの最小デモ

- 配布: [`show-and-hide-qr.sb3`](https://kubohiroya.github.io/turbowarp-qr-display/samples/show-and-hide-qr.sb3)
- 起動: [TurboWarp Editor](https://turbowarp.org/editor?project_url=https%3A%2F%2Fkubohiroya.github.io%2Fturbowarp-qr-display%2Fsamples%2Fshow-and-hide-qr.sb3)
- 操作: **Run without sandbox**を選んで**Allow**し、緑の旗を押します。
- 内容: `showQrCodeWithin`で固定文字列のQRを表示し、`qrCodeSize`・`isShowingQrCode`を確認、キーで消す
- 期待結果: A QR for Hello, TurboWarp! appears. Space restores the sprite.

`manifest.json`に拡張ID・JSパス・sandbox条件・期待結果を記録しています。
`show-and-hide-qr/project.json`と自作SVGを編集し、次のコマンドで再生成します。

```bash
pnpm run samples:build
pnpm run samples:check
pnpm run pages:build
```

Node.jsは`.nvmrc`指定版を使います。サンプル生成に追加依存はありません。
生成したSB3もコミットし、`_site/`のdocs・dist・SB3をPagesへ公開します。
unsandboxed拡張は検証対象JSをSB3へ同梱し、利用者が通常の同意画面で許可します。
sandbox互換の拡張はPages上のJSを参照します。

緑の旗で毎回入力から結果を生成します。停止してから再実行できます。
Spaceで非表示／クリアし、緑の旗で再表示できます。
切戻しはサンプル・READMEリンク・Pages配信設定の追加をrevertします。
