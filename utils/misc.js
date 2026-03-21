const extensionName = chrome.runtime.getManifest().name

async function loadData(name) {
    const result = await chrome.storage.local.get(name);
    let data = result[name] || {}
    console.log(`${extensionName}:`, "Data loaded for", name, data)
    return data
}

async function saveData(data) {
  await chrome.storage.local.set(data);
  console.log(`${extensionName}:`, "Data saved.")
}

function observeElement(selector, callback) {
    console.log(`${extensionName}:`,`Started observer for ${selector}`)
    const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`${extensionName}:`,`Found element ${selector}, disconnecting observer...`)
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