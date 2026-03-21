function setupGameButtons() {
    const selector = [
        ".list-item.game-card.game-tile .game-card-container",
        ".list-item.hover-game-tile",
    ].join(", ")

    function bindCard(el) {
        if (el.dataset.hoverBound) return
        el.dataset.hoverBound = "true"

        // Insert wrapper immediately, not on hover
        let game_card = el.querySelector(".game-card-link")
        if (game_card && !game_card.querySelector(".extra-btns-wrapper")) {
            game_card.insertAdjacentHTML("beforeend", `
                <div class="extra-btns-wrapper">
                    <button class="mini-playbtn-thumbnail">
                        <span class="icon-common-play"></span>
                    </button>
                </div>
            `)
            const playBtn = el.querySelector(".mini-playbtn-thumbnail")
            playBtn.addEventListener("click", (e) => {
                e.preventDefault()
                e.stopPropagation()

                const gameLink = el.querySelector(".game-card-link")
                const href = gameLink?.href

                window.location.href = href + "#fast-join"
            })
        }
    }

    const observer = new MutationObserver(() => {
        document.querySelectorAll(selector).forEach(bindCard)
    })

    if (document.body) {
        document.querySelectorAll(selector).forEach(bindCard)
        observer.observe(document.body, { childList: true, subtree: true })
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            document.querySelectorAll(selector).forEach(bindCard)
            observer.observe(document.body, { childList: true, subtree: true })
        })
    }
}

setupGameButtons()