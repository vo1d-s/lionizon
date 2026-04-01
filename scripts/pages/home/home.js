(async () => {
    const saved_settings = await loadData("lionizon_settings", { home_banner_enabled: true, user_presence_circles: true })
    await saveData({ lionizon_settings: saved_settings })

    if (window.location.href.includes("/home") || window.location.href.includes("/friends") && saved_settings.user_presence_circles) {

        const previousStates = new Map() // userId -> currentGame
        const observedTiles = new Set()

        const status_observer = new MutationObserver(() => {

            const friend_cards = document.querySelectorAll(
                ".friends-carousel-list-container .avatar.avatar-card-fullbody, " +
                ".avatar-card-content .avatar.avatar-card-fullbody"
            )
            
            friend_cards.forEach(async card => {
                const profileLink = card.querySelector(".avatar-card-link").href
                const userId = profileLink.split("/users/")[1].split("/")[0]
                const presenceIcon = card.querySelector("[data-testid='presence-icon']")
                const currentGame = presenceIcon ? presenceIcon.getAttribute("title") : null
                const previousGame = previousStates.get(userId)

                const user_status = presenceIcon ? presenceIcon.classList[0] : null

                // fires if status really changes
                if (previousGame !== currentGame) {
                    log(`${userId} changed: ${previousGame} → ${currentGame}`, user_status)
                    previousStates.set(userId, currentGame)

                    const image_card = card.querySelector(".avatar-card-image")

                    if (user_status == "game") {
                        image_card.style.border = "solid 3px #02b757"
                    } else if (user_status == "online") {
                        image_card.style.border = "solid 3px #00a2ff"
                    } else if (user_status == "studio") {
                        image_card.style.border = "solid 3px #f68802"
                    }

                    let presence = null
                    let attempts = 0
                    while (!presence && attempts++ < 5) {
                        presence = (await getPresences([userId]))?.[0]
                    }
                    if (!presence) return

                    let serverId = presence.gameId
                    let placeId = presence.placeId
                    let universeId = presence.universeId

                    const tile = card.closest(".friends-carousel-tile") ?? card.closest(".avatar-card-content")
                    if (!observedTiles.has(tile)) {
                        observedTiles.add(tile)
                        observeAdded("div", async (el) => {
                            if (el.style.position === "absolute") {
                                const results = await handleServerLocation([serverId], placeId)
                                let location = results[serverId]?.location
                                let popup_info = el.querySelector(".friend-presence-info")

                                if (location) {
                                    popup_info.children[0].insertAdjacentHTML("afterend",`
                                        <p style="font-size: 14px">${location}</p>
                                    `)
                                } else {
                                    popup_info.children[0].insertAdjacentHTML("afterend",`
                                        <p style="font-size: 14px">Full or reserved server</p>
                                    `)
                                }
                            }
                        }, tile)
                    }
                }
            })
        })

        status_observer.observe(document, {
            childList: true,
            subtree: true,
            attributeFilter: ["class"]
        })
    }

    if (window.location.href.includes("/home")) {
        observeElement(".rbx-left-col", (header) => {
            const left_col = document.querySelector(".rbx-left-col")
            left_col.classList.add("nav-show")
        })

        // saved setting inverted due to false == create and true == already created
        let banner_created = saved_settings.home_banner_enabled === "Disabled" ?? false

        const observer = new MutationObserver(async (mutations, obs) => {
            const content = document.querySelector("#container-main .content #HomeContainer");
            if (content) {
                const content = document.querySelector("#container-main .content #HomeContainer")

                if (content.querySelector("#profile-view-banner") || banner_created) { return }
                banner_created = true

                const userId = await getLoggedInUserId()
                const displayName = await getLoggedInUserDisplay()

                let presence = await getPresences([userId])
                let presenceType = presence[0]["userPresenceType"]
            
                const main_frame = document.createElement("div")
                main_frame.id = "profile-view-banner"
                main_frame.style.background = "#191a1f"
                main_frame.style.height = "215px"
                main_frame.style.width = "84vw"
                main_frame.style.display = "flex"
                main_frame.style.justifyContent = "flex-start"
                main_frame.style.alignItems = "center"
                main_frame.style.gap = "35px"
                main_frame.style.borderRadius = "20px"
                main_frame.style.padding = "25px"
                content.prepend(main_frame)

                const thumbnail_span = document.createElement("span")
                thumbnail_span.classList.add("thumbnail-2d-container", "avatar-card-image")
                thumbnail_span.style.width = "165px"
                thumbnail_span.style.height = "165px"
                thumbnail_span.style.borderRadius = "100%"
                main_frame.appendChild(thumbnail_span)

                if (presenceType == 2) {
                    thumbnail_span.style.border = "solid 3px #02b757"
                } else if (presenceType == 1) {
                    thumbnail_span.style.border = "solid 3px #00a2ff"
                } else if (presenceType == 3) {
                    thumbnail_span.style.border = "solid 3px #f68802"
                }

                const userThumbnail = await getUsersThumbnail([userId])

                const thumbnail = document.createElement("img")
                thumbnail.src = userThumbnail[0].imageUrl
                thumbnail_span.appendChild(thumbnail)

                const text = document.createElement("h1")
                text.innerText = `Hello, ${displayName}!`
                text.style.fontSize = "50px"
                main_frame.appendChild(text)
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }
})();