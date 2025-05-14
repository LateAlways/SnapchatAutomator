(async () => {
    let snapchatWebpackRequire = null;
    let snapchatStore = null;
    let cofStore = null;
    window.SnapchatUtils = {
        getSnapchatWebpackRequire: () => {
            if (snapchatWebpackRequire != null) {
                return snapchatWebpackRequire;
            }

            window.webpackChunk_snapchat_web_calling_app.push([
                ['injectSnapchatAutomation'],
                {
                    injectSnapchatAutomation: (a, b, require) => {
                        snapchatWebpackRequire = require;
                    },
                },
                (require) => require('injectSnapchatAutomation'),
            ]);

            return snapchatWebpackRequire;
        },
        getSnapchatWebpackModuleId: (predicate) => {
            let selectedModuleId = null;

            for (const chunk of window.webpackChunk_snapchat_web_calling_app) {
                if (!Array.isArray(chunk)) continue;

                const [, modules] = chunk;
                for (const moduleKey of Object.keys(modules)) {
                    const module = modules[moduleKey];
                    const moduleDeclaration = module.toString();
                    if (moduleDeclaration == null || !predicate(moduleDeclaration, moduleKey)) continue;

                    selectedModuleId = moduleKey;
                    break;
                }

                if (selectedModuleId != null) break;
            }
            return selectedModuleId;
        },
        getSnapchatStore: () => {
            if (snapchatStore != null) {
                return snapchatStore;
            }

            const webpackRequire = SnapchatUtils.getSnapchatWebpackRequire();
            const someModuleId = SnapchatUtils.getSnapchatWebpackModuleId((module) => module.includes("broadcastTypingActivity"));
            if (webpackRequire == null || someModuleId == null) return null;

            const module = webpackRequire(someModuleId);
            snapchatStore = Object.values(module).find((value) => value.getState != null && value.setState != null);

            return snapchatStore;
        },
        getCofStore: () => {
            if (cofStore != null) {
                return cofStore;
            }

            const webpackRequire = SnapchatUtils.getSnapchatWebpackRequire();
            const someModuleId = SnapchatUtils.getSnapchatWebpackModuleId((module) => module.includes("cof_targeting_query_attempt"));
            if (webpackRequire == null || someModuleId == null) return null;

            const module = webpackRequire(someModuleId);
            cofStore = Object.values(module).find((value) => value.getState != null && value.setState != null);

            return cofStore;
        },
        getProvConsts: () => {
            const webpackRequire = SnapchatUtils.getSnapchatWebpackRequire();
            const someModuleId = SnapchatUtils.getSnapchatWebpackModuleId((module) => module.includes("SNAPCHAT_WEB_APP"));
            if (webpackRequire == null || someModuleId == null) return null;

            const module = webpackRequire(someModuleId);
            return Object.values(module).find((value) => value.SNAPCHAT_WEB_APP != null);
        },
        getSerializedSnapchatId: (uuid) => {
            const hexStr = uuid.replace(/-/g, '');
            const bytes = new Uint8Array(16);

            for (let i = 0; i < 16; i++) {
                bytes[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
            }

            return { id: bytes, str: uuid };
        },
        getSnapchatPublicUser: async (userId, retry) => {
            if (!retry) retry = true;
            const { fetchPublicInfo, publicUsers } = SnapchatUtils.getSnapchatStore().getState().user;
            if (fetchPublicInfo == null || publicUsers == null) return null;

            const user = publicUsers.entries().find((str) => str[0].str === userId);

            if (user == null && retry) {
                const serializedId = SnapchatUtils.getSerializedSnapchatId(userId);
                await fetchPublicInfo([serializedId]);
                return SnapchatUtils.getSnapchatPublicUser(userId, false);
            }

            return user != null ? user[1] : null;
        },
        getConversation: (conversationId) => {
            const { conversations } = SnapchatUtils.getSnapchatStore().getState().conversation;
            if (conversations == null) return null;

            return conversations[conversationId];
        },
        GS: () => {
            return SnapchatUtils.getSnapchatStore().getState();
        }
    }
    window.SU = SnapchatUtils;

    const stringToUint8Array = (str) => {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(str);
        return uint8Array;
    }
    const concatUint8Arrays = (arr1, arr2) => {
        const concatenated = new Uint8Array(arr1.length + arr2.length);
        concatenated.set(arr1);
        concatenated.set(arr2, arr1.length);
        return concatenated;
    }

    const sendChat = (conversationId, message) => {
        return new Promise((resolve, reject) => {
            SnapchatUtils.getSnapchatStore().getState().messaging.client.getConversationManager().sendMessageWithContent({
                conversations: conversationId,
                phoneNumbers: [],
                stories: [],
            }, {
                allowsTranscription: false,
                botMention: false,
                content: concatUint8Arrays(new Uint8Array([18,message.length+2,10,message.length]), stringToUint8Array(message)),
                contentType: 2,
                incidentalAttachments: [],
                localMediaReferences: [],
                platformAnalytics: {
                    attemptId: SnapchatUtils.getSerializedSnapchatId(crypto.randomUUID()),
                    content: stringToUint8Array(JSON.stringify({
                        usersPresentCount: 0,
                        chatSource: "FEED",
                        dWebUserPresentCount: 1
                    })),
                    metricsMessageMediaType: 0,
                    metricsMessageType: 0,
                    reactionSource: 0
                },
                quotedMessageId: undefined,
                savePolicy: 1
            }, (0, SnapchatUtils.getSnapchatWebpackRequire(0)(SnapchatUtils.getSnapchatWebpackModuleId((module) => module.includes("Comlink.proxy"))).BX)({
                onError: (error) => {
                    reject(error);
                },
                onQueued: () => {},
                onSuccess: () => {
                    resolve()
                }
            }));
        })
    }

    class Contact {
        constructor(contactObject) {
            this.contactObject = contactObject;
        }
        async getName() {
            return await SnapchatUtils.getSnapchatPublicUser(this.contactObject.str).then(user => user.display_name || user.username);
        }
        getId() {
            return this.contactObject.str;
        }
        async sendChat(message) {
            return await sendChat([this.contactObject], message);
        }
    }

    class Conversation {
        constructor(conversationObject) {
            this.conversationObject = conversationObject;
        }
        async getName() {
            return this.conversationObject.conversation.title || await SnapchatUtils.getSnapchatPublicUser(this.conversationObject.conversation.conversationId).then(user => user.display_name || user.username);
        }
        isGroup() {
            this.conversationObject.conversation.conversationType === 1;
        }
        getId() {
            return this.conversationObject.conversation.conversationId.str;
        }
        async sendChat(message) {
            return await sendChat([this.conversationObject.conversation.conversationId], message);
        }
    }

    window.SA = {
        fetchAllConversations: async () => {
            for(const conversationId of Object.keys(SnapchatUtils.getSnapchatStore().getState().messaging.feed)) {
                await SnapchatUtils.getSnapchatStore().getState().messaging.fetchConversation(SnapchatUtils.getSerializedSnapchatId(conversationId));
            }
        },
        getConversations: () => {
            const { conversations } = SnapchatUtils.getSnapchatStore().getState().messaging;
            return Object.values(conversations).map(conversation => new Conversation(conversation));
        },
        getContacts: () => {
            const { mutuallyConfirmedFriendIds } = SnapchatUtils.getSnapchatStore().getState().user;
            return Object.values(mutuallyConfirmedFriendIds).map(contact => new Contact(contact));
        }
    }
})();
// Contains parts taken from: BetterSnap - https://github.com/dclstn/better-snapchat