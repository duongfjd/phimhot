const API_BASE = "https://vsmov.com/api";
const IMAGE_BASE = "https://vsmov.com/storage/images/";

const state = {
    view: 'home', // home, list, detail
    movies: [],
    currentMovie: null,
    searchKeyword: '',
    page: 1,
    type: '', // single, series, hoathinh
    categories: [],
    countries: [],
    filters: {
        category: '',
        country: '',
        year: ''
    }
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

// --- Router ---
function navigate(view, params = {}) {
    state.view = view;
    // Reset filters if navigating to a new list type or home
    if (view === 'home') {
        state.filters = { category: '', country: '', year: '' };
    }
    
    // Update state filters if provided
    if (params.filters) {
        state.filters = { ...state.filters, ...params.filters };
    } else if (view === 'list' && !params.category && !params.country && !params.year) {
        // Keep current filters if navigating within lists unless explicitly reset
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (view === 'home') {
        renderHome();
    } else if (view === 'detail') {
        renderDetail(params.slug, params.detail);
    } else if (view === 'list') {
        renderList(params);
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

    hideLoader();

    if (data.items.length === 0) {
        appView.innerHTML = `<section><h2 class="section-title">Hiện tại không có phim nào mới.</h2></section>`;
        return;
    }

    const featured = data.items[0];
    const latest = data.items.slice(1, 13);

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
                    <button class="btn btn-primary" onclick='window.router.detail("${featured.slug}")'>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Phát Phim
                    </button>
                    <button class="btn btn-secondary" onclick='window.router.detail("${featured.slug}")'>Thông Tin</button>
                </div>
            </div>
        </div>

        <section>
            <div class="section-header">
                <h2 class="section-title">Phim Mới Cập Nhật</h2>
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

async function renderList(params = {}) {
    const { type, keyword } = params;
    const { category, country, year } = state.filters;
    
    let endpoint = "/danh-sach";
    let title = "Danh Sách Phim";

    // Build query params
    const queryParams = new URLSearchParams();
    if (keyword) queryParams.append('keyword', keyword);
    if (type && type !== 'all') queryParams.append('type', type);
    if (category) queryParams.append('category', category);
    if (country) queryParams.append('country', country);
    if (year) queryParams.append('year', year);
    queryParams.append('limit', '24');

    if (keyword) {
        endpoint = `/tim-kiem?${queryParams.toString()}`;
        title = `Kết quả tìm kiếm: "${keyword}"`;
    } else {
        endpoint = `/danh-sach?${queryParams.toString()}`;
        if (type === 'series') title = 'Phim Bộ Mới';
        else if (type === 'hoathinh') title = 'Hoạt Hình Mới';
        else if (type === 'movie') title = 'Phim Lẻ Mới';
        else if (type === 'all') title = 'Tất Cả Phim Mới';
    }

    // Special case for specific category/country titles
    if (category && !type && !keyword) {
        const cat = state.categories.find(c => c.slug === category);
        if (cat) title = `Phim Thể Loại: ${cat.name}`;
    }
    if (country && !type && !keyword) {
        const cou = state.countries.find(c => c.slug === country);
        if (cou) title = `Phim Quốc Gia: ${cou.name}`;
    }

    const data = await fetchAPI(endpoint);
    if (!data || !data.items) {
        appView.innerHTML = `
            <section style="margin-top: 80px;">
                ${renderFilterBar()}
                <h2 class="section-title">Không tìm thấy phim yêu cầu.</h2>
            </section>`;
        hideLoader();
        return;
    }

    hideLoader();

    appView.innerHTML = `
        <section style="margin-top: 80px;">
            <div class="section-header">
                <h2 class="section-title">${title}</h2>
            </div>
            ${renderFilterBar()}
            <div class="movie-grid">
                ${data.items.length > 0 ? data.items.map((movie, idx) => renderMovieCard(movie, idx)).join('') : '<p>Không tìm thấy phim yêu cầu với bộ lọc hiện tại.</p>'}
            </div>
        </section>
    `;
    
    if (type) updateActiveNavItem(type);
    attachFilterListeners();
}

function renderFilterBar() {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= 2010; i--) years.push(i);

    return `
        <div class="filter-bar animate-in">
            <div class="filter-group">
                <label>Thể loại</label>
                <select id="filter-category" class="custom-select">
                    <option value="">Tất cả</option>
                    ${state.categories.map(c => `<option value="${c.slug}" ${state.filters.category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Quốc gia</label>
                <select id="filter-country" class="custom-select">
                    <option value="">Tất cả</option>
                    ${state.countries.map(c => `<option value="${c.slug}" ${state.filters.country === c.slug ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Năm</label>
                <select id="filter-year" class="custom-select">
                    <option value="">Tất cả</option>
                    ${years.map(y => `<option value="${y}" ${state.filters.year == y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>
            <button class="btn-clear" onclick="clearFilters()">Xóa Lọc</button>
        </div>
    `;
}

function attachFilterListeners() {
    ['category', 'country', 'year'].forEach(f => {
        const el = document.getElementById(`filter-${f}`);
        if (el) {
            el.onchange = (e) => {
                const newFilters = { ...state.filters, [f]: e.target.value };
                navigate('list', { filters: newFilters });
            };
        }
    });
}

window.clearFilters = () => {
    state.filters = { category: '', country: '', year: '' };
    navigate('list');
};

function renderMovieCard(movie, index = 0) {
    const detailAttr = `window.router.detail("${movie.slug}")`;
    const poster = typeof movie.poster_url === 'string' ? movie.poster_url : (movie.thumb_url || '');
    const delay = index * 0.05;

    return `
        <div class="movie-card animate-in" style="animation-delay: ${delay}s" onclick='${detailAttr}'>
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

async function initFilters() {
    const [catData, counData] = await Promise.all([
        fetch(`${API_BASE}/the-loai`).then(r => r.json()),
        fetch(`${API_BASE}/quoc-gia`).then(r => r.json())
    ]);
    
    if (catData && catData.data) state.categories = catData.data.items;
    if (counData && counData.data) state.countries = counData.data.items;
}

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
        state.filters = { category: '', country: '', year: '' }; // Reset filters on navigation
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
    list: (type, keyword, filters) => navigate('list', { type, keyword, filters })
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initFilters();
    navigate('home');
});
