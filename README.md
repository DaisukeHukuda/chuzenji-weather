# 中禅寺湖 天気アプリ（社内用）

中禅寺湖（湖面標高1269m）のピンポイント予報を表示する社内用Webアプリ。
データは Open-Meteo（日本域はJMAベースの best_match）を標高補正して取得。予報専用・5分自動更新・スマホ最適化。

## 開発

```bash
npm install
npm run dev        # 開発サーバ
npm test           # ユニットテスト
npm run typecheck  # 型チェック
npm run build      # 本番ビルド → dist/
```

## デプロイ（Cloudflare Pages）

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`
- フレームワークプリセット: Vite

`npx wrangler pages deploy dist` でも可。社内でURLを共有して利用する。

## 仕様

- 地点: 中禅寺湖（lat 36.727 / lon 139.477 / elevation 1269）の1地点固定
- 粒度タブ: 1時間(48h) / 3時間(5日) / 半日(7日) / 1日(7日) / 週(16日)
- 要素: 天気・気温・風速・風向・最大風速・降水量・降水確率・雲量・UV指数・日の出/日の入り
- 風速単位: m/s ・ 出典表示: Open-Meteo（JMA・標高補正）

設計書: [`docs/2026-06-21-chuzenji-weather-app-design.md`](docs/2026-06-21-chuzenji-weather-app-design.md) ／ 実装計画: [`docs/2026-06-21-chuzenji-weather-app.md`](docs/2026-06-21-chuzenji-weather-app.md)
