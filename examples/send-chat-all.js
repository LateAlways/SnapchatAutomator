let message = "PUT MESSAGE HERE";

let contacts = await SnapchatAutomation.getContacts(); // Contact[]
for(const contact of contacts) {
    await contact.sendChat(message);
}
