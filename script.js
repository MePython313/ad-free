/* ============ MiniTube XP Edition v2 — ad-free player + built-in AdBlocker ============ */

const urlInput = document.getElementById('urlInput');
const playBtn = document.getElementById('playBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const playerContainer = document.getElementById('playerContainer');
const placeholder = document.getElementById('placeholder');
const historyDiv = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const shield = document.getElementById('shield');
const blockedCountEl = document.getElementById('blockedCount');
const toast = document.getElementById('toast');

const HISTORY_KEY = 'minitube-history';

/* ============ AdBlocker engine (uBlock-lite) ============ */

/* Hostnames of known ad/tracker servers. Anything ending with these gets nuked. */
const AD_HOST_SUFFIXES = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'amazon-adsystem.com',
  'adnxs.com',
  'outbrain.com',
  'taboola.com',
  'criteo.com',
  'pubmatic.com',
  'rubiconproject.com',
  'adsrvr.org',
  'adform.net',
  'advertising.com',
  'moatads.com',
  'quantserve.com',
  'scorecardresearch.com',
  'agkn.com',
  'mathtag.com',
  'openx.net',
  'lijit.com',
  'casalemedia.com',
  'adsafeprotected.com',
  'yieldmo.com',
  'popads.net',
  'propellerads.com',
  'adsterra.com',
  'adf.ly',
  'google-analytics.com',
];

/* Class/id tokens that usually mark ad containers */
const AD_ATTR_TOKENS = [
  'ad-container',
  'ad-banner',
  'adsbygoogle',
  'advert',
  'sponsored',
  'promo-ad',
  'ad-slot',
  'banner-ad',
  'google_ads_iframe',
  'ad_',
];

let blockedCount = 0;

function isAdUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const host = new URL(value, location.href).hostname.toLowerCase();
    return AD_HOST_SUFFIXES.some((s) => host === s || host.endsWith('.' + s));
  } catch {
    return false;
  }
}

function isAdAttrs(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const hay = (node.id || '') + ' ' + (node.className || '');
  return AD_ATTR_TOKENS.some((t) => hay.includes(t));
}

function killAdNode(node) {
  node.remove();
  blockedCount++;
  blockedCountEl.textContent = blockedCount;
  shield.classList.remove('bump');
  void shield.offsetWidth; /* restart animation */
  shield.classList.add('bump');
}

function scanNode(node) {
  /* element itself */
  if (node.nodeType === Node.ELEMENT_NODE) {
    const src = node.getAttribute && node.getAttribute('src');
    const href = node.getAttribute && node.getAttribute('href');
    const dataAd = node.getAttribute && node.getAttribute('data-ad-client');
    if (isAdUrl(src) || isAdUrl(href) || dataAd || isAdAttrs(node)) {
      killAdNode(node);
      return;
    }
  }
  /* descendants */
  const bad = [];
  node.querySelectorAll && node.querySelectorAll('iframe, script, img, a[href], [id], [class]').forEach((el) => {
    const s = el.getAttribute && el.getAttribute('src');
    const h = el.getAttribute && el.getAttribute('href');
    if (isAdUrl(s) || isAdUrl(h) || (el.getAttribute && el.getAttribute('data-ad-client')) || isAdAttrs(el)) {
      bad.push(el);
    }
  });
  bad.forEach(killAdNode);
}

/* Watch the whole document for anything injected after load */
new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    m.addedNodes.forEach(scanNode);
  });
}).observe(document.documentElement, { childList: true, subtree: true });

/* Sweep what's already there (runs after DOM is ready) */
scanNode(document.body);

/* ============ Toasts ============ */
let toastTimer;

function showToast(msg, isError) {
  toast.textContent = msg;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ============ Playback ============ */

playBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (url) loadVideo(url);
});

/* ============ Search ============ */

/* Mobile (Android/iOS) gets m.youtube.com — it doesn't force-open the app.
   Desktop gets the normal www.youtube.com. */
function searchBaseUrl() {
  const ua = navigator.userAgent;
  const isMobile = /Android/i.test(ua) || /iPhone|iPad|iPod/i.test(ua);
  return isMobile ? 'https://m.youtube.com/' : 'https://www.youtube.com/';
}

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (!query) return;
  window.open(`${searchBaseUrl()}results?search_query=${encodeURIComponent(query)}`, '_blank');
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') playBtn.click();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

function extractYouTubeId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtube-nocookie.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      for (const kind of ['shorts/', 'embed/', 'live/', 'v/']) {
        if (parsed.pathname.includes(kind)) {
          const id = parsed.pathname.split(kind)[1].split('/')[0];
          if (id) return id;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

function getStartSeconds(url) {
  try {
    const parsed = new URL(url);
    const t = parsed.searchParams.get('t') || parsed.searchParams.get('start');
    if (!t) return 0;
    const match = String(t).match(/(\d+)m?(\d+)?s?/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2] || '0', 10);
  } catch {
    return 0;
  }
}

function showSpinner() {
  playerContainer.innerHTML = '<div class="spinner"></div>';
}

function loadVideo(url) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    showToast('Invalid YouTube URL — try a watch/short/youtu.be link.', true);
    return;
  }

  const start = getStartSeconds(url);
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    autoplay: '1',
  });
  if (start > 0) params.set('start', String(start));

  showSpinner();

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  iframe.allowFullscreen = true;
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.addEventListener('load', () => {
    playerContainer.innerHTML = '';
    playerContainer.appendChild(iframe);
  });

  getVideoTitle(videoId).then((title) => {
    saveToHistory({ videoId, title, url });
  });
}

/* Fetch a real title via noembed (CORS-friendly oEmbed proxy), fall back to the ID */
function getVideoTitle(videoId) {
  return fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`)
    .then((r) => r.json())
    .then((data) => data.title || `YouTube Video (${videoId})`)
    .catch(() => `YouTube Video (${videoId})`);
}

/* ============ History ============ */

function saveToHistory(video) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const existing = history.find((item) => item.videoId === video.videoId);
  if (existing) {
    existing.title = video.title;
  } else {
    history.unshift(video);
    history.length = Math.min(history.length, 30); /* cap at 30 entries */
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  historyDiv.innerHTML = '';

  if (history.length === 0) {
    historyDiv.innerHTML = '<div class="empty-note">No videos watched yet.</div>';
    return;
  }

  history.forEach((video) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const thumb = document.createElement('img');
    thumb.className = 'history-thumb';
    thumb.loading = 'lazy';
    thumb.src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
    thumb.alt = '';
    thumb.addEventListener('error', () => { thumb.src = ''; thumb.style.background = '#222'; });

    const body = document.createElement('div');
    body.className = 'history-body';
    body.innerHTML = `
      <div class="history-title">${escapeHtml(video.title)}</div>
      <div class="history-channel">replay ▶</div>
    `;

    const del = document.createElement('button');
    del.className = 'history-del';
    del.textContent = '✕';
    del.title = 'Remove from history';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const next = h.filter((x) => x.videoId !== video.videoId);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      renderHistory();
    });

    item.addEventListener('click', () => {
      urlInput.value = video.url;
      loadVideo(video.url);
    });

    item.append(thumb, body, del);
    historyDiv.appendChild(item);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared.');
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ============ Boot ============ */
renderHistory();
