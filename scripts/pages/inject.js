const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const url = typeof args[0] === "string"
        ? args[0]
        : args[0]?.url;

    if (url && url.includes("_extreq")) {
        return originalFetch(...args);
    }

    const res = await originalFetch(...args);

    if (url && url.includes("/servers/Public")) {
        const clone = res.clone();
        clone.json().then(data => {
            window.postMessage({
                type: "ROBLOX_SERVERS",
                data
            }, "*");
        });
    }

    return res;
};

const origOpen = XMLHttpRequest.prototype.open;
const origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return origOpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && this._url.includes("_extreq")) {
        return origSend.apply(this, args);
    }

    this.addEventListener("load", function () {
        if (this._url && this._url.includes("/servers/Public")) {
            try {
                const data = JSON.parse(this.responseText);

                window.postMessage({
                    type: "ROBLOX_SERVERS",
                    data
                }, "*");

            } catch (e) {}
        }
    });

    return origSend.apply(this, args);
};