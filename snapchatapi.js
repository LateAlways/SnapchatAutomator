const waitForElement = (getter) =>{
    return new Promise(async resolve => {
        if (getter()) {
            return resolve();
        }

        await new Promise(resolve => requestAnimationFrame(resolve));
        if (getter()) {
            return resolve();
        }

        let s
        const observer = new MutationObserver(mutations => {
            if (getter()) {
                observer.disconnect();
                resolve();
                clearInterval(s);
            }
        });
        s = setInterval(() => {
            if (getter()) {
                resolve();
                clearInterval(s);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

const customWhileTrue = (func) => {
    let cancelled = false;
    return [new Promise(resolve => {
        let s = undefined;
        let f = async () => {await func();if(!cancelled)s=requestAnimationFrame(f);else resolve();}
        s = requestAnimationFrame(f);
    }), () => {
        cancelled = true;
    }]
}

const COMPONENTS = {
    ADD_FRIENDS_BTN: () => document.querySelector("button[title='View friend requests']"),
    ADD_FRIENDS_CONTAINER: () => document.querySelectorAll("span.nonIntl").values().filter(el => el.innerText === "Add Friends").map(el => el.parentElement.parentElement.parentElement.parentElement).find(el => el),

    OPEN_CAMERA_BTN: () => document.querySelectorAll("span.nonIntl").values().filter(el => el.innerText === "Click the Camera to send Snaps").map(el => el.parentElement.parentElement.querySelector("button")).find(el => el),
    
    CLOSE_CAMERA_BTN: () => document.querySelector("button[title='Turn off camera']"),
    TAKE_SNAP_BTN: () => document.getElementById("local-video") ? document.getElementById("local-video").parentElement.querySelector("div > div > div").querySelector("button:not([title])") : undefined,
    CAMERA_VIDEO_ELEMENT: () => document.getElementById("local-video"),
    
    CLOSE_SNAP_PREVIEW_BTN: () => document.querySelector("button[title='Close snap preview and return to camera.']"),
    SEND_TO_BTN: () => document.querySelectorAll("span.nonIntl").values().filter(el => el.innerText === "Send To").map(el => el.parentElement).find(el => el),
    
    PEOPLE_CONTAINER: () => document.querySelectorAll("span.nonIntl").values().filter(el => el.innerText === "Stories").map(el => el.parentElement.parentElement.parentElement.parentElement).find(el => el),
    CONFIRM_SEND_BTN: () => document.querySelectorAll("span.nonIntl").values().filter(el => el.innerText === "Send" && el.parentElement.parentElement.type === "submit").map(el => el.parentElement.parentElement).find(el => el),

    CONTACTS_CONTAINER: () => document.querySelector("div[aria-label='Friends Feed'] > div"),

    CLOSE_CHAT_BTN: () => document.querySelector("button[title='Close Chat']"),
    CHAT_CONTAINER: () => document.querySelectorAll("button[title='Close Chat']").values().map(el => el.parentElement.parentElement.parentElement).find(el => el),
    CHAT_INPUT: () => document.querySelector("div[placeholder='Send a chat']"),
    SEND_SNAP_CHAT_BTN: () => COMPONENTS.CHAT_INPUT() && COMPONENTS.CHAT_INPUT().parentElement.parentElement.parentElement.querySelector("button"),

    MEDIA_CONTENT_CONTAINER: () => document.querySelector("div[aria-label='media content']"),
}

const FriendRequest = class FriendRequest {
    constructor(element) {
        this.element = element;
        this.name = element.querySelector("div > div > div > span:nth-child(1)");
        this.username = element.querySelector("div > div > div > span:nth-child(2)");
        this.acceptBtn = element.querySelector("div > div > button > div > span.nonIntl").parentElement.parentElement;
        this.declineBtn = this.acceptBtn.parentElement.querySelector("svg[type='button']");
    }
    getName() {
        return this.name && this.name.innerText;
    }
    getUsername() {
        return this.username && this.username.innerText;
    }
    async accept() {
        if(!this.acceptBtn) return false;
        await this.acceptBtn.click();
        return true;
    }
    async ignore() {
        if(!this.declineBtn) return false;
        this.declineBtn.dispatchEvent(new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true
        }));
        await new Promise(r => requestAnimationFrame(r))
        this.element.querySelector("div > div > div > span > button > span.nonIntl").parentElement.dispatchEvent(new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true
        }));

        return true;
    }
    isValid() {
        return this.element && this.name && this.username && this.acceptBtn && this.declineBtn;
    }
}

const Contact = class Contact {
    constructor(element) {
        this.element = element;
        this.name = this.element.querySelector("span[id^='title'].nonIntl");
        this.status = this.element.querySelector("span[id^='status']");
    }
    getName() {
        return this.name && this.name.innerText;
    }
    getStatus() {
        return this.status && this.status.innerText;
    }
    async sendSnap(count) {
        console.log("Close existing chat");
        await new Promise(r => requestAnimationFrame(r))
        if(COMPONENTS.CHAT_CONTAINER()) {
            if(!COMPONENTS.CLOSE_CHAT_BTN()) return false;
            COMPONENTS.CLOSE_CHAT_BTN().click();
            await waitForElement(() => !COMPONENTS.CHAT_CONTAINER());
        }

        console.log("Open chat");
        let s = this.element.querySelector("div");
        if(!s) return false;
        await s.click();
        await waitForElement(COMPONENTS.CHAT_CONTAINER);

        console.log("Open camera");
        if(!COMPONENTS.SEND_SNAP_CHAT_BTN() || COMPONENTS.CLOSE_SNAP_PREVIEW_BTN()) return false;
        await COMPONENTS.SEND_SNAP_CHAT_BTN().click();
        await waitForElement(() => COMPONENTS.CAMERA_VIDEO_ELEMENT() && COMPONENTS.CAMERA_VIDEO_ELEMENT().readyState === 4 || COMPONENTS.SEND_TO_BTN());
        
        if(!COMPONENTS.SEND_TO_BTN()) {
            console.log("Take snap");
            if(!COMPONENTS.TAKE_SNAP_BTN() || !COMPONENTS.CAMERA_VIDEO_ELEMENT()) return false;
            await COMPONENTS.TAKE_SNAP_BTN().click();
            await waitForElement(COMPONENTS.CLOSE_SNAP_PREVIEW_BTN);
        } else {
            await new Promise(r => requestAnimationFrame(r))
        }

        console.log("Send to button");
        if(!COMPONENTS.SEND_TO_BTN()) return false;
        await COMPONENTS.SEND_TO_BTN().click();
        await waitForElement(COMPONENTS.CONFIRM_SEND_BTN);
        
        console.log("Confirm send");
        if(!COMPONENTS.CONFIRM_SEND_BTN()) return false;
        for(let i = 0; i < count; i++) {
            COMPONENTS.CONFIRM_SEND_BTN().click();
        }
        await waitForElement(() => !COMPONENTS.CONFIRM_SEND_BTN());
        
        console.log("Close chat");
        if(!COMPONENTS.CLOSE_CHAT_BTN()) return false;
        await COMPONENTS.CLOSE_CHAT_BTN().click();
        await waitForElement(() => !COMPONENTS.CHAT_CONTAINER());
        return true;
    }
    async sendChat(message) {
        if(!message || message.length === 0) return false;
        console.log("Close existing chat");
        await new Promise(r => requestAnimationFrame(r))
        if(COMPONENTS.CHAT_CONTAINER()) {
            if(!COMPONENTS.CLOSE_CHAT_BTN()) return false;
            COMPONENTS.CLOSE_CHAT_BTN().click();
            await waitForElement(() => !COMPONENTS.CHAT_CONTAINER());
        }
        console.log("Open chat");
        let s = this.element.querySelector("div");
        if(!s) return false;
        await s.click();
        await waitForElement(COMPONENTS.CHAT_CONTAINER);
        await waitForElement(COMPONENTS.CHAT_INPUT);
        await new Promise(r => requestAnimationFrame(r))

        console.log("Send chat");
        COMPONENTS.CHAT_INPUT().focus()
        document.execCommand("insertText", false, message);
        await new Promise(r => requestAnimationFrame(r))
        
        s = COMPONENTS.CHAT_INPUT().parentElement.querySelector("button");
        if(!s) return false;
        await s.click();

        await waitForElement(() => COMPONENTS.CHAT_INPUT().innerText === "");
        console.log("Chat sent");

        if(!COMPONENTS.CLOSE_CHAT_BTN()) return false;
        await COMPONENTS.CLOSE_CHAT_BTN().click();
        await waitForElement(() => !COMPONENTS.CHAT_CONTAINER());
        return true;
    }
    isGroup() {
        return this.element.querySelectorAll("img").length > 1;
    }
    isTeamSnapchat() {
        return this.element.querySelectorAll("img").length === 0;
    }
    isValid() {
        return this.name && this.status;
    }
}

const SnapchatMacros = {
    openCamera: async () => {
        if(COMPONENTS.CAMERA_VIDEO_ELEMENT() && COMPONENTS.CAMERA_VIDEO_ELEMENT().readyState === 4) return true;
        if(!COMPONENTS.OPEN_CAMERA_BTN()) return false;
        COMPONENTS.OPEN_CAMERA_BTN().click();
        await waitForElement(() => COMPONENTS.CAMERA_VIDEO_ELEMENT() && COMPONENTS.CAMERA_VIDEO_ELEMENT().readyState === 4);
        return true;
    },
    takeSnap: async () => {
        if(!COMPONENTS.TAKE_SNAP_BTN()) {
            return false;
        }
        COMPONENTS.TAKE_SNAP_BTN().click();
        await waitForElement(COMPONENTS.CLOSE_SNAP_PREVIEW_BTN);
        await waitForElement(COMPONENTS.SEND_TO_BTN);
        await new Promise(resolve => requestAnimationFrame(resolve));
        return true;
    },
    sendTo: async () => {
        if(!COMPONENTS.SEND_TO_BTN()) return false;
        COMPONENTS.SEND_TO_BTN().click();
        await waitForElement(COMPONENTS.PEOPLE_CONTAINER);
        await waitForElement(() => COMPONENTS.PEOPLE_CONTAINER().querySelectorAll("li").length > 0);
        return true;
    },
    selectAll: async (nameList, nameListType) => {
        if(!COMPONENTS.CLOSE_SNAP_PREVIEW_BTN()) return false;
        if(!COMPONENTS.PEOPLE_CONTAINER()) return false;
        let container = COMPONENTS.PEOPLE_CONTAINER().querySelectorAll("li").values();
        for(let el of container) {
            let checkbox1 = el.querySelector("svg[aria-label='Unselect chosen user']");
            let checkbox2 = Object.values((el.querySelector("div") && el.querySelector("div").children) || []).find(el => el.children.length === 0 && el.innerText === "");
            let name1 = el.querySelector("div.nonIntl")
            let name2 = el.querySelector("div > div > span.nonIntl > span");
            let checkbox = (checkbox1 && checkbox1.parentElement) || checkbox2;
            let name = name1 || name2;
            if(checkbox && name && ((nameList.includes(name.innerText) && nameListType === SnapchatAutomation.NameListType.WHITELIST) || (!nameList.includes(name.innerText) && nameListType === SnapchatAutomation.NameListType.BLACKLIST)) && (checkbox.querySelectorAll("svg").length === 0 || checkbox.querySelector("svg").classList.length !== 1)) {
                checkbox.click();
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }
        return true;
    },
    sendSnap: async (count) => {
        if(!COMPONENTS.CONFIRM_SEND_BTN()) return false;
        for(let i = 0; i < count; i++) {
            COMPONENTS.CONFIRM_SEND_BTN().click();
        }
        await waitForElement(() => COMPONENTS.OPEN_CAMERA_BTN() || COMPONENTS.CLOSE_CAMERA_BTN() || COMPONENTS.CLOSE_SNAP_PREVIEW_BTN());
        return true;
    }
}

const SnapchatAutomation = {
    getNewSnaps: () => {
        let contacts = SnapchatAutomation.getContacts();
        return contacts.filter(contact => contact.getStatus() === "New Snap" || contact.getStatus() === "New Chats and Snaps");
    },
    getNewChats: () => {
        let contacts = SnapchatAutomation.getContacts();
        return contacts.filter(contact => contact.getStatus() === "New Chat" || contact.getStatus() === "New Chats and Snaps");
    },
    getContactsRead: () => {
        let contacts = SnapchatAutomation.getContacts();
        return contacts.filter(contact => contact.getStatus() !== "New Snap" && contact.getStatus() !== "New Chat" && contact.getStatus() !== "New Chats and Snaps");
    },
    getContacts: () => {
        if(!COMPONENTS.CONTACTS_CONTAINER()) return false;
        let contacts = [];
        for(const person of COMPONENTS.CONTACTS_CONTAINER().querySelectorAll("div[role='listitem']")) {
            const contact = new Contact(person);
            if(contact.isValid())
                contacts.push(contact);
        }
        return contacts;
    },
    getFriendRequests: async () => {
        if(!COMPONENTS.ADD_FRIENDS_CONTAINER()) {
            if(!COMPONENTS.ADD_FRIENDS_BTN()) return false;
            COMPONENTS.ADD_FRIENDS_BTN().click();
            await waitForElement(COMPONENTS.ADD_FRIENDS_CONTAINER);
        }
        if(!COMPONENTS.ADD_FRIENDS_CONTAINER()) return false;
        COMPONENTS.ADD_FRIENDS_BTN().click();
        await waitForElement(() => !COMPONENTS.ADD_FRIENDS_CONTAINER());

        await new Promise(r => requestAnimationFrame(r))
        
        if(!COMPONENTS.ADD_FRIENDS_BTN()) return false;
        COMPONENTS.ADD_FRIENDS_BTN().click();
        await waitForElement(COMPONENTS.ADD_FRIENDS_CONTAINER);

        await new Promise(r => requestAnimationFrame(r))

        let friendRequests = [];
        for(const acceptButton of COMPONENTS.ADD_FRIENDS_CONTAINER().querySelectorAll("div > div > div > button > div > span.nonIntl")) {
            if(acceptButton.innerText !== "Accept") continue;
            const friendRequest = new FriendRequest(acceptButton.parentElement.parentElement.parentElement.parentElement.parentElement);
            if(friendRequest.isValid())
                friendRequests.push(friendRequest);
        }

        return friendRequests;
    },
    closeAddFriends: async () => {
        if(!COMPONENTS.ADD_FRIENDS_CONTAINER()) return true;
        COMPONENTS.ADD_FRIENDS_BTN().click();
        await waitForElement(() => !COMPONENTS.ADD_FRIENDS_CONTAINER());
        return true;
    },
    NameListType: Object.freeze({
        WHITELIST: "whitelist",
        BLACKLIST: "blacklist"
    }),
    sendSnap: async (nameList, nameListType, count) => {
        if(COMPONENTS.PEOPLE_CONTAINER()) {
            COMPONENTS.CLOSE_SNAP_PREVIEW_BTN().click();
        }
        await SnapchatMacros.openCamera();
        await SnapchatMacros.takeSnap();
        await SnapchatMacros.sendTo();
        await SnapchatMacros.selectAll(nameList, nameListType);
        await SnapchatMacros.sendSnap(count);
    }
}

