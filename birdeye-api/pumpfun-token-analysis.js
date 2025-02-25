function analyzeSolanaPriceAction() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange("L3").setValue("Running... Please wait...");

  try {
    const lastRow = sheet.getLastRow();

    for (let row = 2; row <= lastRow; row++) {
      const tokenAddress = sheet.getRange(row, 1).getValue().trim(); // Column A
      const triggerDateInput = sheet.getRange(row, 2).getDisplayValue().trim(); // Column B

      if (!tokenAddress || !triggerDateInput) continue;

      const triggerTimestamp = convertToUnixTimestamp(triggerDateInput);
      const launchTimestamp = getTokenLaunchTime(tokenAddress);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const supply = getTokenSupply(tokenAddress);
      const priceHistory = getPriceHistory(
        tokenAddress,
        launchTimestamp,
        currentTimestamp
      );
      const tickerSymbol = getTickerSymbol(tokenAddress);

      if (!priceHistory || priceHistory.length === 0) {
        throw new Error("No price data available for token.");
      }

      const triggerPrice = findClosestPrice(priceHistory, triggerTimestamp);
      const postTriggerPrices = priceHistory.filter(
        (p) => p.unixTime >= triggerTimestamp
      );

      // **Find ATH before trigger (from launch time to trigger)**
      const preTriggerPrices = priceHistory.filter(
        (p) => p.unixTime < triggerTimestamp
      );
      let athBeforeTrigger = "N/A";
      let athBeforeTime = "N/A";

      if (preTriggerPrices.length > 0) {
        const athBeforeEntry = preTriggerPrices.reduce(
          (max, p) => (p.value > max.value ? p : max),
          preTriggerPrices[0]
        );
        athBeforeTrigger = athBeforeEntry.value;
        athBeforeTime = athBeforeEntry.unixTime;
      }

      // **Find ATH after trigger**
      const athEntry = postTriggerPrices.reduce(
        (max, p) => (p.value > max.value ? p : max),
        postTriggerPrices[0]
      );
      const athPrice = athEntry ? athEntry.value : "N/A";
      const athTime = athEntry ? athEntry.unixTime : "N/A";

      // **Find lowest price between trigger and ATH**
      const preAthPrices = postTriggerPrices.filter(
        (p) => p.unixTime <= athTime
      );
      let lowPrice = "N/A";
      let lowTime = "N/A";

      if (preAthPrices.length > 0) {
        const lowEntry = preAthPrices.reduce(
          (min, p) => (p.value < min.value ? p : min),
          preAthPrices[0]
        );
        lowPrice = lowEntry.value;
        lowTime = lowEntry.unixTime;
      }

      // **Calculate percentage changes**
      const marketCapAtTrigger = triggerPrice * supply;
      const athBeforeTriggerMarketCap = athBeforeTrigger * supply;
      const lowestPercentageDrop =
        lowPrice !== "N/A"
          ? (((lowPrice - triggerPrice) / triggerPrice) * 100).toFixed(2) + "%"
          : "N/A";
      const increasePercentageUp =
        athPrice !== "N/A"
          ? (((athPrice - triggerPrice) / triggerPrice) * 100).toFixed(2) + "%"
          : "N/A";

      // **Output to sheet**
      sheet.getRange(row, 3).setValue(marketCapAtTrigger.toFixed(2)); // C - Market Cap at Trigger
      sheet
        .getRange(row, 4)
        .setValue(athPrice !== "N/A" ? (athPrice * supply).toFixed(2) : "N/A"); // D - Market Cap ATH
      sheet.getRange(row, 5).setValue(increasePercentageUp); // E - % Increase to ATH
      sheet
        .getRange(row, 6)
        .setValue(formatDuration(triggerTimestamp, athTime)); // F - Duration to ATH
      sheet.getRange(row, 7).setValue(lowestPercentageDrop); // G - Lowest % Drop
      sheet
        .getRange(row, 8)
        .setValue(formatDuration(triggerTimestamp, lowTime)); // H - Duration to Lowest Price
      sheet
        .getRange(row, 9)
        .setValue(
          athBeforeTriggerMarketCap.toFixed(2) !== "N/A"
            ? athBeforeTriggerMarketCap.toFixed(2)
            : "N/A"
        ); // I - ATH Before Trigger
      sheet
        .getRange(row, 10)
        .setValue(
          athBeforeTime !== "N/A"
            ? formatDuration(athBeforeTime, triggerTimestamp)
            : "N/A"
        ); // J - Time from ATH Before Trigger
      sheet.getRange(row, 11).setValue(tickerSymbol); // K - Ticker Symbol
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

function getTokenLaunchTime(tokenAddress) {
  const url = `https://public-api.birdeye.so/defi/token_creation_info?address=${tokenAddress}`;
  const response = fetchData(url);

  if (!response.data || !response.data.blockUnixTime) {
    throw new Error("Failed to retrieve token launch time");
  }

  return response.data.blockUnixTime;
}

function resetSolanaAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow(); // Find the last row with data

  // Clear data in columns C to J for all rows starting from row 2
  sheet.getRange(`C2:K${lastRow}`).clearContent();

  // Optional: Show a confirmation message
  SpreadsheetApp.getUi().alert("Reset successful! Data cleared for all rows.");
}
