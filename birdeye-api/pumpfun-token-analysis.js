function analyzeSolanaPriceAction() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow(); // Find the last row with data

  sheet.getRange("L3").setValue("Running... Please wait...");

  try {
    for (let row = 2; row <= lastRow; row++) {
      const tokenAddress = sheet.getRange(`A${row}`).getValue().trim();
      const triggerDateInput = sheet
        .getRange(`B${row}`)
        .getDisplayValue()
        .trim();

      if (!tokenAddress || !triggerDateInput) {
        SpreadsheetApp.getUi().alert("Missing data");
        continue;
      }

      try {
        const triggerTimestamp = convertToUnixTimestamp(triggerDateInput);
        const currentTimestamp = Math.floor(Date.now() / 1000);

        const supply = getTokenSupply(tokenAddress);
        const priceHistory = getPriceHistory(
          tokenAddress,
          triggerTimestamp,
          currentTimestamp
        );
        const tickerSymbol = getTickerSymbol(tokenAddress);

        const triggerPrice = findClosestPrice(priceHistory, triggerTimestamp);
        const postTriggerPrices = priceHistory.filter(
          (p) => p.unixTime >= triggerTimestamp
        );

        // Calculate market cap at trigger
        const marketCapAtTrigger = triggerPrice * supply;

        // Find ATH price and its timestamp
        const athEntry = postTriggerPrices.reduce(
          (max, p) => (p.value > max.value ? p : max),
          postTriggerPrices[0]
        );
        const athPrice = athEntry.value;
        const athTime = athEntry.unixTime;

        // Find lowest price between trigger and ATH
        const preAthPrices = postTriggerPrices.filter(
          (p) => p.unixTime <= athTime
        );
        const lowEntry = preAthPrices.reduce(
          (min, p) => (p.value < min.value ? p : min),
          preAthPrices[0]
        );
        const lowPrice = lowEntry.value;
        const lowTime = lowEntry.unixTime;

        // Calculate lowest percentage decrease between trigger and ATH
        const lowestPercentageDrop =
          (((lowPrice - triggerPrice) / triggerPrice) * 100).toFixed(2) + "%";

        // Calculate increase percentage of MarketCap from trigger to ATH
        const increasePercentageUp =
          ((athPrice / triggerPrice) * 100).toFixed(2) + "%";

        // Output results to the sheet
        sheet.getRange(`C${row}`).setValue(marketCapAtTrigger.toFixed(2));
        sheet.getRange(`D${row}`).setValue((athPrice * supply).toFixed(2));
        sheet.getRange(`E${row}`).setValue(increasePercentageUp);
        sheet
          .getRange(`F${row}`)
          .setValue(formatDuration(triggerTimestamp, athTime));
        sheet.getRange(`G${row}`).setValue(lowestPercentageDrop);
        sheet
          .getRange(`H${row}`)
          .setValue(formatDuration(triggerTimestamp, lowTime));
        sheet.getRange(`I${row}`).setValue(tickerSymbol);

        sheet.getRange(`J${row}`).setValue("✅ Done");
      } catch (error) {
        sheet.getRange(`J${row}`).setValue("❌ Error");
        Logger.log(error);
      }
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(error.message);
    Logger.log(error);
  } finally {
    sheet.getRange("L3").setValue("");
  }
}

function convertToUnixTimestamp(dateInput) {
  let dateString;
  if (typeof dateInput === "string") {
    dateString = dateInput;
  } else if (dateInput instanceof Date) {
    const pad = (n) => n.toString().padStart(2, "0");
    dateString =
      dateInput.getFullYear() +
      pad(dateInput.getMonth() + 1) +
      pad(dateInput.getDate()) +
      " " +
      pad(dateInput.getHours()) +
      ":" +
      pad(dateInput.getMinutes());
  } else {
    throw new Error("Invalid date format");
  }

  const formattedDate =
    dateString.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3").replace(" ", "T") +
    ":00Z";

  const date = new Date(formattedDate);
  if (isNaN(date)) throw new Error("Invalid date format. Use YYYYMMDD HH:mm");
  return Math.floor(date.getTime() / 1000);
}

function getTokenSupply(tokenAddress) {
  const url = `https://public-api.birdeye.so/defi/v3/token/market-data?address=${tokenAddress}`;
  const response = fetchData(url);
  return response.data.total_supply;
}

function getPriceHistory(address, timeFrom, timeTo) {
  const url =
    `https://public-api.birdeye.so/defi/history_price?` +
    `address=${address}&address_type=token&type=1m&` +
    `time_from=${timeFrom}&time_to=${timeTo}`;

  const response = fetchData(url);
  if (!response.data.items.length) throw new Error("No price data found");
  return response.data.items;
}

function findClosestPrice(prices, targetTimestamp) {
  const closest = prices.reduce((prev, curr) =>
    Math.abs(curr.unixTime - targetTimestamp) <
    Math.abs(prev.unixTime - targetTimestamp)
      ? curr
      : prev
  );
  return closest.value;
}

function formatDuration(startUnix, endUnix) {
  const diff = endUnix - startUnix;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function fetchData(url, headers = {}) {
  headers["X-API-KEY"] = "498c1153fb72471996fd8823e6519fc4";
  const response = UrlFetchApp.fetch(url, { headers });
  if (response.getResponseCode() !== 200) {
    throw new Error(`API Error: ${response.getContentText()}`);
  }
  return JSON.parse(response.getContentText());
}

function getTickerSymbol(tokenAddress) {
  const url = `https://public-api.birdeye.so/defi/v3/token/meta-data/single?address=${tokenAddress}`;
  const response = fetchData(url);

  if (!response.data || !response.data.symbol) {
    throw new Error("Failed to retrieve ticker symbol");
  }

  return response.data.symbol;
}

function resetSolanaAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow(); // Find the last row with data

  // Clear data in columns C to J for all rows starting from row 2
  sheet.getRange(`C2:J${lastRow}`).clearContent();

  // Optional: Show a confirmation message
  SpreadsheetApp.getUi().alert("Reset successful! Data cleared for all rows.");
}
