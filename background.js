chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action == "openresults") {
        try {
            chrome.tabs.create({url: chrome.runtime.getURL('/results.html')});
            sendResponse({status: "ok"});
        } catch (e) {
            sendResponse({status: "error"});
        }
    } else {
        sendResponse({status: "UnrecognizedAction"})
    }
});