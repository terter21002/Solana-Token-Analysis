# 📊 Solana Token Price Action Analyzer (Google Sheets Script)

This Google Apps Script project integrates **Solscan** and **Birdeye** APIs into Google Sheets to analyze Solana-based token price action. You can input a token address and trigger date to retrieve key metrics like:

- Market cap at trigger date
- All-time high market cap
- Lowest percentage drop
- Price action timing
- Pre-trigger ATH metrics
- Token symbol, supply, and launch data

---

## 🚀 Features

- 🔍 Analyze token price movements from a custom date
- 🧠 Auto-detect token supply and launch time
- 📈 Compute market cap trends using historical data
- 🛠 Supports batch analysis row-by-row
- 🧹 Reset output data with one click

---

## 🧩 API Dependencies

This script uses the following APIs:

### 🔷 [Solscan Pro API](https://pro-api.solscan.io/)
- `GET /v2.0/token/meta`
- `GET /v2.0/token/price`

### 🟡 [Birdeye Public API](https://birdeye.so/)
- `GET /defi/v3/token/market-data`
- `GET /defi/history_price`
- `GET /defi/v3/token/meta-data/single`
- `GET /defi/token_creation_info`

---

## 📘 License
MIT License

## 💡 Credits
- Solscan API
- Birdeye API
