async function getFriends(userId) {
    let friend_list = []
    let next_cursor = ""

    while (true) {
        let r = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/find?cursor=${next_cursor}&_extreq`, {
          "headers": {
            "accept": "application/json, text/plain, */*",
          },
          "method": "GET",
          "credentials": "include"
        })
        let data = await r.json()

        friend_list.push(...data["PageItems"] || [])

        next_cursor = data["NextCursor"]
        if (next_cursor == null) {
            break
        };
    }
    return friend_list
}

async function getPresences(userIds) {
    let presences = []

    let r = await fetch(`https://presence.roblox.com/v1/presence/users?_extreq`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
        },
        "body": JSON.stringify({
            "userIds": userIds
        }),
        "method": "POST",
        "credentials": "include"
    })

    let data = await r.json()
    presences = data["userPresences"]
    return presences
}

async function getLoggedInUserId() {
    let r = await fetch("https://www.roblox.com/my/account/json?_extreq", {
        "headers": {
            "accept": "application/json, text/plain, */*",
        },
        "method": "GET",
        "credentials": "include"
    })
    let data = await r.json()
    return data["UserId"]
}

async function getLoggedInUserDisplay() {
    let r = await fetch("https://www.roblox.com/my/account/json?_extreq", {
        "headers": {
            "accept": "application/json, text/plain, */*",
        },
        "method": "GET",
        "credentials": "include"
    })
    let data = await r.json()
    return data["DisplayName"]
}

async function getUniverseId(placeId) {
    let r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe?_extreq`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
        },
        "method": "GET",
        "credentials": "include"
    })
    let data = await r.json()
    return data["universeId"]
}

async function getGameDetails(placeId) {
    const universeId = await getUniverseId(placeId)

    let r = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}&_extreq`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
        },
        "method": "GET",
        "credentials": "include"
    })
    let data = await r.json()
    return data["data"][0]
}

async function getSubplacesFromGame(placeId) {
    const universeId = await getUniverseId(placeId)

    let subplaces_list = []
    let next_cursor = ""

    while (true) {
        let r = await fetch(`https://develop.roblox.com/v1/universes/${universeId}/places?isUniverseCreation=false&limit=100&cursor=${next_cursor}&_extreq`, {
          "headers": {
            "accept": "application/json, text/plain, */*",
          },
          "method": "GET",
          "credentials": "include"
        })
        let data = await r.json()

        subplaces_list.push(...data["data"] || [])

        next_cursor = data["nextPageCursor"]
        if (next_cursor == null) {
            break
        };
    }

    return subplaces_list
}

async function getPlaceIdThumbnail(placeId) {
    let r = await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false&_extreq`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
        },
        "method": "GET",
        "credentials": "include"
    })
    let data = await r.json()
    return data["data"][0]["imageUrl"]
}

async function getCSRFToken() {
    const res = await fetch("https://auth.roblox.com/v2/logout?_extreq", {
        method: "POST",
        credentials: "include"
    })
    return res.headers.get("x-csrf-token")
}

async function getAuthTicket(csrf) {
    const res = await fetch("https://auth.roblox.com/v1/authentication-ticket?_extreq", {
        method: "POST",
        credentials: "include",
        headers: {
            "X-CSRF-TOKEN": csrf,
            "Referer": "https://www.roblox.com/",
            "Content-Type": "application/json"
        }
    })
    return res.headers.get("rbx-authentication-ticket")
}

let _cachedCookie = null

async function getCookie() {
    if (_cachedCookie) return _cachedCookie
    const { cookie } = await new Promise(resolve =>
        chrome.runtime.sendMessage({ type: "GET_COOKIE" }, resolve)
    )
    _cachedCookie = cookie
    return cookie
}

async function getServersFromPlaceId(placeId) {
    let server_list = []
    let cursor = ""

    while (true) {
        while (true) {
            try {
                const r = await fetch(`https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&sortOrder=Desc&excludeFullGames=true&cursor=${cursor}&_extreq`, {
                    method: "GET",
                    credentials: "include"
                })

                if (r.status === 429) {

                    console.warn(`Rate limited, retrying in 2s...`)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    continue // retry same cursor
                }

                const data = await r.json()
                server_list.push(...(data["data"] || []))
                cursor = data["nextPageCursor"]
                break
            } catch {
                continue
            }
        }

        if (!cursor) break
    }
    
    cursor = ""
    while (true) {
        while (true) {
            try {
                const r = await fetch(`https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&sortOrder=Asc&excludeFullGames=true&cursor=${cursor}&_extreq`, {
                    method: "GET",
                    credentials: "include"
                })

                if (r.status === 429) {

                    console.warn(`Rate limited, retrying in 2s...`)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    continue // retry same cursor
                }

                const data = await r.json()
                server_list.push(...(data["data"] || []))
                cursor = data["nextPageCursor"]
                break
            } catch {
                continue
            }
        }

        if (!cursor) break
    }

    return server_list
}

async function joinInstanceInfo(placeId, serverIds) {
    const cookie = await getCookie()

    let r = await fetch("https://rolion.netlify.app/api/joingameinstance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roblosecurity: cookie, placeId, serverIds })
    })

    let d = await r.json()
    return d["data"] // array of { serverId, data }
}