const pairs = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT"
];

const iconMap = {
    BTCUSDT: "BTC.png",
    ETHUSDT: "ETH.png",
    BNBUSDT: "BNB.png",
    SOLUSDT: "SOL.png",
    XRPUSDT: "XRP.png"
};

const chartMap = {
    positive: "up.svg",
    negative: "down.svg"
};

async function loadMarket() {

    const container =
        document.getElementById(
            "market-section"
        );

    if (!container) return;

    try {

        const requests = pairs.map(
            pair =>
                fetch(
                    `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`
                )
                .then(
                    response => response.json()
                )
        );

        const data =
            await Promise.all(
                requests
            );

        container.innerHTML = `
        <div class="market-card">

            <div class="market-header">

                <span>
                    Pares de Moedas
                </span>

                <span>
                    Preço Live
                </span>

                <span>
                    24h %
                </span>

            </div>

            ${data.map(item => {

                const symbol =
                    item.symbol.replace(
                        "USDT",
                        "/USDT"
                    );

                const price =
                    Number(
                        item.lastPrice
                    ).toLocaleString(
                        "pt-PT",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

                const percent =
                    Number(
                        item.priceChangePercent
                    ).toFixed(2);

                const positive =
                    Number(percent) >= 0;

                return `
                <div class="market-row">

                    <div class="market-pair">

                        <div class="market-coin">

                            <img
                                src="assets/coins/${iconMap[item.symbol]}"
                                class="coin-icon"
                                alt="${symbol}"
                            >

                            <span>
                                ${symbol}
                            </span>

                        </div>

                    </div>

                    <div class="market-price">
                        ${price}
                    </div>

                    <div class="market-chart">

                        <img
                            src="assets/charts/${
                                positive
                                ? chartMap.positive
                                : chartMap.negative
                            }"
                            alt="chart"
                        >

                    </div>

                    <div class="
                        market-change
                        ${
                            positive
                            ? "positive"
                            : "negative"
                        }
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

            }).join("")}

            <div class="market-footer">

                Ver todos os pares →

            </div>

        </div>
        `;

    }
    catch(error){

        console.error(
            "Erro ao carregar mercado:",
            error
        );

    }

}

loadMarket();

setInterval(
    loadMarket,
    60000
);
