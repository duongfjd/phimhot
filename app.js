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
        hideLoader();
        return data;
    } catch (error) {
        console.error("API Error:", error);
        hideLoader();
        return null;
    }
}

// --- Router ---
function navigate(view, params = {}) {
    state.view = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (view === 'home') {
        renderHome();
    } else if (view === 'detail') {
        renderDetail(params.slug);
    } else if (view === 'list') {
        renderList(params.type, params.keyword);
    }
}

// --- Renderers ---

async function renderHome() {
    state.view = 'home';
    const data = await fetchAPI("/danh-sach/phim-moi-cap-nhat?page=1");
    if (!data || !data.items) return;

    const featured = data.items[0];
    const latest = data.items.slice(1, 13);

    appView.innerHTML = `
        <div class="hero">
            <div class="hero-bg" style="background-image: url('${featured.thumb_url}')"></div>
            <div class="hero-content animate-in">
                <span class="hero-badge">Nổi Bật</span>
                <h1 class="hero-title">${featured.name}</h1>
                <div class="hero-meta">
                    <span>${featured.year}</span>
                    <span>HD</span>
                    <span>${featured.origin_name || ''}</span>
                </div>
                <div class="hero-btns">
                    <button class="btn btn-primary" onclick="window.router.detail('${featured.slug}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Xem Ngay
                    </button>
                    <button class="btn btn-secondary" onclick="window.router.detail('${featured.slug}')">Thông Tin</button>
                </div>
            </div>
        </div>

        <section>
            <div class="section-header">
                <h2 class="section-title">Phim Mới Cập Nhật</h2>
                <a href="#" class="nav-item-link" onclick="window.router.list('all')">Xem tất cả</a>
            </div>
            <div class="movie-grid">
                ${latest.map(movie => renderMovieCard(movie)).join('')}
            </div>
        </section>
    `;

    updateActiveNavItem('home');
}

async function renderDetail(slug) {
    const data = await fetchAPI(`/phim/${slug}`);
    if (!data || !data.movie) return;

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
}

async function renderList(type, keyword = '') {
    let endpoint = "/danh-sach";
    let title = "Danh Sách Phim";

    if (keyword) {
        endpoint = `/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=24`;
        title = `Kết quả tìm kiếm: "${keyword}"`;
    } else if (type && type !== 'all') {
        endpoint = `/danh-sach?type=${type}&limit=24`;
        title = type === 'series' ? 'Phim Bộ Mới' : (type === 'hoathinh' ? 'Hoạt Hình Mới' : 'Phim Lẻ Mới');
    } else if (type === 'all') {
        endpoint = "/danh-sach/phim-moi-cap-nhat?limit=24";
        title = "Tất Cả Phim Mới";
    }

    const data = await fetchAPI(endpoint);
    if (!data || !data.items) {
        appView.innerHTML = `<section><h2 class="section-title">Không tìm thấy phim yêu cầu.</h2></section>`;
        return;
    }

    appView.innerHTML = `
        <section style="margin-top: 80px;">
            <div class="section-header">
                <h2 class="section-title">${title}</h2>
            </div>
            <div class="movie-grid">
                ${data.items.length > 0 ? data.items.map(movie => renderMovieCard(movie)).join('') : '<p>Không có dữ liệu.</p>'}
            </div>
        </section>
    `;
    
    if (type) updateActiveNavItem(type);
}

function renderMovieCard(movie) {
    return `
        <div class="movie-card animate-in" onclick="window.router.detail('${movie.slug}')">
            <img src="${movie.poster_url}" class="card-img" alt="${movie.name}" loading="lazy">
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
    detail: (slug) => navigate('detail', { slug }),
    list: (type, keyword) => navigate('list', { type, keyword })
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    navigate('home');
});
