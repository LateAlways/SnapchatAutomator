const simpleHook = (object, name, proxy) => {
    const old = object[name];
    object[name] = proxy(old, object);
}

simpleHook(document, "hasFocus", () => () => true);

const oldAddEventListener = EventTarget.prototype.addEventListener;
Object.defineProperty(EventTarget.prototype, "addEventListener", {
    value: function (...args) {
        const eventName = args[0];
        if (eventName === "keydown") return;
        if (eventName === "focus") return;
        return oldAddEventListener.call(this, ...args);
    }
});
// Taken from: SnapEnhance userscript - https://github.com/SnapEnhance/web