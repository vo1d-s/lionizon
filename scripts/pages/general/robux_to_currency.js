async function getConversionRate(currency, amount) {
    const r = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${currency}&amount=${amount}`)
    if (!r.ok) return null

    const data = await r.json()
    const converted_amount = data.rates[currency]
    return converted_amount
}

(async () => {
    const { data: saved_settings, success } = await loadData("lionizon_settings", { currency: "USD" }, true)

    if (!success) {
        await saveData({ lionizon_settings: { currency: "USD" }})
    }
    let chosen_currency = saved_settings.currency

    const current_rbx = await getRobux()
    const current_rbx_to_eur = 0.011995 * current_rbx

    let converted = current_rbx_to_eur.toFixed(2)
    if (chosen_currency != "EUR") {
        converted = await getConversionRate(chosen_currency, current_rbx_to_eur)
        converted = (converted ?? current_rbx_to_eur).toFixed(2)
    }

    console.log(current_rbx, current_rbx_to_eur, converted)

    log("CONVERSION RATES", converted)

    observeElement("#nav-robux-icon", (el) => {
        const convertedEl = document.createElement("p")
        el.append(convertedEl)

        convertedEl.textContent = `(${converted} ${chosen_currency})`
    })
})()