let friendRequests = await SnapchatAutomation.getFriendRequests(); // FriendRequest[]
for(const friendRequest of friendRequests) {
    await friendRequest.accept();
}
await SnapchatAutomation.closeAddFriends();
