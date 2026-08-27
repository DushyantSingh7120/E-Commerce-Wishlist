# WishCart — E-Commerce Wishlist App

A live product wishlist app where users can browse products, save favorites, and revisit them anytime — even after closing the browser. Built as a practical demo of persistent, per-user data storage using Firebase Firestore.

🔗 **Live demo:** [e-commerce-wishlist.vercel.app](https://e-commerce-wishlist.vercel.app/)

## Features
- Browse a live product catalog (pulled from a public API)
- Save/unsave products to a personal wishlist with one click
- Wishlist persists across sessions — close the browser, come back later, items are still saved
- No login required — each visitor's wishlist is tracked automatically
- Light/dark theme toggle with saved preference
- Smooth micro-interactions on save, remove, and hover states
- Fully responsive layout

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (Tailwind CSS)
- **Data source:** fakestoreapi.com (public product API)
- **Database:** Firebase Firestore (real-time persistent storage)
- **Hosting:** Vercel

## How It Works
1. Products are fetched live from a public e-commerce API and rendered in a grid.
2. Each visitor is assigned a lightweight anonymous device ID (stored in localStorage) — no account needed.
3. Clicking the heart icon writes that product to Firestore, tagged with the device ID.
4. The Wishlist tab reads back only the items tied to that device ID.
5. Removing an item deletes it from Firestore in real time.

## Running Locally

```bash
git clone https://github.com/DushyantSingh7120/E-Commerce-Wishlist.git
cd E-Commerce-Wishlist
```

Run `npm install`, create a `config.js` file matching `config.example.js` with your own Firebase credentials, then run `npx serve .`

## What This Project Demonstrates
Built as part of a structured portfolio series focused on one new practical concept per project. This one covers persistent, per-user data storage with Firestore — the foundation for wishlists, bookmarks, saved searches, and similar features common in real freelance and product work.
