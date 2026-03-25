if (window.location.href.includes("/home")) {
    observeElement(".rbx-left-col", (header) => {
        const left_col = document.querySelector(".rbx-left-col")
        left_col.classList.add("nav-show")
    })

    let banner_created = false

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

            const thumbnail = document.createElement("img")
            thumbnail.src = "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-6EF0E29E243BDBACDC85B8E13DDC7378-Png/420/420/AvatarHeadshot/Png/noFilter"
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

    // OBSERVE FRIENDS
    // damn thats creepy

    //friends-carousel-list-container

    const previousStates = new Map() // userId -> currentGame

    const status_observer = new MutationObserver(() => {
        const element = document.querySelector(".friends-carousel-list-container")
        if (!element) return

        const friend_cards = element.querySelectorAll(".avatar.avatar-card-fullbody")
        
        friend_cards.forEach(card => {
            const profileLink = card.querySelector(".avatar-card-link").href
            const userId = profileLink.split("/users/")[1].split("/")[0]
            const presenceIcon = card.querySelector("[data-testid='presence-icon']")
            const currentGame = presenceIcon ? presenceIcon.getAttribute("title") : null
            const previousGame = previousStates.get(userId)

            const user_status = presenceIcon ? presenceIcon.classList[0] : null

            // Only fires if this user's status actually changed
            if (previousGame !== currentGame) {
                log(`${userId} changed: ${previousGame} → ${currentGame}`, user_status)
                previousStates.set(userId, currentGame)
            }

            const image_card = card.querySelector(".avatar-card-image")

            if (user_status == "game") {
                image_card.style.border = "solid 3px #02b757"
            } else if (user_status == "online") {
                image_card.style.border = "solid 3px #00a2ff"
            } else if (user_status == "studio") {
                image_card.style.border = "solid 3px #f68802"
            }
            
        })
    })

    status_observer.observe(document, {
        childList: true,
        subtree: true,
        attributeFilter: ["class"] // only watch for title attribute changes
    })
}