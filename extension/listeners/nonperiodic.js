chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.type === "communicateUserScript") {
        if(request.action === "runOnce" && request.customID === ID) {
            funcNonPeriodic();
            sendResponse({success: true, action: "runOnce"});
        }
    }
    return true;
});