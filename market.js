const pairs = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT"
];

async function loadMarket() {

    const container =
        document.getElementById("market-section");

    if (!container) return;

    try {

        const requests = pairs.map(pair =>
            fetch(
                `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`
            )
            .then(r => r.json())
        );

        const data = await Promise.all(requests);

        container.innerHTML = `
            <div class="market-card">

                <div class="market-header">
                    <span>Pares de Moedas</span>
                    <span>Preço Live</span>
                    <span>24h %</span>
                </div>

                ${
                    data.map(item => {

                        const symbol =
                            item.symbol.replace("USDT","/USDT");

                        const price =
                            Number(item.lastPrice)
                            .toLocaleString(
                                "pt-PT",
                                {
                                    minimumFractionDigits:2,
                                    maximumFractionDigits:2
                                }
                            );

                        const percent =
                            Number(item.priceChangePercent)
                            .toFixed(2);

                        const positive =
                            percent >= 0;

                        return `
                            <div class="market-row">

                                <div class="market-pair">
                                    ${symbol}
                                </div>

                                <div class="market-price">
                                    ${price}
                                </div>

                                <div class="
                                    market-change
                                    ${positive
                                        ? "positive"
                                        : "negative"}
                                ">
                                    ${
                                        positive
                                        ? "+"
                                        : ""
                                    }
                                    ${percent}%
                                </div>

                            </div>
                        `;
                    }).join("")
                }

            </div>
        `;

    }
    catch(error){
        console.log(error);
    }
}

loadMarket();

setInterval(
    loadMarket,
    60000
);
