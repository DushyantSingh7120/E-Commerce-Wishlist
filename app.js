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
const productGrid = document.getElementById('product-grid');
const tabButtons  = document.querySelectorAll('.tab-btn');

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

async function toggleWishlist(productOrId) {
    const product = typeof productOrId === 'object'
        ? productOrId
        : allProducts.find(p => p.id === productOrId);

    if (!product) return;

    const productId = product.id;
    const docId = `${deviceId}_${productId}`;
    const docRef = doc(db, 'wishlists', docId);

    if (isWishlisted(productId)) {
        wishlist = wishlist.filter(w => w !== productId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));

        try {
            await deleteDoc(docRef);
        } catch (err) {
            console.error('Error deleting from Firestore:', err);
        }
    } else {
        wishlist.push(productId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));

        try {
            await setDoc(docRef, {
                deviceId: deviceId,
                productId: productId,
                title: product.title,
                price: product.price,
                image: product.image,
                timestamp: serverTimestamp()
            });
        } catch (err) {
            console.error('Error saving to Firestore:', err);
        }
    }

    // Refresh the current view to show updated heart icon state
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
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
    card.querySelector('.wishlist-btn').addEventListener('click', () => toggleWishlist(product));
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
