async function getConversionRate(currency, amount) {
    const r = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${currency}&amount=${amount}`)
    if (!r.ok) return null

    const data = await r.json()
    const converted_amount = data.rates[currency]
    return converted_amount
}

(async () => {
    const saved_settings = await loadData("lionizon_settings", { currency: "USD", convert_rbx_to_currency: "Enabled" })
    await saveData({ lionizon_settings: saved_settings })

    let convert_enabled = saved_settings.convert_rbx_to_currency === "Enabled"
    let chosen_currency = saved_settings.currency

    if (!convert_enabled) return

    const current_rbx = await getRobux()
    const current_rbx_to_eur = 0.011995 * current_rbx

    let converted = current_rbx_to_eur.toFixed(2)
    if (chosen_currency != "EUR") {
        converted = await getConversionRate(chosen_currency, current_rbx_to_eur)
        converted = (converted ?? current_rbx_to_eur).toFixed(2)
    }

    log("CONVERSION RATES", converted)

    observeElement("#nav-robux-icon", (el) => {
        const convertedEl = document.createElement("p")
        el.append(convertedEl)

        convertedEl.textContent = `(${converted} ${chosen_currency})`
    })
})()