chrome.runtime.onMessage.addListener(function(reqeust,sender,sendResponse) {
    if(request.type === "communicateUserScript") {
        chrome.runtime.sendMessage(request, (response) => sendResponse(response));
    }
    return true; // Keep the message channel open for sendResponse
})
