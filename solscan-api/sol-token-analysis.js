function analyzeSolanaPriceAction() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  sheet.getRange("C3").setValue("Running... Please wait...");

  const tokenAddress = sheet.getRange("A2").getValue();
  const triggerDate = sheet.getRange("B2").getValue();

  if (!tokenAddress || !triggerDate) {
    SpreadsheetApp.getUi().alert(
      "Please input both token address and trigger date."
    );
    sheet.getRange("C3").setValue("");
    return;
  }

  let marketCapAtTrigger = 0;
  let marketCapATH = 0;
  let lowestDecrease = 0;

  const apiKey = "your_api_key";
  const headers = {
    token: apiKey,
  };

  try {
    // Step 1: Fetch Token Meta Data
    const tokenMetaUrl = `https://pro-api.solscan.io/v2.0/token/meta?address=${tokenAddress}`;
    const tokenMetaResponse = fetchData(tokenMetaUrl, headers);
    const supply = parseFloat(tokenMetaResponse.data.supply);
    const decimals = parseInt(tokenMetaResponse.data.decimals);

    // Step 2: Fetch Token Price Data
    const tokenPriceUrl = `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&time[]=${triggerDate}`;
    const tokenPriceResponse = fetchData(tokenPriceUrl, headers);

    // Step 3: Process Price Data
    const prices = tokenPriceResponse.data;
    marketCapAtTrigger = (supply * prices[0].price) / Math.pow(10, decimals);

    marketCapATH =
      (supply * Math.max(...prices.map((item) => item.price))) /
      Math.pow(10, decimals);
    const lowestPrice = Math.min(...prices.map((item) => item.price));
    lowestDecrease = ((lowestPrice - prices[0].price) / prices[0].price) * 100;

    // Step 4: Output Results to Google Sheets
    sheet.getRange("C2").setValue(marketCapAtTrigger);
    sheet.getRange("D2").setValue(marketCapATH);
    sheet.getRange("E2").setValue(lowestDecrease);
  } catch (error) {
    Logger.log("Error: " + error.message);
    SpreadsheetApp.getUi().alert("An error occurred while fetching data.");
  } finally {
    // Clear the loading message after script finishes
    sheet.getRange("C3").setValue("");
  }

  Logger.log(`Market Cap at Trigger: ${marketCapAtTrigger}`);
  Logger.log(`Market Cap ATH: ${marketCapATH}`);
  Logger.log(`Lowest % Decrease: ${lowestDecrease}`);
}

// Helper Function to Fetch Data
function fetchData(url, headers) {
  const options = {
    method: "get",
    headers: headers,
  };
  const response = UrlFetchApp.fetch(url, options);
  const jsonResponse = JSON.parse(response.getContentText());
  return jsonResponse;
}

// Reset Ouput Results
function resetSolanaAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Clear Market Cap at Trigger, Market Cap ATH, and Lowest % Decrease
  sheet.getRange("C2:E2").setValue("");

  // Optional: Show a confirmation message
  SpreadsheetApp.getUi().alert("Reset successful! Data cleared.");
}
