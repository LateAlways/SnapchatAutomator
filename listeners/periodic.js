chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.type === "communicateUserScript") {
        if(request.action === "start" && request.customID === ID) {
            running = true;
            timeoutPeriodic();
            sendResponse({success: true, action: "start"});
        } else if(request.action === "stop") {
            running = false;
            if(currentTimeoutPeriodic) {
                clearTimeout(currentTimeoutPeriodic);
                currentTimeoutPeriodic = undefined;
            }
            sendResponse({success: true, action: "stop"});
        }
    }
    return true;
});