import { twitchUserStatus } from "/script.js"

const twitchStatus = twitchUserStatus();
setInterval(twitchUserStatus, 300 * 1000); //60 seconds * 1000 milliseconds = 1 minute