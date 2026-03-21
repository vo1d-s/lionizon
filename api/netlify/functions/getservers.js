exports.handler = async (event) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "https://www.roblox.com",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true"
    }

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: corsHeaders, body: "" }
    }

    const { roblosecurity, placeId, cursor = "" } = JSON.parse(event.body)

    const r = await fetch(`https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&cursor=${cursor}`, {
        headers: { "Cookie": `.ROBLOSECURITY=${roblosecurity}`, "accept": "application/json" }
    })

    if (r.status === 429) {
        return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: "rate limited" }) }
    }

    const data = await r.json()
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify(data)
    }
}