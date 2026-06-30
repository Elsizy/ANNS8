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

async function loadMarket() {

    const container =
        document.getElementById(
            "market-section"
        );

    if (!container) return;

    try {

        const requests =
            pairs.map(
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

                <span>Pares de Moedas</span>
                <span>Preço Live</span>
                <span></span>
                <span>24h %</span>

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
                        
                            maximumFractionDigits:2
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

                    

                        <div class="market-coin">

                            <img
                                src="${iconMap[item.symbol]}"
                                class="coin-icon"
                                alt="${symbol}"
                            >

                            <span>
                                ${symbol}
                            </span>

                        </div>

                    

                    <div class="market-price">
                        ${price}
                    </div>

                    <div class="market-chart">

                        <svg
                            viewBox="0 0 100 24"
                            class="
                                market-line
                                ${positive ? "up" : "down"}
                            "
                        >

                            ${
                                positive
                                ?
                                `
                                <polyline
                                    points="
                                    0,28
                                    10,24
                                    20,26
                                    30,18
                                    40,22
                                    50,14
                                    60,20
                                    70,12
                                    80,16
                                    90,8
                                    100,10
                                    "
                                />
                                `
                                :
                                `
                                <polyline
                                    points="
                                    0,12
                                    10,16
                                    20,14
                                    30,22
                                    40,18
                                    50,26
                                    60,20
                                    70,30
                                    80,24
                                    90,34
                                    100,32
                                    "
                                />
                                `
                            }

                        </svg>

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
