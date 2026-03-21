importScripts("../utils/misc.js", "../utils/roblox_api.js")

const savePlaytimeInterval = 0.25

async function savePlaytime() {

    // Get current userId and presence

    const loggedId = await getLoggedInUserId()
    let presence = await getPresences([loggedId])
    presence = presence[0]

    let rootPlaceId = presence["rootPlaceId"]
    let presenceType = presence["userPresenceType"]
    let lastLocation = presence["lastLocation"]
    //let gameId = presence["gameId"]

    // Load past data

    let playtimeData = await loadData("ext_playtime_data")

    if (presenceType == 2) { // User is playing

        // Total playtime logic

        if (!playtimeData[rootPlaceId]) {
            playtimeData[rootPlaceId] = {
                "name": lastLocation,
                "total_min": 0
            }
        }

        playtimeData[rootPlaceId]["total_min"] += savePlaytimeInterval
        console.log(`${extensionName}: Updating playtime | ${lastLocation} - ${playtimeData[rootPlaceId]["total_min"]}`)

        // Daily playtime logic

        const today = new Date().toISOString().split("T")[0];

        if (!playtimeData[rootPlaceId]["history"]) {
            playtimeData[rootPlaceId]["history"] = {}
        }

        if (!playtimeData[rootPlaceId]["history"][today]) {
            playtimeData[rootPlaceId]["history"][today] = 0
        }

        playtimeData[rootPlaceId]["history"][today] += savePlaytimeInterval
    }

    console.log(`${extensionName}: Current presence`, presence)
    await saveData({ "ext_playtime_data": playtimeData })
}

;(async () => {
    const existing = await chrome.alarms.get("poll")
    if (!existing) {
        chrome.alarms.create("poll", { periodInMinutes: savePlaytimeInterval })
    }
    chrome.alarms.onAlarm.addListener(savePlaytime)
})()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_COOKIE") {
        chrome.cookies.get({ url: "https://www.roblox.com", name: ".ROBLOSECURITY" }, (cookie) => {
            sendResponse({ cookie: cookie?.value })
        })
        return true
    }
})