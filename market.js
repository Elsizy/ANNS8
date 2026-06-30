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
                <span class="market-header-right">24h %</span>

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
                        
                            maximumFractionDigits:4
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

                            <span class="market-symbol">
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
0,17
10,15
20,16
30,12
40,14
50,10
60,13
70,8
80,10
90,6
100,7"
/>
                                `
                                :
                                `
                                <polyline
points="
0,7
10,9
20,8
30,12
40,10
50,15
60,12
70,17
80,14
90,18
100,17"
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

            <div Class="market-footer">
            <span>
                Ver todos os pares 
            </span>
            <span Class=“footer-arrow”>
                →
            </span>
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
