const gameDetailsUpdateSecs = 2.5

const IP_API_URL = "https://api-geolocation.juliozapatahernandez2006.workers.dev";

const locationCache = {};
const locationResolvers = {};

// fires when server data found
function resolveLocation(serverId, value) {
    locationCache[serverId] = value;
    if (locationResolvers[serverId]) {
        locationResolvers[serverId].forEach(resolve => resolve(value));
        delete locationResolvers[serverId];
    }
}

// returns a promise that resolves when the location for this server is known
// if found, returns, if waits 10s and it isnt there, keep default full text
function waitForLocation(serverId, timeout = 10000) {
    if (locationCache[serverId]) return Promise.resolve(locationCache[serverId]);

    return new Promise((resolve, reject) => {
        if (!locationResolvers[serverId]) locationResolvers[serverId] = [];
        locationResolvers[serverId].push(resolve);

        setTimeout(() => reject(`Timeout waiting for location ${serverId}`), timeout);
    });
}

async function getIPLocation(datacenters, placeId) {
    try {
        const res = await fetch(`${IP_API_URL}/geolocate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datacenters, placeId: placeId })
        });
        const data = await res.json();
        log("Got ip location", data);
        if (data.results) return data.results;
    } catch (e) {
        console.error("IP lookup failed", e);
    }
}

// this is for servers that arent already saved
async function getServerJoinLocation(serverIds, gameId) {
    log("Saved server not found, getting joininfo")

    let geo_db = await loadData("geo_db", {
        servers: {},
        addresses: {}
    });

    const notSavedServers = []

    const res = await fetch(`${IP_API_URL}/getsaved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverIds })
    });

    const data = await res.json();
    for (const id of serverIds) {
        if (data.results[id]) {
            const { ip, location } = data.results[id];

            geo_db.servers[id] = { ip, location };
            geo_db.addresses[ip] = { location };

            console.log("FOUND SERVER IN DB");
        } else {
            notSavedServers.push(id);
        }
    }
    //return await res.json(); // { serverId, ip, location }

    // get server gamejoin info, batch request
    let joinResults = await joinInstanceInfo(gameId, notSavedServers)

    console.log(joinResults) // DataCenterId

    // iterates every joinscript
    // no joinscript -> return (cannot get info)

    const ipMap = {}; // ip: serverid
    const datacenters = {}; // { dcId: { ip: [serverIds] } }

    for (let i = 0; i < notSavedServers.length; i++) {
        const joinScript = joinResults[i]?.data?.joinScript;
        if (!joinScript) continue;

        const ip = joinScript.UdmuxEndpoints[0].Address;
        const dc = String(joinScript.DataCenterId);

        if (geo_db.addresses[ip]) {
            geo_db.servers[notSavedServers[i]] = { ip, ...geo_db.addresses[ip] };
            continue;
        }

        if (!datacenters[dc]) datacenters[dc] = {};
        if (!datacenters[dc][ip]) datacenters[dc][ip] = [];
        datacenters[dc][ip].push(notSavedServers[i]);
    }
    
    if (Object.keys(datacenters).length > 0) {
        const locations = await getIPLocation(datacenters, gameId);

        for (const [serverId, loc] of Object.entries(locations)) {
            const location = loc.city ? `${loc.city}, ${loc.country_name}` : loc.country_name;

            const info = {
                country: loc.country,
                country_name: loc.country_name,
                city: loc.city,
                region: loc.region,
                region_code: loc.region_code,
                latitude: loc.latitude,
                longitude: loc.longitude,
                timezone: loc.timezone,
                postal_code: loc.postal_code,
                continent: loc.continent,
            }

            geo_db.servers[serverId] = { ip: loc.ip, location, ...info };
            geo_db.addresses[loc.ip] = { location, ...info};
        }
    }

    saveData({ geo_db });

    return Object.fromEntries(serverIds.map(id => [id, geo_db.servers[id]]).filter(([, v]) => v))
}

// fetch saved db for server details
async function handleServerLocation(serverIds, gameId) {
    if (!serverIds) return;

    const geo_db = await loadData("geo_db", {
        servers: {},
        addresses: {}
    });

    console.log("GEOOOOOO", geo_db)

    const cached = {};
    const missing = [];

    // fetches the ones that are missing
    for (const id of serverIds) {
        if (geo_db.servers[id]) {
            cached[id] = geo_db.servers[id];
        } else {
            missing.push(id);
        }
    }

    console.log("MISSINNNGG", missing)

    const fetched = missing.length > 0 ? await getServerJoinLocation(missing, gameId) : {};
    console.log(fetched)

    return { ...cached, ...fetched };
}   

if (window.location.href.includes("/games/")) { 
    const pageGameId = parseInt(window.location.href.split("games/")[1].split("/")[0])
    log(`User loaded game ${pageGameId}`)

    //;(async () => {
    //    let all_servers = await getServersFromPlaceId(pageGameId)
    //    let all_servers_loc = await handleServerLocation(all_servers.map(s => s.id), pageGameId)
//
    //    console.log(all_servers, all_servers_loc)
    //})();
    


    /* --------------------------- Server geolocation --------------------------- */

    // Intercept servers request
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/pages/games/inject.js");
    document.documentElement.appendChild(script);

    // already captured servers
    let server_list = []

    // when request appears
    window.addEventListener("message", async (event) => {
        if (event.data.type === "ROBLOX_SERVERS") {
            let servers = event.data.data.data

            //const sssssssssssss = await getServersFromPlaceId(pageGameId)
            //console.log(sssssssssssss)

            const existingIds = new Set(server_list.map(s => s.id));
            const newServers = servers.filter(s => !existingIds.has(s.id)); // just new servers that appeared

            // adds them to server list
            server_list = [...server_list, ...newServers];
            log("Total shown servers:", server_list.length);

            log(newServers)

            // fetch every location if it isnt saved
            const locations = await handleServerLocation(newServers.map(s => s.id), pageGameId);

            // sends location for the element to wait
            for (const [serverId, data] of Object.entries(locations)) {
                resolveLocation(serverId, data);
            }
        }
    });

    // download roblox dialog but in html for fast launch download
    download_roblox_dialog = `<div data-state="open" class="foundation-web-dialog-overlay padding-y-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;"><div role="dialog" id="radix-3" aria-describedby="radix-5" aria-labelledby="radix-4" data-state="open" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high install-dialog" data-size="Large" tabindex="-1" style="pointer-events: auto;"><div class="absolute foundation-web-dialog-close-container"><button type="button" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-medium radius-circle" aria-label="Close"><div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div><span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-large)]"></span></button></div><div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge content-default"><div class="flex flex-col gap-xlarge padding-xlarge"><div class="flex flex-col gap-xsmall"><h2 id="radix-4" class="text-heading-medium content-emphasis padding-none">Thanks for downloading Roblox</h2><p class="text-body-large">Just follow the steps below to install Roblox. Download should start in a few seconds. If it doesn't, <a href="https://www.roblox.com/download/client?os=win" class="download-link-underline">restart the download</a>.</p></div><div></div> <div class="flex gap-xxlarge"><section class="flex flex-col gap-large grow basis-0"><h3 class="text-title-large content-emphasis padding-none">Install Instructions</h3><ol class="download-instructions-list flex flex-col gap-xlarge margin-none padding-left-large text-body-medium"><li class="padding-left-medium">Once downloaded, double-click the <b>RobloxPlayerInstaller.exe</b> file in your Downloads folder.</li><li class="padding-left-medium">Double-click the <b>RobloxPlayerInstaller</b> to install the app.</li><li class="padding-left-medium">Follow the instructions to install Roblox to your computer.</li><li class="padding-left-medium">Now that it’s installed, <a id="download-join-experience" class="download-link-underline">join the experience</a>.</li></ol></section><div></div> <div class="stroke-standard stroke-default"></div><div></div> <section class="flex flex-col grow basis-0 gap-xxlarge"><div class="flex flex-col gap-small"><h3 class="text-label-large content-emphasis padding-none">Don't forget the mobile app</h3><p class="text-body-medium">Scan this code with your phone's camera to get Roblox.</p></div><div class="flex grow justify-center items-center bg-shift-100 radius-medium padding-x-large"><div class="radius-medium padding-small bg-[white]"><img class="size-2100" src="https://images.rbxcdn.com/79852c254bf43f36.webp" alt=""></div></div></section></div></div></div></div></div>`

    function animateCounter(element, from, to, duration = 1000) {
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = Math.round(from + (to - from) * eased);
            element.textContent = current.toLocaleString(); // formats 200530 → "200,530"

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    /* ------------------------------- Fast launch ------------------------------ */

    if (window.location.href.includes("#fast-join")) {
        history.replaceState(null, "", window.location.pathname)

        // adds custom fast launch dialog
        document.addEventListener("DOMContentLoaded", () => {
            document.body.insertAdjacentHTML("beforeend", `
            <div class="foundation-web-dialog-overlay padding-y-medium foundation-web-portal-zindex bg-common-backdrop">
                <div role="dialog" class="relative radius-large bg-surface-100 stroke-none foundation-web-dialog-content shadow-transient-high download-dialog" data-size="Medium">
                    
                    <!-- Close button -->
                    <div class="absolute foundation-web-dialog-close-container">
                        <button type="button" class="foundation-web-close-affordance flex bg-none cursor-pointer bg-over-media-100 padding-small radius-circle stroke-none" aria-label="Close">
                            <span class="icon icon-regular-x size-[var(--icon-size-medium)]"></span>
                        </button>
                    </div>

                    <!-- Icon + Title -->
                    <div class="dialog-main-container padding-x-xlarge padding-top-xlarge padding-bottom-xlarge flex flex-col items-center gap-xlarge">
                        <div class="app-icon-bluebg app-icon-windows size-1600" role="img" aria-label="App Icon"></div>
                        <h2 class="text-heading-small padding-x-xxlarge text-align-x-center">
                            Fast launching instance...
                        </h2>
                    </div>

                    <div class="dialog-button-container padding-x-xlarge padding-bottom-xlarge flex">
                        <button type="button" class="foundation-web-button cursor-pointer flex items-center justify-center radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis grow stroke-none">
                            <div aria-hidden="true" class="absolute flex"><svg class="foundation-web-loading-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M10 2.75C8.56609 2.75 7.16438 3.1752 5.97212 3.97185C4.77986 4.76849 3.85061 5.90078 3.30188 7.22554C2.75314 8.55031 2.60957 10.008 2.88931 11.4144C3.16905 12.8208 3.85955 14.1126 4.87348 15.1265C5.88741 16.1405 7.17924 16.831 8.5856 17.1107C9.99196 17.3904 11.4497 17.2469 12.7745 16.6981C14.0992 16.1494 15.2315 15.2201 16.0282 14.0279C16.8248 12.8356 17.25 11.4339 17.25 10C17.25 9.58579 17.5858 9.25 18 9.25C18.4142 9.25 18.75 9.58579 18.75 10C18.75 11.7306 18.2368 13.4223 17.2754 14.8612C16.3139 16.3002 14.9473 17.4217 13.3485 18.0839C11.7496 18.7462 9.9903 18.9195 8.29296 18.5819C6.59563 18.2443 5.03653 17.4109 3.81282 16.1872C2.58911 14.9635 1.75575 13.4044 1.41813 11.707C1.08051 10.0097 1.25379 8.25037 1.91606 6.65152C2.57832 5.05267 3.69983 3.6861 5.13876 2.72464C6.57769 1.76318 8.26942 1.25 10 1.25C10.4142 1.25 10.75 1.58579 10.75 2C10.75 2.41421 10.4142 2.75 10 2.75Z"></path></svg></div>
                        </button>
                    </div>

                </div>
            </div>
            `)

            const launchDialog = document.querySelector(".foundation-web-dialog-overlay")
            const launchDialogContent = launchDialog.querySelector(".foundation-web-dialog-content")

            const closeBtnLaunch = launchDialogContent.querySelector(".foundation-web-dialog-close-container button")
            closeBtnLaunch.addEventListener("click", () => {
                launchDialog.remove()
            })

            const dialogBtn = launchDialogContent.querySelector(".dialog-button-container button")
            setTimeout(() => {
                dialogBtn.innerHTML = "Download Roblox"
                dialogBtn.addEventListener("click", () => {
                    launchDialog.remove()
                    document.body.insertAdjacentHTML("beforeend", download_roblox_dialog)
                    
                    const installDialog = document.querySelector(".foundation-web-dialog-overlay .install-dialog")
                    const closeBtnInstall = installDialog.querySelector(".foundation-web-dialog-close-container button")
                    closeBtnInstall.addEventListener("click", () => {
                        installDialog.parentElement.remove()
                    })
                    
                    // download roblox
                    const dl = document.createElement("a")
                    dl.href = "https://www.roblox.com/download/client?os=win"
                    dl.style.display = "none"
                    document.body.appendChild(dl)
                    dl.click()
                    document.body.removeChild(dl)
                })
            }, 5000)


            // launch game
            const a = document.createElement("a")
            a.href = `roblox://experiences/start?placeId=${pageGameId}`
            a.style.display = "none"
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        })
    }

    /* ------------------------------ Playtime map ------------------------------ */

    observeElement(".game-description-container", async () => {
        const container = document.querySelector(".game-description-container")
        
        let t = document.createElement("h3")
        t.textContent = "Playtime History"
        container.appendChild(t)

        // load data
        let playtime_data = await loadData("ext_playtime_data")
        playtime_data = playtime_data[pageGameId] || {}

        // playtime history, also formatted in the cal format
        let history = playtime_data["history"] || {}
        let formatted_history = Object.entries(history).map(([date, value]) => ({ date, value }))

        log(`Got playtime data`, playtime_data)

        const today = new Date();
        const timeOffset = new Date(today.getFullYear() - 1, today.getMonth() + 1,8);

        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: flex; align-items: flex-start;";

        // day labels on the left
        const dayLabels = document.createElement("div");
        const cellSize = 13.25 + 2;
        const labelTopPadding = 22;
        dayLabels.style.cssText = `
            display: flex;
            flex-direction: column;
            padding-top: ${labelTopPadding}px;
            margin-right: 4px;
            font-size: 10px;
            color: #8b949e;
            line-height: ${cellSize}px;
        `;
        dayLabels.innerHTML = `
            <span style="height:${cellSize}px"></span>
            <span style="height:${cellSize}px">Mon</span>
            <span style="height:${cellSize}px"></span>
            <span style="height:${cellSize}px">Wed</span>
            <span style="height:${cellSize}px"></span>
            <span style="height:${cellSize}px">Fri</span>
            <span style="height:${cellSize}px"></span>
        `;

        let heatmap = document.createElement("div");
        heatmap.id = "cal-heatmap";

        wrapper.appendChild(dayLabels);
        wrapper.appendChild(heatmap);
        container.appendChild(wrapper);

        let cal = new CalHeatmap();
        cal.paint(
            {
                theme: "dark",
                itemSelector: "#cal-heatmap",
                date: {
                    start: timeOffset,
                },
                range: 12,
                domain: {
                    type: "month",
                    gutter: 4,
                    label: {
                        text: "MMM",
                        position: "top",
                    }
                },
                subDomain: {
                    type: "day",
                    radius: 3,
                    width: 13,
                    height: 13,
                },
                data: {
                    source: formatted_history,
                    x: "date",
                    y: "value"
                },
                scale: {
                    color: {
                        type: 'linear',
                        range: ["#2d333b", "#335fff"],
                        domain: [0, 360]
                    }
                },
            },
            [[Tooltip, {
                text: (timestamp, value, dayjsDate) => {
                    return value
                        ? `${dayjsDate.format("MMM D, YYYY")}: ${(value / 60).toFixed(2)} hours`
                        : dayjsDate.format("MMM D, YYYY");
                }
            }]]
        );
    })

    /* ----------------------------- Live game stats ---------------------------- */

    async function updateGameDetails() {
        let details = await getGameDetails(pageGameId)

        let players = details["playing"]
        let visits = details["visits"]
        let favorites = details["favoritedCount"]

        let parseInner = (el) => parseInt(el.innerText.replace(/\D/g, '')) || 0

        const playingText = document.querySelector(".game-stat-container li:nth-child(1) .text-lead.font-caption-body")
        const favoritesText = document.querySelector(".game-stat-container li:nth-child(2) .text-lead.font-caption-body")
        const visitsText = document.querySelector(".game-stat-container li:nth-child(3) .text-lead.font-caption-body")

        if (visitsText) {
            animateCounter(visitsText, parseInner(visitsText), visits, gameDetailsUpdateSecs * 1000);
        }
        if (favoritesText) {
            animateCounter(favoritesText, parseInner(favoritesText), favorites, gameDetailsUpdateSecs * 1000);
        }
        if (playingText) {
            animateCounter(playingText, parseInner(playingText), players, gameDetailsUpdateSecs * 1000);
        }
    }

    setInterval(updateGameDetails, gameDetailsUpdateSecs * 1000)


    /* ------------------------- More server logic lmao ------------------------- */

    // wait for full server id in server_list
    function waitForServerId(id, timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (server_list.find(s => s.id.includes(id))) return resolve(server_list.find(s => s.id.includes(id)));

            const start = Date.now();
            const interval = setInterval(() => {
                const found = server_list.find(s => s.id.includes(id));
                if (found) {
                    clearInterval(interval);
                    resolve(found);
                } else if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    reject(`Timeout waiting for server ${id}`);
                }
            }, 100);
        });
    }

    // when server element appears
    async function handleServerElement(el) {
        log("Server element added/changed:", el);

        // if id (text) changes, refetch
        const serverIdText = el.querySelector(".game-server-details .server-id-text");

        let lastText = serverIdText.textContent;

        const observer = new MutationObserver(() => {
            const newText = serverIdText.textContent;
            if (newText !== lastText) {
                lastText = newText;
                handleServerElement(el);
            }
        });

        observer.observe(serverIdText, { childList: true, subtree: true, characterData: true });

        let shortServerId = serverIdText.textContent.replace("ID:", "").trim()

        let serverInfo = await waitForServerId(shortServerId)
        const serverId = serverInfo["id"]
        const serverPing = serverInfo["ping"]
        const serverFps = serverInfo["fps"]

        serverIdText.textContent = `ID: ${serverId}`

        const serverDetails = el.querySelector(".game-server-details")

        let infoWrapper = serverDetails.querySelector(".info-wrapper")
        if (!infoWrapper) {
            infoWrapper = document.createElement("div")
            infoWrapper.classList.add("info-wrapper")
            infoWrapper.innerHTML = `
            <p class="server-ping">Ping: ${serverPing}ms</p>
            <p class="server-fps">FPS: ${serverFps}</p>
            <p class="server-location">Full server</p>
            `
            serverDetails.querySelector("span").prepend(infoWrapper)
        }

        const serverLocEl = infoWrapper.querySelector(".server-location")

        try {
            const serverLocation = await waitForLocation(serverId);
            serverLocEl.textContent = serverLocation.location ?? "Full server";
        } catch (e) {
            serverLocEl.textContent = "Full server";
        }
    }

    //let normalizeTimer = null;
    //function normalizeServerCardHeights() {
    //    clearTimeout(normalizeTimer);
    //    normalizeTimer = setTimeout(() => {
    //        const cards = [...document.querySelectorAll("#rbx-public-game-server-item-container .rbx-public-game-server-item .card-item")];
//
    //        for (let i = 0; i < cards.length; i += 4) {
    //            const row = cards.slice(i, i + 4);
    //            row.forEach(card => card.style.height = "");
    //            const tallest = Math.max(...row.map(card => card.offsetHeight));
    //            row.forEach(card => card.setAttribute("style", `height: ${tallest}px !important`));
    //        }
    //    }, 300);
    //}

    observeElement("#rbx-public-game-server-item-container", (container) => {
        container.querySelectorAll(".rbx-public-game-server-item .card-item").forEach(handleServerElement);
        observeAdded(".rbx-public-game-server-item .card-item", (el) => {
            handleServerElement(el)
            //normalizeServerCardHeights()
        }, container);
    });

    /* ------------------------------ Subplaces tab ----------------------------- */

    // wait for nav tabs where about, server, etc is
    observeElement(".nav.nav-tabs", async () => {
        const navTabs = document.querySelector(".nav.nav-tabs")
        const tabContents = document.querySelector(".tab-content.rbx-tab-content")

        // add subplaces tab
        navTabs.insertAdjacentHTML("beforeend", `
            <li id="tab-game-subplaces" class="rbx-tab tab-game-subplaces">
                <a class="rbx-tab-heading" href="#game-subplaces">
                    <span class="text-lead">Subplaces</span>
                </a>
            </li>
        `)

        // the panel needed where subplaces appear
        tabContents.insertAdjacentHTML("beforeend", `
        <div class="tab-pane game-subplaces" id="game-subplaces">
        </div>
        `)
        
        let subplacesPane = tabContents.querySelector(".tab-pane.game-subplaces")
        subplacesPane.style.display="none !important"

        // get every subplace
        let subplaces_list = await getSubplacesFromGame(pageGameId)
        subplaces_list.forEach(async (subplace) => {
            let subplaceName = subplace["name"]
            let subplaceId = subplace["id"]
            let subplaceThumb = await getPlaceIdThumbnail(subplaceId)

            const panel = document.createElement("div")
            subplacesPane.appendChild(panel)
            panel.classList.add("subplace-panel")

            panel.innerHTML = `
                <img class="subplace-thumbnail" src="${subplaceThumb}">
                <p class="subplace-title">${subplaceName}</p>
                <p class="subplace-id">${subplaceId}</p>
                <button type="button" class="mini-playbtn-subplace"><span class="icon-common-play"></span></button>
            `

            // play button, launch roblox
            const play_btn = panel.querySelector(".mini-playbtn-subplace")
            play_btn.addEventListener("click", () => {
                window.location.href = `roblox://experiences/start?placeId=${subplaceId}`
            })
        })

        // if init hash is
        if (window.location.hash === "#game-subplaces" || window.location.hash === "#!/game-subplaces") {
            tabContents.querySelectorAll(".tab-pane").forEach(tab => {
                tab.classList.remove("active")
            })
            subplacesPane.classList.add("active")
            subplacesPane.style.display = "grid !important"
        } else {
            subplacesPane.style.display = "none !important"
        }

        // if hash changes to
        window.addEventListener("hashchange", async () => {
            if (window.location.hash === "#game-subplaces" || window.location.hash === "#!/game-subplaces") {
                tabContents.querySelectorAll(".tab-pane").forEach(tab => {
                    tab.classList.remove("active")
                })
                subplacesPane.classList.add("active")
                subplacesPane.style.display = "grid !important"
            } else {
                subplacesPane.style.display = "none !important"
            }
        })
        
    })
}