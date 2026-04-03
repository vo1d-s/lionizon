(async () => {
    if (window.location.href.includes("/games/")) {
        observeElement(".btn-common-play-game-lg", (btn) => {
            let container = btn.parentElement
            container.classList.add("flex")
            container.style.flexDirection = "row"
            container.style.gap = "2px"

            container.insertAdjacentHTML("beforeend", `
            <button type="button" id="random-main-btn" class="btn-common-play-game-lg btn-primary-md btn-full-width" data-testid="play-button" style="
                width: 25%;
            "><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle-icon lucide-shuffle"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/></svg></button>    
            `)

            let random_btn = container.querySelector("#random-main-btn")
            random_btn.addEventListener("click", async () => {
                const pageGameId = parseInt(window.location.href.split("games/")[1].split("/")[0]);

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
                            <img src="${chrome.runtime.getURL('assets/icons/cat128.png')}" class="app-icon-windows size-1600">
                            <h2 class="text-heading-small padding-x-xxlarge text-align-x-center">
                                Fetching random server. 
                                Please be patient...
                            </h2>
                        </div>

                        <div class="dialog-button-container padding-x-xlarge padding-bottom-xlarge flex">
                            <button type="button" class="foundation-web-button cursor-pointer flex items-center justify-center radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis grow stroke-none" style="background-color: #dfa834">
                                <div aria-hidden="true" class="absolute flex"><svg class="foundation-web-loading-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M10 2.75C8.56609 2.75 7.16438 3.1752 5.97212 3.97185C4.77986 4.76849 3.85061 5.90078 3.30188 7.22554C2.75314 8.55031 2.60957 10.008 2.88931 11.4144C3.16905 12.8208 3.85955 14.1126 4.87348 15.1265C5.88741 16.1405 7.17924 16.831 8.5856 17.1107C9.99196 17.3904 11.4497 17.2469 12.7745 16.6981C14.0992 16.1494 15.2315 15.2201 16.0282 14.0279C16.8248 12.8356 17.25 11.4339 17.25 10C17.25 9.58579 17.5858 9.25 18 9.25C18.4142 9.25 18.75 9.58579 18.75 10C18.75 11.7306 18.2368 13.4223 17.2754 14.8612C16.3139 16.3002 14.9473 17.4217 13.3485 18.0839C11.7496 18.7462 9.9903 18.9195 8.29296 18.5819C6.59563 18.2443 5.03653 17.4109 3.81282 16.1872C2.58911 14.9635 1.75575 13.4044 1.41813 11.707C1.08051 10.0097 1.25379 8.25037 1.91606 6.65152C2.57832 5.05267 3.69983 3.6861 5.13876 2.72464C6.57769 1.76318 8.26942 1.25 10 1.25C10.4142 1.25 10.75 1.58579 10.75 2C10.75 2.41421 10.4142 2.75 10 2.75Z"></path></svg></div>
                            </button>
                        </div>

                    </div>
                </div>
                `)
                const launchDialog = document.querySelector(".foundation-web-dialog-overlay")

                const all_servers_data = await getAllServers(pageGameId)
                let random_server = all_servers_data.server_list[Math.floor(Math.random() * all_servers_data.server_list.length)]

                let ping = random_server.ping
                let fps = random_server.fps
                let players = random_server.playing
                let max_players = random_server.maxPlayers
                let server_id = random_server.id

                function getPingStatus(ping) {
                    if (ping <= 40) return { color: "#59f6ff", text: "Elite" };
                    if (ping <= 120) return { color: "#75ff74", text: "Good" };
                    if (ping <= 200) return { color: "#ffe143", text: "Stable" };
                    return { color: "#ff4c4c", text: "Lagging" };
                }

                console.log("GOT SERVER", random_server)

                if (random_server) {
                    const launchDialogContent = launchDialog.querySelector(".foundation-web-dialog-content")

                    launchDialogContent.querySelector(".dialog-main-container h2").textContent = "Server found! Launching..."
                    launchDialogContent.querySelector(".dialog-main-container").insertAdjacentHTML("beforeend", `
                    <div class="lionizon-server-info">
                        <p style="font-size: 11px; text-align: center; margin-top:-20px">ID: ${server_id}</p> 

                        <div class="rbx-divider" style="width: 100%;margin: 15px 0px;"></div> 

                        <div class="flex items-center justify-center" style="gap:5px; margin-bottom:10px !important">
                            <div class="horizontal-pill flex items-center" style="gap:5px; background:var(--color-over-media-0) !important;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
                                <p class="server-plrs">${players} / ${max_players}</p>
                            </div>
                            <div class="horizontal-pill flex items-center" style="gap:5px; background:var(--color-over-media-0) !important;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" style="flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="${getPingStatus(ping).color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe-icon lucide-globe"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
                                <p class="server-ping" style="color: ${getPingStatus(ping).color} !important">${ping} ms</p>
                            </div>
                            <div class="horizontal-pill flex items-center" style="gap:5px; background:var(--color-over-media-0) !important;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" style="flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gauge-icon lucide-gauge"><path d="m12 14 4-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path></svg>
                                <p class="server-fps">${Math.round(fps)} fps</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-center" style="gap:8px; margin-bottom: 5px">
                            <span class="location-flag-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ban-icon lucide-ban"><circle cx="12" cy="12" r="10"/><path d="M4.929 4.929 19.07 19.071"/></svg>
                            </span>
                            <p class="server-location">Full server</p>
                        </div>
                        <div class="rbx-divider" style="width: 100%;margin-top: 15px;"></div>
                    </div>
                    `)

                    const serverLocEl = launchDialogContent.querySelector(".dialog-main-container div .server-location")
                    
                    processServersLocationBatch([{ id: server_id }], pageGameId);

                    waitForLocation(server_id).then(serverLocation => {
                        if (!serverLocation) { return }

                        serverLocEl.textContent = serverLocation.location ?? "Full server";

                        let flagContainer = launchDialogContent.querySelector("div .location-flag-container")
                        flagContainer.innerHTML = `<img src="https://hatscripts.github.io/circle-flags/flags/${serverLocation.country.toLowerCase()}.svg">`
                    })

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
                    a.href = `roblox://experiences/start?placeId=${pageGameId}&gameInstanceId=${server_id}`
                    a.style.display = "none"
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                }
            })
        })
    }
})();