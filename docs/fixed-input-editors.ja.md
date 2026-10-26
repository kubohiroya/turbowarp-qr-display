# 固定入力エディターの契約

対応GUIの起動時に`blockEditorDialogs=1&blockEditorFixedInputs=1`を指定して再読込した場合だけ利用できる。固定入力フラグは既定OFF。旧GUIにoptional登録APIがなければ既存動作を維持する。

| ブロック | 引数 | UI |
|---|---|---|
| `showQrCode` | `LEVEL` | enum |
| `showQrCodeWithin` | `LEVEL` | enum |
| `showQrCodeWithin` | `SIZE` | number |

LEVELはL/M/Q/Hの固定選択で、旧trim・小文字aliasを表示だけで正規化する。SIZEの新値は有限かつ正数であり、小数も許容する。保存時にQR生成・skin登録・描画・session起動は行わず、既存runtimeのmodule幅floorを変更しない。

Schemaの正本は`schemas/block-editor-fixed-inputs.schema.json`。各登録は実在する`#/$defs/<opcode>/properties/<argument>` fragmentをsourceとして保持し、旧SOURCE Schemaと区別する。`src/extension.ts`およびpure normalizerがruntime契約の正本であり、UI候補や棚卸しだけを受理根拠にしない。外部Schema取得を行わない。

新number入力にはNP-finite-new-input-v1を適用し、有限なJSON数値表記だけを保存する。既存rawは未編集ならalias・空白・未知値・旧数値表記もそのまま保持し、表示投影では書き換えない。空白や非有限など投影不能な旧値は読取専用で、明示的な有効値への修復だけを許す。接続reporterは評価・置換しない。対象外の引数はpatchしない。

同じ画面では未保存draftと無効bufferを保持し、保存失敗後も保持する。取消・dispose・project/target/登録失効で破棄し、再openは現在rawから始める。getInfoに存在するopcodeだけ登録し、APIまたはopcode集合の変化ではcleanupして再登録する。部分登録失敗・runtime終了・disposeでcleanupする。

共通依存はnpm revision `@kubohiroya/turbowarp-extension-data-editor@0.3.4`へmanifest・lock・実解決を揃える。解決済みの配布版は`pnpm-lock.yaml`で確認する。型とpure数値parserだけを利用し、runtime bundleと公開型の依存閉包をpack consumerで確認する。既存SourceForms/Descendantsと共存する。

切戻しは固定入力フラグをOFFにして再読込する。依存を戻すときはmanifest・lock・実解決を一組で戻す。旧sb3の移行は不要。ローカル検証のみで、commit・push・Issue・PR・merge・Pages・npm公開を含まない。
