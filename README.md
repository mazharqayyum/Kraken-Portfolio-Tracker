# Kraken Portfolio Tracker

This Google App Script helps you track your Kraken portfolio. Once deployed and executed, it will generate a profit/loss report as email. In order to run this script you must provide with following information.

1. **sheetUrl** This is the URL to a Google Sheet containing information about initial costs you paid for digital assets. The Google Sheet must be created with following format.

|| A | B |
|---| --- | --- |
|1| Ticker | Cost |
|2| XXRP | 2.30055 |
|3| XETH | 1100 |
|4| DOT | 62 |
|5| LINK | 30 |

2. **public** Kraken API Public Key
3. **private** Kraken API private Key
