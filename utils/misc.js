const extensionName = chrome.runtime.getManifest().name

async function loadData(name, defaultValue = {}) {
    const result = await chrome.storage.local.get(name);
    const data = result[name] ?? defaultValue;

    log("Data loaded for", name, data);
    return data;
}

async function saveData(data) {
  await chrome.storage.local.set(data);
  log("Data saved.")
}

function observeElement(selector, callback) {
    log(`Started observer for ${selector}`)
    const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
            log(`Found element ${selector}, disconnecting observer...`)
            obs.disconnect();
            callback(element);
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

function observeAdded(selector, callback, parent = document) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return
                    if (node.matches(selector)) callback(node)
                    node.querySelectorAll(selector).forEach(callback)
                })
            }

            if (mutation.type === "attributes") {
                const target = mutation.target
                if (target.nodeType !== 1) return
                if (target.matches(selector)) callback(target)
            }
        })
    })

    observer.observe(parent, { childList: true, subtree: true, attributes: true })
}


const log = (...args) => {
    console.log(
        "%cLionizon%c:", 
        "color: #ff9900; font-weight: bold;", 
        "", 
        ...args
    );
};