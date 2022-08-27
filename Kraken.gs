function run() {
  var input = {
    email : Session.getActiveUser().getEmail(),
    sheetUrl: "Google Sheet URL containing costs will be here.",
    keys: {
      public: 'Kraken API Public Key',
      private: 'Kraken API Private Key'
    }
  }
  
  var kraken = new KrakenAPI(input.keys);
  
  // get account balance
  var balance = kraken.balance();

  // get current prices for the digital currencies
  var prices = {};
  if (balance != null){
    Logger.log("Account balances fetched from kraken.com account " + JSON.stringify(balance));
    prices = getPrices(balance);
    Logger.log("Current prices fetched from kraken.com " + JSON.stringify(prices));
  }

  // get the costs for digital currencies
  var costs = getCosts(input.sheetUrl);
  Logger.log("Costs fetched from Google Sheet " + JSON.stringify(costs));
  
  // calculate the investment prospects for each digital asset
  var prospects = {};
  for(var asset in balance){
    if(asset.startsWith("X")){
      var costPerUnit = costs[asset] | 0;
      var pricePerUnit = prices[asset];
      var totalCost = balance[asset]  * costPerUnit;
      var totalPrice = balance[asset] * pricePerUnit; 
      prospects[asset] = { cost: totalCost, price: totalPrice, returns: (totalPrice - totalCost) };
    }
  }

  Logger.log("Investment prospects " + JSON.stringify(prospects));

  var portfolio = { cost:0, price:0, returns:0 };
  for(var asset in prospects){
    portfolio.cost += prospects[asset].cost;
    portfolio.price += prospects[asset].price;
    portfolio.returns += prospects[asset].returns;
  }

  Logger.log("Entire portfolio " + JSON.stringify(portfolio));

  sendMail(input.email, balance, portfolio, prospects);

  function sendMail(email, balance, portfolio, prospects) {
    var html = "<html>"
    html += "<body style=\"font-size:10pt;font-family:Arial\">";
    html += "<b>Cash available:</b> $" + parseFloat(balance["ZUSD"]).toFixed(2) + "<br/><br/>"
    html += "<b>Portfolio</b><br/>";
    html += "Investment cost: $" + portfolio.cost.toFixed(2) + "<br/>";
    html += "Current value: $" + portfolio.price.toFixed(2) + "<br/>";
    html += "P/L: " + (portfolio.returns > 0 ? "+" : "") + portfolio.returns.toFixed(2) + "<br/><br/>";
    for(var asset in prospects){
      html += "<b>" + asset.substring(1) + "</b><br/>";
      html += "Investment cost: $" + prospects[asset].cost.toFixed(2) + "<br/>";
      html += "Current value: $" + prospects[asset].price.toFixed(2) + "<br/>";
      html += "P/L: " + (prospects[asset].returns > 0 ? "+" : "") + prospects[asset].returns.toFixed(2) + "<br/><br/>";
    }
    html += "</body>";
    html += "</html>";

    Logger.log("sending email with content:\n" + html);
  
    MailApp.sendEmail({
      to: email,
      subject: "Kraken Account Details",
      htmlBody: html
    });

    Logger.log("email sent!")
  }

  function getPrices(balance){
    var prices = {};
    for(var asset in balance){
      if(asset.startsWith("X")){
        var pair = asset + "ZUSD";
        var price = 0;
        var trades = kraken.trades(pair);
        if (trades != null){
          price = trades[pair][0][0];
          prices[asset] = price;
        }
      }
    }
    return prices;
  }

  function getCosts(sheetUrl) {
    var costSheet = SpreadsheetApp.openByUrl(sheetUrl);
    var data = costSheet.getDataRange().getValues();
    var costs = {};
    for(var i in data){
      if(i > 0){
        var xcur = data[i][0];
        var cost = data[i][1];
        costs[xcur] = cost;
      }
    }
    return costs;
  }
}

var KrakenAPI = function(keys){
  this.balance = function(){
    return this.private("Balance", "");
  }

  this.trades = function(pair){
    return this.public("Trades", "pair=" + pair);
  }

  this.public = function(endpoint, parameters){
    var url = 'https://api.kraken.com/0/public/' + endpoint + "?" + parameters;
    var options = {
      'muteHttpExceptions': true
    };
    http_response = UrlFetchApp.fetch(url, options)
    api_data = http_response.getContentText()
    var result = JSON.parse(api_data);
    return result["result"];
  }

  this.private = function (endpoint, parameters){
    Utilities.sleep(Math.random() * 100)
    api_key = keys.public
    api_secret = Utilities.base64Decode(keys.private)
    api_path = Utilities.newBlob('/0/private/' + endpoint).getBytes()
    api_nonce = Date.now().toString()
    api_post = 'nonce=' + api_nonce + '&' + parameters
    
    api_sha256 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, api_nonce + api_post)
    api_hmac = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_512, api_path.concat(api_sha256), api_secret)
    api_signature = Utilities.base64Encode(api_hmac)
    
    http_options = {'method':'post', 'payload':api_post, 'headers':{'API-Key':api_key, 'API-Sign':api_signature}}
    http_response = UrlFetchApp.fetch('https://api.kraken.com/0/private/' + endpoint, http_options)
    api_data = http_response.getContentText()
    var result = JSON.parse(api_data);
    return result["result"];
  }
} 