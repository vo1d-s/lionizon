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

async function getPlaceIdThumbnail(placeId, size="512x512", format="Png", isCircular=false) {
    let r = await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=${size}&format=${format}&isCircular=${isCircular}&_extreq`, {
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

async function getUsersThumbnail(userIds, size="420x420", format="Png", isCircular=false) {
    const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join()}&size=${size}&format=${format}&isCircular=${isCircular}&_extreq`, { credentials: "include" })
    const data = await r.json()
    return data.data
}

async function joinInstanceInfo(placeId, serverIds) {
    const r = await fetch(`https://api-servers.juliozapatahernandez2006.workers.dev/join-game-instance?_extreq`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "placeId": placeId,
            "serverIds": serverIds
        })
    })
    const data = await r.json()
    console.log(data)
    return data.data
}

async function getRobux() {
    let userId = await getLoggedInUserId()
    const r = await fetch(`https://economy.roblox.com/v1/users/${userId}/currency?_extreq`, { credentials: "include" })
    const data = await r.json()

    return data.robux
}