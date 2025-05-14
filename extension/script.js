const injectJS = (src) => {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(src);
    s.onload = () => s.remove();
    (document.head || document.documentElement).append(s);
}

injectJS("injected.js");
//injectJS("snapchatapi.js");
