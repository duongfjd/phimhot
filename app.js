const API_BASE = "https://vsmov.com/api";
const IMAGE_BASE = "https://vsmov.com/storage/images/";

const state = {
    view: 'home', // home, list, detail
    movies: [],
    currentMovie: null,
    searchKeyword: '',
    page: 1,
    type: '' // single, series, hoathinh
};

// --- DOM Elements ---
const appView = document.getElementById('app-view');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const navItems = document.querySelectorAll('.nav-item');
const logoBtn = document.getElementById('logo-btn');
const navbar = document.getElementById('navbar');

// --- API Service ---
async function fetchAPI(endpoint) {
    showLoader();
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        return data; // Loader is hidden by the renderer
    } catch (error) {
        console.error("API Error:", error);
        hideLoader();
        return null;
    }
}

// Check if a movie has any episodes with links
async function getWatchableDetail(slug) {
    try {
        const response = await fetch(`${API_BASE}/phim/${slug}`, {
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        if (data && data.episodes && data.episodes.length > 0) {
            const hasLinks = data.episodes.some(server => 
                server.server_data && 
                server.server_data.length > 0 && 
                typeof server.server_data[0].link_embed === 'string' &&
                server.server_data[0].link_embed.startsWith('http')
            );
            if (hasLinks) return data;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Filter a list of movies by availability
async function filterWatchableMovies(items) {
    if (!items || items.length === 0) return [];
    
    // Fetch details in parallel to speed up verification
    const results = await Promise.all(items.map(movie => getWatchableDetail(movie.slug)));
    
    // Map back: preserve original movie info but store the details too
    return results
        .map((fullData, index) => {
            if (!fullData) return null;
            return {
                ...items[index],
                fullData: fullData // This is the entire response object from /phim/[slug]
            };
        })
        .filter(item => item !== null);
}

// --- Router ---
function navigate(view, params = {}) {
    state.view = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (view === 'home') {
        renderHome();
    } else if (view === 'detail') {
        renderDetail(params.slug, params.detail);
    } else if (view === 'list') {
        renderList(params.type, params.keyword);
    }
}

// --- Renderers ---

async function renderHome() {
    state.view = 'home';
    const data = await fetchAPI("/danh-sach/phim-moi-cap-nhat?page=1");
    if (!data || !data.items) {
        hideLoader();
        return;
    }

    // Filter to show only watchable movies
    const watchableItems = await filterWatchableMovies(data.items);
    hideLoader();

    if (watchableItems.length === 0) {
        appView.innerHTML = `<section><h2 class="section-title">Hiện tại không có phim nào mới có link xem.</h2></section>`;
        return;
    }

    const featured = watchableItems[0];
    const latest = watchableItems.slice(1, 13);

    appView.innerHTML = `
        <div class="hero">
            <div class="hero-bg" style="background-image: url('${featured.thumb_url}')"></div>
            <div class="hero-content animate-in">
                <span class="hero-badge">XEM NGAY</span>
                <h1 class="hero-title">${featured.name}</h1>
                <div class="hero-meta">
                    <span>${featured.year}</span>
                    <span>HD</span>
                    <span>${featured.origin_name || ''}</span>
                </div>
                <div class="hero-btns">
                    <button class="btn btn-primary" onclick='window.router.detail("${featured.slug}", ${JSON.stringify(featured.fullData).replace(/'/g, "&apos;")})'>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Phát Phim
                    </button>
                    <button class="btn btn-secondary" onclick='window.router.detail("${featured.slug}", ${JSON.stringify(featured.fullData).replace(/'/g, "&apos;")})'>Thông Tin</button>
                </div>
            </div>
        </div>

        <section>
            <div class="section-header">
                <h2 class="section-title">Phim Mới Có Link Xem</h2>
            </div>
            <div class="movie-grid">
                ${latest.map(movie => renderMovieCard(movie)).join('')}
            </div>
        </section>
    `;

    updateActiveNavItem('home');
}

async function renderDetail(slug, cachedData = null) {
    let data = cachedData;
    if (!data) {
        data = await fetchAPI(`/phim/${slug}`);
    } else {
        showLoader(); 
        setTimeout(hideLoader, 300);
    }

    if (!data || !data.movie) {
        hideLoader();
        return;
    }

    const movie = data.movie;
    const episodes = data.episodes[0] ? data.episodes[0].server_data : [];

    appView.innerHTML = `
        <div class="detail-view animate-in">
            <div class="detail-container">
                <img src="${movie.poster_url}" class="detail-poster" alt="${movie.name}">
                <div class="detail-content">
                    <h1 class="detail-title">${movie.name}</h1>
                    <p class="detail-original">${movie.origin_name} (${movie.year})</p>
                    <div class="tags">
                        ${movie.category.map(c => `<span class="tag">${c.name}</span>`).join('')}
                        <span class="tag">${movie.quality}</span>
                        <span class="tag">${movie.lang}</span>
                    </div>
                    <p class="detail-desc">${movie.content || 'Đang cập nhật nội dung...'}</p>
                    
                    <div class="hero-btns">
                        <button class="btn btn-primary" onclick="scrollAndPlay()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Phát Phim
                        </button>
                    </div>

                    <div class="episodes" id="episode-section">
                        <h3 class="section-title">Danh Sách Tập</h3>
                        <div class="episode-list">
                            ${episodes.map((ep, idx) => `
                                <button class="episode-btn ${idx === 0 ? 'active' : ''}" 
                                        onclick="playEpisode(this, '${ep.link_embed}')">
                                    ${ep.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div id="player-container">
                        ${episodes.length > 0 ? `
                            <div class="watch-container" style="display: none;">
                                <iframe id="main-player" src="${episodes[0].link_embed}" allowfullscreen></iframe>
                            </div>
                        ` : '<p style="margin-top:2rem;">Hiện tại chưa có link xem phim.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
    hideLoader();
}

async function renderList(type, keyword = '') {
    let endpoint = "/danh-sach";
    let title = "Danh Sách Phim";

    if (keyword) {
        endpoint = `/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=24`; // Increase limit since we filter
        title = `Kết quả tìm kiếm: "${keyword}"`;
    } else if (type && type !== 'all') {
        endpoint = `/danh-sach?type=${type}&limit=24&status=completed`; // Prefer completed for lists
        title = type === 'series' ? 'Phim Bộ Mới' : (type === 'hoathinh' ? 'Hoạt Hình Mới' : 'Phim Lẻ Mới');
    } else if (type === 'all') {
        endpoint = "/danh-sach/phim-moi-cap-nhat?limit=24";
        title = "Tất Cả Phim Mới";
    }

    const data = await fetchAPI(endpoint);
    if (!data || !data.items) {
        appView.innerHTML = `<section><h2 class="section-title">Không tìm thấy phim yêu cầu.</h2></section>`;
        hideLoader();
        return;
    }

    // Filter to show only watchable movies
    const watchableItems = await filterWatchableMovies(data.items);
    hideLoader();

    appView.innerHTML = `
        <section style="margin-top: 80px;">
            <div class="section-header">
                <h2 class="section-title">${title}</h2>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">Đã lọc bỏ phim chưa có link xem</div>
            </div>
            <div class="movie-grid">
                ${watchableItems.length > 0 ? watchableItems.map(movie => renderMovieCard(movie)).join('') : '<p>Không có phim nào có link xem sẵn sàng.</p>'}
            </div>
        </section>
    `;
    
    if (type) updateActiveNavItem(type);
}

function renderMovieCard(movie) {
    const detailAttr = movie.fullData ? `window.router.detail("${movie.slug}", ${JSON.stringify(movie.fullData).replace(/'/g, "&apos;")})` : `window.router.detail("${movie.slug}")`;
    const poster = typeof movie.poster_url === 'string' ? movie.poster_url : (movie.thumb_url || '');

    return `
        <div class="movie-card animate-in" onclick='${detailAttr}'>
            <img src="${poster}" class="card-img" alt="${movie.name}" loading="lazy">
            <div class="card-overlay">
                <div class="card-title">${movie.name}</div>
                <div class="card-meta">
                    <span>${movie.year}</span>
                    <span>${movie.origin_name || ''}</span>
                </div>
            </div>
            <div class="card-info">
                 <div class="card-title">${movie.name}</div>
            </div>
        </div>
    `;
}

// --- Utilities ---

function showLoader() { loader.style.opacity = '1'; loader.style.display = 'flex'; }
function hideLoader() { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }

function updateActiveNavItem(type) {
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.type === type);
    });
}

window.playEpisode = (btn, url) => {
    document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const iframe = document.getElementById('main-player');
    const container = document.querySelector('.watch-container');
    container.style.display = 'block';
    iframe.src = url;
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.scrollAndPlay = () => {
    const container = document.querySelector('.watch-container');
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        alert("Chưa có link xem phim cho bộ phim này.");
    }
};

// --- Event Listeners ---

logoBtn.onclick = () => navigate('home');

navItems.forEach(item => {
    item.onclick = (e) => {
        e.preventDefault();
        const type = item.dataset.type;
        if (type === 'home') navigate('home');
        else navigate('list', { type });
    };
});

// Search Logic
let searchTimeout;
searchInput.oninput = (e) => {
    clearTimeout(searchTimeout);
    const keyword = e.target.value.trim();
    if (keyword.length > 2) {
        searchTimeout = setTimeout(() => {
            navigate('list', { keyword });
        }, 500);
    }
};

// Navbar Scroll Effect
window.onscroll = () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
};

// Expose Router to Global
window.router = {
    home: () => navigate('home'),
    detail: (slug, data) => navigate('detail', { slug, detail: data }),
    list: (type, keyword) => navigate('list', { type, keyword })
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    navigate('home');
});
