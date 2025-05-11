const USER_SCRIPT = "default";

chrome.userScripts.configureWorld(
    {messaging: true}
)
let customID = undefined;
const fetchFile = async (url) => {
    const response = await fetch(chrome.runtime.getURL(url));
    const text = await response.text();
    return text;
}

const sendMessageToTabs = (message, callback) => {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({}, tabs => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message, (response) => {
                    callback(response);
                    resolve(response);
                });
            });
        });
    });
}

const getSnapchatAPIJS = async () => {
    return await fetchFile("snapchatapi.js");
}

const formatCode = (code, periodic, delay) => {
    if(periodic) {
        return `let running = false;
let currentTimeoutPeriodic = undefined;
const delayPeriodic = ${delay};
const timeoutPeriodic = () => {
    currentTimeoutPeriodic = setTimeout(async () => {
        if(!running) return;
        await (async () => {${code}})();
        if(currentTimeoutPeriodic && running)
        timeoutPeriodic();
    }, delayPeriodic);
}`;

    } else {
        return `const funcNonPeriodic = async () => {
    ${code}
}`;
    }
}

const createListenerCode = async (periodic) => {
    if(periodic) {
        return await fetchFile("listeners/periodic.js");
    } else {
        return await fetchFile("listeners/nonperiodic.js");
    }
}

const updateUserScript = async (code, periodic, delay) => {
    customID = crypto.randomUUID();
    chrome.storage.local.set({userScript: code, periodic: periodic, periodicDelay: delay, customID: customID});
    const scripts = await chrome.userScripts.getScripts();
    const config = [{
        id: USER_SCRIPT,
        js: [{code: "(async () => {\n"+"const ID = \""+customID+"\";\n" + await getSnapchatAPIJS() + "\n" + formatCode(code, periodic, delay) + "\n" + await createListenerCode(periodic)+"\n})();"}],
        matches: ["https://*.snapchat.com/*"],
    }];
    if(scripts.length > 0) {
        await chrome.userScripts.update(config);
        return true;
    } else {
        await chrome.userScripts.register(config);
        return true;
    }
}

const getUserScript = async () => {
    const result = await chrome.storage.local.get(["userScript", "periodic", "periodicDelay", "customID"]);
    if (result.userScript || result.periodic || result.periodicDelay) {
        return result;
    } else {
        return {
            userScript: "",
            periodic: false,
            periodicDelay: 0
        };
    }
}

const reinjectUserScript = async () => {
    let scripts = await chrome.userScripts.getScripts()
    if (scripts.length > 0) {
        const script = scripts.find(script => script.id === USER_SCRIPT);
        if (script) {
            customID = crypto.randomUUID();
            chrome.storage.local.set({customID: customID});
            script.js[0].code = script.js[0].code.replace(/const ID = "[^"]*";/, `const ID = "${customID}";`);
            chrome.userScripts.update([script]);
            chrome.tabs.query({url: "https://*.snapchat.com/*"}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.userScripts.execute({
                        injectImmediately: true,
                        js: script.js,
                        target: {
                            tabId: tab.id
                        }
                    });
                });
            });
        } else {
            console.error("No user script found with the specified ID.");
        }
    } else {
        console.error("No user script found with the specified ID.");
    }
}


const start = async () => {
    sendMessageToTabs({type: "communicateUserScript", action: "start", customID: customID}, (response) => {
        if (response && response.success) {
            chrome.storage.local.set({status: "Running"})
            console.log("User script started successfully");
        } else {
            console.error("Failed to start user script");
        }
    });
}

const runOnce = async () => {
    sendMessageToTabs({type: "communicateUserScript", action: "runOnce", customID: customID}, (response) => {
        if (response && response.success) {
            console.log("User script executed successfully");
        } else {
            console.error("Failed to execute user script");
        }
    });
}

const stopScript = async () => {
    sendMessageToTabs({type: "communicateUserScript", action: "stop"}, (response) => {
        if (response && response.success) {
            chrome.storage.local.set({status: "Stopped"})
            console.log("User script stopped successfully");
        } else {
            console.error("Failed to stop user script");
        }
    });
}


const getState = async () => {
    const result = await chrome.storage.local.get("status");
    if (result.status) {
        return result.status;
    } else {
        return "Unknown or Stopped";
    }
}

document.getElementById("save").addEventListener("click", async () => {
    await updateUserScript(document.querySelector("textarea").value, document.getElementById("periodic").checked, document.getElementById("delay").value);
    await reinjectUserScript();
    window.location.reload();
});

document.getElementById("set-state").addEventListener("click", async () => {
    const userScript = await getUserScript();
    if(!userScript.periodic) {
        await runOnce();
    } else {
        const status = await getState();
        if(status === "Running") {
            await stopScript();
            document.getElementById("status").innerText = "Stopped";
            document.getElementById("set-state").innerText = "Start";
        } else {
            await start();
            document.getElementById("status").innerText = "Running";
            document.getElementById("set-state").innerText = "Stop";
        }
    }
});

document.getElementById("periodic").addEventListener("change", (e) => {
    if(e.target.checked) {
        document.getElementById("delay").disabled = false;
    } else {
        document.getElementById("delay").disabled = true;
    }
});

getUserScript().then((code) => {
    document.getElementById("periodic").checked = code.periodic || false;
    document.getElementById("delay").value = code.periodicDelay || 0;
    document.getElementById("delay").disabled = !code.periodic;
    document.querySelector("textarea").value = code.userScript || "";
    customID = code.customID || undefined;

    if(code.periodic) {
        getState().then((status) => {
            document.getElementById("status").innerText = status;
            if(status === "Running") {
                document.getElementById("set-state").innerText = "Stop";
            } else {
                document.getElementById("set-state").innerText = "Start";
            }
        });
    } else {
        document.getElementById("status").innerText = "Not periodic";
        document.getElementById("set-state").innerText = "Run Once";
    }
});
