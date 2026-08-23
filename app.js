import { db } from './firebase.js';
import { doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const API_URL = 'https://fakestoreapi.com/products';

// ─── Device Identity ──────────────────────────────────────────────────────────
/** Stable per-device ID used to identify this user in Firestore. */
export const deviceId = (() => {
    const KEY = 'deviceId';
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
    }
    return id;
})();

// ─── State ────────────────────────────────────────────────────────────────────
let allProducts = [];
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const productGrid  = document.getElementById('product-grid');
const tabButtons   = document.querySelectorAll('.tab-btn');
const themeToggle  = document.getElementById('theme-toggle');

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// ─── Toast Notifications ──────────────────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message, icon = '✓') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    const dismiss = () => {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };
    setTimeout(dismiss, 2000);
}

// ─── Tab Switching ─────────────────────────────────────────────────────────────
function setActiveTab(tabName) {
    tabButtons.forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    if (tabName === 'products') renderProducts();
    else renderWishlist();
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

// ─── Render Helpers ────────────────────────────────────────────────────────────
function isWishlisted(id) {
    return wishlist.includes(id);
}

async function toggleWishlist(product, btn) {
    // Heart pop — restarts animation even if clicked rapidly
    if (btn) {
        btn.classList.remove('pop');
        void btn.offsetWidth; // force reflow to restart animation
        btn.classList.add('pop');
        btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
    }

    if (!product) return;

    const productId = product.id;
    const docId     = `${deviceId}_${productId}`;
    const docRef    = doc(db, 'wishlists', docId);
    const removing  = isWishlisted(productId);

    if (removing) {
        wishlist = wishlist.filter(w => w !== productId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        showToast('Removed from wishlist', '🤍');
        try { await deleteDoc(docRef); }
        catch (err) { console.error('Firestore delete error:', err); }
    } else {
        wishlist.push(productId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        showToast('Added to wishlist', '❤️');
        try {
            await setDoc(docRef, {
                deviceId, productId,
                title: product.title, price: product.price, image: product.image,
                timestamp: serverTimestamp()
            });
        } catch (err) { console.error('Firestore write error:', err); }
    }

    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;

    // Wishlist tab + removing: animate card out, then re-render
    if (removing && activeTab === 'wishlist' && btn) {
        const card = btn.closest('.product-card');
        if (card) {
            card.classList.add('card-removing');
            card.addEventListener('animationend', () => renderWishlist(), { once: true });
            return;
        }
    }

    if (activeTab === 'products') renderProducts();
    else renderWishlist();
}

function buildCard(product) {
    const wishlisted = isWishlisted(product.id);
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="card-image-wrap">
            <img src="${product.image}" alt="${product.title}" class="card-img" loading="lazy">
        </div>
        <div class="card-body">
            <p class="card-category">${product.category}</p>
            <h2 class="card-title">${product.title}</h2>
            <div class="card-footer">
                <span class="card-price">$${product.price.toFixed(2)}</span>
                <button
                    class="wishlist-btn ${wishlisted ? 'active' : ''}"
                    data-id="${product.id}"
                    aria-label="${wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}"
                    title="${wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                         fill="${wishlisted ? 'currentColor' : 'none'}"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    card.querySelector('.wishlist-btn').addEventListener('click', (e) => {
        toggleWishlist(product, e.currentTarget);
    });
    return card;
}

function showSkeleton(count = 8) {
    productGrid.innerHTML = Array(count).fill(`
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line medium"></div>
                <div class="skeleton skeleton-footer">
                    <div class="skeleton skeleton-price"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function showEmpty(message, icon = '🤍') {
    productGrid.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">${icon}</span>
            <p class="empty-message">${message}</p>
        </div>
    `;
}

function showError(message) {
    productGrid.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">⚠️</span>
            <p class="empty-message">${message}</p>
            <button class="retry-btn" id="retry-btn">Retry</button>
        </div>
    `;
    document.getElementById('retry-btn')?.addEventListener('click', loadProducts);
}

// ─── Render Views ──────────────────────────────────────────────────────────────
function renderProducts() {
    productGrid.innerHTML = '';
    if (!allProducts.length) return;
    allProducts.forEach(p => productGrid.appendChild(buildCard(p)));
}

function renderWishlist() {
    productGrid.innerHTML = '';
    const items = allProducts.filter(p => isWishlisted(p.id));
    if (!items.length) {
        showEmpty('Your wishlist is empty. Start adding products!', '🤍');
        return;
    }
    items.forEach(p => productGrid.appendChild(buildCard(p)));
}

// ─── Data Fetching ─────────────────────────────────────────────────────────────
function showSpinner() {
    productGrid.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <span class="spinner-label">Loading products…</span>
        </div>
    `;
}

async function loadProducts() {
    showSpinner();
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allProducts = await res.json();
        renderProducts();
    } catch (err) {
        console.error('Failed to fetch products:', err);
        showError('Failed to load products. Check your connection.');
    }
}

// ─── Init ──────────────────────────────────────────────────────────────────────
// type="module" scripts are deferred by default — DOM is ready, call directly.
loadProducts();
