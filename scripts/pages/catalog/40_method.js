(async () => {
    let lastUrl = location.href;

    const initInjection = async () => {
        const url = window.location.href;
        let productId = null;
        let productType = 3;

        if (url.includes("catalog/")) {
            productId = parseInt(url.split("catalog/")[1]?.split("/")[0]);
            productType = 1;
        } else if (url.includes("bundles/")) {
            productId = parseInt(url.split("bundles/")[1]?.split("/")[0]);
            productType = 2;
        } else if (url.includes("game-pass/")) {
            productId = parseInt(url.split("game-pass/")[1]?.split("/")[0]);
            productType = 3;
        }

        if (productId && !isNaN(productId)) {
            let productInfo
            if (productType == 1) { productInfo = await getAssetInfo(productId) }
            else if (productType == 2) { productInfo = await getBundleInfo(productId) }
            else if (productType == 3) { productInfo = await getGamepassInfo(productId) }

            let productImg
            if (productType == 1) { productImg = await getAssetThumbnail(productId) }
            else if (productType == 2) { productImg = await getBundleThumbnail(productId) }
            else if (productType == 3) { productImg = await getGamepassThumbnail(productId) }

            productImg = productImg[0].imageUrl

            let price = (productInfo?.PriceInRobux || productInfo?.product?.priceInRobux) ?? 0;

            let saved_percent = [1, 2].includes(productType) ? 40 : 10
            let saved = Math.floor(price * (saved_percent/100))

            let robux = await getRobux()

            log(`Product Updated: ${productId} | Price: ${price} | Type: ${productType}`);

            observeAdded(".unified-purchase-dialog-content", async (dialog) => {
                const saved_settings = await loadData("lionizon_settings", { save_method_placeid: null })
                await saveData({ lionizon_settings: saved_settings })
                
                const confirmBtn = dialog.querySelector("button[data-testid='purchase-confirm-button']");
                if (!confirmBtn) return;

                const buttonRowEl = confirmBtn.parentElement;
                
                if (buttonRowEl.querySelector(".custom-save-btn")) {
                    buttonRowEl.querySelector(".custom-save-btn").remove();
                }

                buttonRowEl.style.gap = "10px";
                buttonRowEl.insertAdjacentHTML("afterbegin", `
                    <button type="button" class="custom-save-btn foundation-web-button relative clip group/interactable flex items-center justify-center radius-medium text-label-large height-1200 padding-x-large" 
                            style="text-decoration: none; border: 1px solid color-mix(in srgb, var(--color-content-emphasis), transparent 50%); background: none; flex: 1;">
                        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)]"></div>
                        <span class="padding-y-xsmall text-no-wrap" style="position: relative; z-index: 1;">
                            Save ${saved} robux (${saved_percent}%) 
                        </span>
                    </button> 
                `);

                const saveBtn = buttonRowEl.querySelector(".custom-save-btn")
                saveBtn.addEventListener("click", async () => {
                    dialog.querySelector(".foundation-web-close-affordance").click()
                    //dialog.closest(".foundation-web-dialog-overlay").remove()
                    let saveDialogHTML = `
                    <div data-state="open" class="foundation-web-dialog-overlay padding-y-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;">
                        <div role="dialog" data-state="open" class="lionizon-save-dialog relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high unified-purchase-dialog-content" data-size="Large" tabindex="-1" style="pointer-events: auto; width: 100px !important">
                            <div class="absolute foundation-web-dialog-close-container">
                                <button type="button" aria-label="Close" id="close-custom-dialog" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-medium radius-circle">
                                    <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
                                    <span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-large)]"></span>
                                </button>
                            </div>
                            <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge gap-xlarge flex flex-col">
                                <span style="position: absolute; border: 0px; width: 1px; height: 1px; padding: 0px; margin: -1px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; overflow-wrap: normal;">
                                    <h2>Buy Item</h2>
                                </span>
                                <div style="margin-top: 2px;">
                                    <div class="flex flex-row items-center justify-between" style="padding-right: 42px;">
                                        <span class="text-heading-medium">Buy Item</span>
                                        <div class="flex flex-row items-center">
                                            <span class="icon-robux-16x16"></span>
                                            <span class="text-robux ml-1 text-body-medium">${robux}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-row items-center gap-large">
                                    <div class="relative shrink-0 unified-modal-thumbnail-container" style="width: 60px; max-width: 40vw; max-height: 40vw; height: 60px;">
                                        <div class="rounded" style="width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.06);"></div>
                                        <div class="absolute unified-modal-thumbnail" style="inset: 0px; display: flex; align-items: center; justify-content: center;">
                                            <div class="marketplace-item-purchase-thumbnail-outer-container">
                                                <div class="marketplace-item-purchase-thumbnail-container" style="width: 60px; height: 60px;">
                                                    <span class="thumbnail-2d-container">
                                                        <img class="" src="${productImg}" alt="" title="">
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="min-w-0 flex flex-col gap-small">
                                        <span class="text-body-large break-words">
                                            <span class="font-bold">${productInfo.Name || productInfo.name}</span>
                                        </span>
                                        <div class="flex flex-row items-center lionizon-price-row">
                                            <div class="flex align-center justify-center lionizon-strikethrough">
                                                <span class="icon-robux-16x16"></span>
                                                <span class="text-robux">${price}</span>
                                            </div>
                                            <div class="flex align-center justify-center">
                                                <span class="icon-robux-16x16"></span>
                                                <span class="text-robux">${price - saved}</span>
                                            </div>
                                            <div class="lionizon-discount-badge">-${saved_percent}%</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center lionizon-savings-bar">
                                    <p style="color: #9dd79f;">You save</p>
                                    <div class="flex items-center justify-center">
                                        <span class="icon-robux-16x16 lionizon-savings-robux-icon"></span>${saved}
                                    </div>
                                </div>
                                <div class="rbx-divider" style="margin-bottom: 0;"></div>
                                <div class="lionizon-place-setup">
                                    <p>Setup place</p>
                                    <input type="text" id="lionizon-save-placeid" class="lionizon-place-input" placeholder="Place ID" ${saved_settings.save_method_placeid ? `value="${saved_settings.save_method_placeid}"` : ""}>
                                </div>
                            </div>
                            <div class="padding-x-xlarge padding-bottom-xlarge flex flex-col mt-[40px]">
                                <div class="gap-small flex flex-col">
                                    <div class="flex flex-row-reverse" style="gap: 10px;">
                                        <button type="button" class="lionizon-save-btn foundation-web-button relative clip group/interactable flex items-center justify-center radius-medium text-label-large height-1200 padding-x-large lionizon-buy-btn">
                                            <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)]"></div>
                                            <span class="padding-y-xsmall text-no-wrap" style="position: relative; z-index: 1;">Save ${saved} robux (${saved_percent}%) </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    `

                    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    document.body.insertAdjacentHTML("beforeend", saveDialogHTML)
                    const saveDialog = document.querySelector(".lionizon-save-dialog")

                    saveDialog.querySelector("#close-custom-dialog").onclick = () => saveDialog.closest(".foundation-web-dialog-overlay").remove();

                    const placeIdEl = saveDialog.querySelector("#lionizon-save-placeid")

                    const saveBtn = saveDialog.querySelector(".lionizon-save-btn")
                    saveBtn.addEventListener("click", async () => {
                        console.log(placeIdEl.value)
                        let placeId = parseInt(placeIdEl.value)
                        if (!placeId) return

                        saved_settings.save_method_placeid = placeId
                        await saveData({ lionizon_settings: saved_settings })

                        console.log("Confirming purchase:", { placeId, productId, productType, price: (price - saved) });

                        const a = document.createElement("a")
                        a.href = `roblox://experiences/start?placeId=${placeId}&launchData=${productId},${productType}`
                        a.style.display = "none"
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                    })
                })
            });
        }
    };

    initInjection();

    // detect url change
    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            log("URL changed, re-initializing...");
            initInjection();
        }
    });

    observer.observe(document, { subtree: true, childList: true });
})();