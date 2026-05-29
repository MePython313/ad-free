const urlInput = document.getElementById('urlInput');
const playBtn = document.getElementById('playBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const playerContainer = document.getElementById('playerContainer');
const historyDiv = document.getElementById('history');

const HISTORY_KEY = 'minitube-history';

playBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (url) loadVideo(url);
});

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (!query) return;

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  window.open(url, '_blank');
});

urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') playBtn.click();
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchBtn.click();
});

function extractYouTubeId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('/')[0];
    }

    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      if (parsed.pathname.includes('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1].split('/')[0];
      }

      if (parsed.pathname.includes('/embed/')) {
        return parsed.pathname.split('/embed/')[1].split('/')[0];
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function loadVideo(url) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    alert('Invalid YouTube URL.');
    return;
  }

  playerContainer.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1"
      allowfullscreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
    </iframe>
  `;

  const title = await getVideoTitle(videoId);

  saveToHistory({
    videoId,
    title,
    channel: 'YouTube Video',
    url
  });
}

function getVideoTitle(videoId) {
  return new Promise(resolve => {
    // Fallback title if YouTube metadata isn't accessible.
    resolve(`YouTube Video (${videoId})`);
  });
}

function saveToHistory(video) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

  // If video already exists, do nothing (keeps original order)
  const exists = history.some(item => item.videoId === video.videoId);
  if (!exists) {
    history.push(video);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

  historyDiv.innerHTML = '';

  if (history.length === 0) {
    historyDiv.innerHTML = '<div style="color:#888">No videos watched yet.</div>';
    return;
  }

  history.forEach(video => {
    const item = document.createElement('div');
    item.className = 'history-item';

    item.innerHTML = `
      <div class="history-title">${escapeHtml(video.title)}</div>
      <div class="history-channel">${escapeHtml(video.channel)}</div>
    `;

    item.addEventListener('click', () => {
      urlInput.value = video.url;
      loadVideo(video.url);
    });

    historyDiv.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

renderHistory();
