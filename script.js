//const DOM Elements
const twitchBtn = document.querySelectorAll('.twitch'),
youtubeBtn = document.querySelectorAll('.youtube'),
checkboxes = document.querySelectorAll('input[type="checkbox"]'),
activeContainer = document.querySelector('.activeContainer'),
disabledContainer = document.querySelector('.disabledContainer')

//const config.js values
const twitchClientID = config.twitchClientID,
twitchClientSecret = config.twitchClientSecret,
twitchAccessToken = config.twitchAccessToken,
youtubeAPIkey = config.youtubeAPIkey

//Fetch the hermits name and link assignments from hermits.json
fetch('hermits.json')
  .then(response => response.json())
  .then(data => {
    const names = data.map(hermit => hermit.name),
    twitchName = data.map(hermit => hermit.twitchName),
    youtubeName = data.map(hermit => hermit.youtubeName),
    nameLabels = document.querySelectorAll('.hermitName'),
    twitchURLs = document.querySelectorAll('.twitch'),
    youtubeURLs = document.querySelectorAll('.youtube');
    //assign names to labels
    nameLabels.forEach((label, index) => {
        label.textContent = names[index];
    })
    //assign twitch URLs
    twitchURLs.forEach((url, index) => {
        url.setAttribute('href', `http://twitch.tv/${twitchName[index]}`);
    })
    //assign youtube URLs
    youtubeURLs.forEach((url, index) => {
        url.setAttribute('href', `https://gaming.youtube.com/${youtubeName[index]}/live`)
    })
    //data.forEach(hermit => console.log(hermit.channelID));
  })
  .catch(error => console.error(error));

//Listens for changes in the checkbox status then moves appropriate div
checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', function() {
        const parentDiv = this.parentNode.parentNode;

        if (this.checked) {
            document.querySelector('.activeContainer').appendChild(parentDiv);
            if (document.querySelector('.disabledContainer').innerHTML === ``) {
                document.querySelector('.disabledContainer').setAttribute('style', 'display: none')
                document.querySelector('.sectionHeader').setAttribute('style', 'display: none')
            }
            active();
        } else {
            document.querySelector('.disabledContainer').appendChild(parentDiv);
            disabled();
        }
    });
});

//Called when items are appended back into the active list
function active() {
    const itemsToSort = Array.from(activeContainer.querySelectorAll('.hermitContainer'))

    itemsToSort.sort((a, b) => {
        return parseInt(a.dataset.id) - parseInt(b.dataset.id);
    });
    
    itemsToSort.forEach(item => {
        activeContainer.appendChild(item);
    });
};

//Called when items are appended into the disabled list
function disabled() {
    const itemsToSort = Array.from(disabledContainer.querySelectorAll('.hermitContainer'))

    itemsToSort.sort((a, b) => {
        return parseInt(a.dataset.id) - parseInt(b.dataset.id);
    });
    
    itemsToSort.forEach(item => {
        disabledContainer.appendChild(item);
    });
}

//Supposed to adjust the window height, but doesn't
chrome.windows.onCreated.addListener(function(window) {
    var width = 800;
    var height = 300;
    chrome.windows.update(window.id, { width: width, height: height });
});

chrome.windows.getCurrent(function(currentWindow) {
    console.log('Current window:', currentWindow);
  });

//Youtube API
const maxResults = 3;

const checkLiveStatus = () => {
    fetch('hermits.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(hermit => {
            console.log(hermit.channelID);
            fetch(`https://www.googleapis.com/youtube/v3/search?key=${youtubeAPIkey}&channelId=${hermit.channelID}&part=snippet,id&eventType=live&type=video&maxResults=${maxResults}`)
            .then(response => response.json())
            .then(data => {
                const liveVideos = data;//.items;
                //if (liveVideos.length > 0) {
                //console.log(`${hermit.channelID} is currently live on YouTube!`);
                //} else {
                //console.log(`${hermit.channelID} is not currently live on YouTube!`);
                //}
                console.log(liveVideos);
            })
            .catch(error => {
                console.error("An error occurred while fetching the YouTube API:", error);
            });  
        });
    });
}

//setInterval(checkLiveStatus, 30 * 1000);

//Twitch API
let token = localStorage.getItem("twitchToken");

export const twitchUserStatus = async () => {
    try {
        if (!token) {
            const twitchTokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${twitchClientID}&client_secret=${twitchClientSecret}&grant_type=client_credentials`, {
                method: "POST",
            });
            const tokenData = await twitchTokenResponse.json();
            token = tokenData.access_token;
            localStorage.setItem("twitchToken", token);
            const expiresAt = new Date().getTime() + tokenData.expires_in * 1000;
            localStorage.setItem("twitchTokenExpiry", expiresAt);
        } else {
            const expiryTime = localStorage.getItem("twitchTokenExpiry");
            if (new Date().getTime() > expiryTime) {
                localStorage.removeItem("twitchToken");
                localStorage.removeItem("twitchTokenExpiry");
                token = null;
            }
        }
        
        fetch('hermits.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(async hermit => {
                const twitchUserResponse = await fetch(`https://api.twitch.tv/helix/streams?user_login=${hermit.twitchName}`, {
                    headers: {
                        "client-id": twitchClientID,
                        "authorization": `Bearer ${token}`,
                    }
                });
                const data = await twitchUserResponse.json();
                const isStreaming = data.data.length > 0;
                const twitchLink = document.querySelector(`#${hermit.hermitIndex} .twitch`);
                const led = document.querySelector(`#${hermit.hermitIndex} .led`);

                let notificationShown = false;

                if (isStreaming) {
                    led.classList.remove('default-led');
                    led.classList.add('red-led');
                    twitchLink.classList.remove('disabled');
                    // Declare chrome object as a global variable
                    var chrome = chrome || {};

                    // Check if notification has already been shown
                    chrome.storage.local.get('notificationShown', (result) => {
                        if (!result.notificationShown) {
                            // Notification has not been shown yet, so show it
                            chrome.notifications.create({
                                type: 'basic',
                                iconUrl: 'images/icon128.png',
                                title: 'HermitcraftLive',
                                message: `${hermit.name} is streaming on Twitch!`
                            });

                            // Set flag to indicate that notification has been shown
                            notificationShown = true;
                            chrome.storage.local.set({ notificationShown: true });
                        }
                    });
                } else {
                    led.classList.remove('red-led');
                    led.classList.add('default-led');
                    twitchLink.classList.add('disabled');
                }
            })
        })
    } catch (error) {
        console.error(error);
        console.log(`An error occurred while checking if ${twitchUser} is streaming on Twitch.`);
    }
}

//setInterval(twitchUserStatus, 300 * 1000); //60 seconds * 1000 milliseconds = 1 minute