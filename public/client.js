const socket = io();
const API_KEY = 'AIzaSyBRsM85ZKXGo3BhLscr8zsduGexyQj-_VM'; // Replace with your YouTube API key
let name;
const textarea = document.querySelector('#textarea');
const messageArea = document.querySelector('.message__area');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultsDiv = document.getElementById('results');
const playerDiv = document.getElementById('player');
const songTitle = document.getElementById('songTitle');
const songThumbnail = document.getElementById('songThumbnail');
const playPauseButton = document.getElementById('playPauseButton');
let currentVideoId = '';
let isPlaying = false;
let player;

// Prompt user for name
do {
    name = prompt('Please Enter Your name');
} while (!name);

// Handle message sending
textarea.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        const message = e.target.value;
        sendMessage(message);
        e.target.value = ''; // Clear the textarea after sending
    }
});

function sendMessage(message) {
    if (message.trim() === '') return; // Prevent sending empty messages

    let msg = {
        user: name,
        message: message.trim(),
        type: 'outgoing'
    };

    // Append outgoing message
    appendMessage(msg);
    scrollToBottom();

    // Send message to server
    socket.emit('message', msg);

    // Handle pause and resume commands
    if (message.trim().toLowerCase() === 'pausemusic') {
        if (isPlaying) {
            player.pauseVideo();
            isPlaying = false;
            playPauseButton.textContent = 'Play';
        }
    } else if (message.trim().toLowerCase() === 'resumemusic') {
        if (!isPlaying) {
            player.playVideo();
            isPlaying = true;
            playPauseButton.textContent = 'Pause';
        }
    }
}

function appendMessage(msg) {
    let mainDiv = document.createElement('div');
    let className = msg.type === 'outgoing' ? 'outgoing' : 'incoming';
    mainDiv.classList.add(className, 'message');

    // Check if the message is a song playing message
    let markup = '';
    if (msg.type === 'song') {
        markup = `
            <h4>${msg.user}</h4>
            <p>${msg.message}</p>
            <div>
                <button class="controlBtn" id="pauseBtn-${msg.videoId}">Pause</button>
                <button class="controlBtn" id="resumeBtn-${msg.videoId}" style="display:none;">Resume</button>
            </div>
        `;
    } else {
        markup = `
            <h4>${msg.user}</h4>
            <p>${msg.message}</p>
        `;
    }

    mainDiv.innerHTML = markup;
    messageArea.appendChild(mainDiv);

    // Add event listeners for pause/resume buttons if it's a song message
    if (msg.type === 'song') {
        const pauseBtn = mainDiv.querySelector(`#pauseBtn-${msg.videoId}`);
        const resumeBtn = mainDiv.querySelector(`#resumeBtn-${msg.videoId}`);

        pauseBtn.addEventListener('click', () => {
            player.pauseVideo();
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline';
        });

        resumeBtn.addEventListener('click', () => {
            player.playVideo();
            pauseBtn.style.display = 'inline';
            resumeBtn.style.display = 'none';
        });
    }
}

// Receive message from server
socket.on('message', (msg) => {
    if (msg.type === 'song') {
        // Append song message to chat
        appendMessage({ ...msg, type: 'incoming' });
        scrollToBottom();
    } else if (msg.user !== name) { // Regular chat message
        appendMessage({ ...msg, type: 'incoming' });
        scrollToBottom();
    }
});

// Scroll to bottom of message area
function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight;
}

// YouTube search functionality
searchButton.addEventListener('click', () => {
    const query = searchInput.value;
    if (query) {
        searchYouTube(query);
    } else {
        console.error('Search query is empty');
    }
});

function searchYouTube(query) {
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${query}&key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.items.length === 0) {
                resultsDiv.innerHTML = '<p>No results found</p>';
            } else {
                displayResults(data.items);
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            resultsDiv.innerHTML = '<p>Error fetching data. Check the console for details.</p>';
        });
}

function displayResults(videos) {
    resultsDiv.innerHTML = '';
    videos.forEach(video => {
        const videoElement = document.createElement('div');
        videoElement.innerHTML = `
            <img src="${video.snippet.thumbnails.default.url}" width="100">
            <p>${video.snippet.title}</p>
            <button onclick="playSong('${video.id.videoId}')">Play</button>
        `;
        resultsDiv.appendChild(videoElement);
    });
}

function playSong(videoId) {
    currentVideoId = videoId;
    playerDiv.style.display = 'block';

    // Load the video and play it
    player.loadVideoById(videoId);

    // Fetch song details and update UI
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            const videoData = data.items[0];
            songTitle.textContent = videoData.snippet.title;
            songThumbnail.src = videoData.snippet.thumbnails.high.url;
            isPlaying = true;
            playPauseButton.textContent = 'Pause';

            // Send a message to the server that a song is playing with the play, pause, and resume options
            const songMessage = {
                user: name,
                message: `is playing: ${videoData.snippet.title}`,
                type: 'song',
                videoId: videoId
            };
            socket.emit('message', songMessage);

            // Clear search results
            resultsDiv.innerHTML = '';
        })
        .catch(error => {
            console.error('Error fetching video data:', error);
            songTitle.textContent = 'Error loading song';
        });
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0', // Hide the height
        width: '0',  // Hide the width
        videoId: '',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo(); // Auto-play the video when ready
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        // Handle video end
        playPauseButton.textContent = 'Play';
        isPlaying = false;
    }
}

playPauseButton.addEventListener('click', () => {
    if (isPlaying) {
        player.pauseVideo();
        playPauseButton.textContent = 'Play';
    } else {
        player.playVideo();
        playPauseButton.textContent = 'Pause';
    }
    isPlaying = !isPlaying;
});
