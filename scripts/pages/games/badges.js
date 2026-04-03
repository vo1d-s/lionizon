if (window.location.href.includes("/games/")) {
    let pendingBadges = []
    let batchTimer = null

    async function processBatch(badges) {
        let ids = badges.map(b => b.id)

        log("Processing badge batch", ids)
        let awarded_badges = await getBadgesAwardDate(ids)

        const awardedMap = new Map(awarded_badges.map(b => [String(b.badgeId), b]))

        for (let { element, id } of badges) {
            try {
                const data = awardedMap.get(id)
                if (!data) {
                    element.insertAdjacentHTML("afterbegin", `
                        <div class="lionizon-locked-badge" style="
                            left: 0;
                            top: 0;
                            z-index: 1;
                            height: 100%;
                            width: 100%;
                            position: absolute;
                            background: black;
                            opacity: 0.25;
                        "></div>
                    `)
                    continue
                }

                log("Element", element, "Badge", id, "awarded at", data.awardedDate)

                const formatted_date = new Date(data.awardedDate.split("T")[0]).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric"
                })
                // March 6, 2026

                element.querySelector(".badge-name").style.width = "85% !important"
                element.insertAdjacentHTML("beforeend", `
                <p style="position: absolute; right: 12px; top: 12px; font-size: 13px !important; color: var(--color-content-emphasis) !important">Awarded ${formatted_date}</p>
                `)
            } catch {}
        }
    }

    observeAdded(".badge-container.game-badges-list ul .badge-row", (badgeEl) => {
        badgeEl.style.zoom = "0.85"

        const badgeId = badgeEl.querySelector(".badge-image a").href.split("/badges/")[1].split("/")[0]
        pendingBadges.push({element: badgeEl, id: badgeId})

        clearTimeout(batchTimer)
        batchTimer = setTimeout(() => {
            processBatch(pendingBadges)
            pendingBadges = []
        }, 1)
    })
}