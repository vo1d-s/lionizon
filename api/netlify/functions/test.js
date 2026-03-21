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

    const { roblosecurity, placeId, serverIds } = JSON.parse(event.body)

    let authHeaders = {
        "Referer" : `https://www.roblox.com/games/${placeId}/`,
        "Origin" : "https://roblox.com",
        "User-Agent" : "Roblox/WinInet"
    }

    const results = await Promise.all(
        serverIds.map(async (serverId) => {
            let r = await fetch("https://gamejoin.roblox.com/v1/join-game", {
                method: "POST",
                headers: {
                    ...authHeaders,
                    "Cookie": `.ROBLOSECURITY=${roblosecurity}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "placeId": placeId,
                    "isTeleport": false,
                    "gameId": serverId,
                    "gameJoinAttemptId": serverId
                })
            })
            return { serverId, data: await r.json() }
        })
    )

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({ data: results })
    }
}