<div align="center">

# 🛍️ ApnaKirana — Instant Grocery & Daily Kirana Platform

[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js_24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express_4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io_4-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp_OTP-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://ultramsg.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet_Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

<p align="center">
  <b>A hyper-local instant commerce and kirana delivery application modeled after Blinkit, Swiggy Instamart, and Zomato.</b><br>
  Features real-time GPS rider tracking, automated WhatsApp OTP authentication, multi-role portals (Customer, Shopkeeper, Admin), and full offline/online order synchronization.
</p>

[Explore Branches](https://github.com/bhavyacec25/Apna_kirana/branches) • [Report Bug](https://github.com/bhavyacec25/Apna_kirana/issues) • [Request Feature](https://github.com/bhavyacec25/Apna_kirana/issues)

</div>

---

## 🌟 Key Highlights & Architecture

### 1. 💬 Automated WhatsApp OTP Authentication
* **Zero Telecom Cost:** Eliminates cellular SMS DLT fees by streaming 6-digit OTP verification codes directly to the customer's WhatsApp chat via the UltraMsg Gateway.
* **Instamart-Style 6-Box Input:** Auto-advancing OTP input boxes with backspace navigation, auto-focus, and clipboard paste support.
* **Multi-Channel Fallback:** Supports Gmail SMTP email verification and Firebase Authentication.

### 2. 🛵 Blinkit & Zomato Style Live Delivery Tracking
* **CartoDB Voyager Vector Map:** High-contrast, clean road geometry without proprietary Google Maps billing or API token limitations.
* **Live Dynamic ETA & Distance:** Uses the Haversine geodesic algorithm to dynamically compute exact remaining distance (`km`) and real-time arrival estimates (`~X mins`).
* **Pulsating Radar Scooter:** High-visibility delivery partner scooter marker with animated sonar radar halo and orientation heading.
* **Delivery Partner Profile Card:** Displays assigned driver details (**Vikas Kumar**, ★ 4.9, Hero Splendor PB 10 EK 4589, Verified Safety Check) with direct 1-tap phone dialer and quick delivery instructions presets.

### 3. 📱 Delivery Partner Mobile Console (`/rider/:orderId`)
* **Real Mobile Phone GPS Streaming:** Riders open their order URL on any mobile browser and tap **"START SHARING REAL PHONE GPS"** (`navigator.geolocation.watchPosition` with high accuracy).
* **Automatic Simulation Override:** Instantly shuts down synthetic server interpolation whenever real smartphone GPS packets stream in.
* **1-Tap Google Maps Navigation:** Generates native turn-by-turn driving directions to the customer's doorstep in Google Maps.
* **One-Touch Status Control:** Allows riders to toggle delivery states (`Out for Delivery` &rarr; `Delivered`).

---

## 🏗️ System Architecture

```
apnakirana/
├── backend/
│   ├── routes/              ← REST API endpoints (auth, orders, products, admin, reviews)
│   ├── middleware/          ← JWT authentication, role guards & centralized error handling
│   ├── deliverySimulation.js← Real-time vehicle simulation with real GPS override
│   ├── realtime.js          ← Socket.IO event broadcaster (order:location, order:status)
│   ├── sms.js               ← WhatsApp (UltraMsg) & multi-gateway dispatcher
│   ├── mailer.js            ← Gmail SMTP email OTP transporter
│   └── server.js            ← Express HTTP & WebSocket server entrypoint
│
└── frontend/
    ├── src/
    │   ├── components/      ← Reusable UI (LiveTrackingMap, Navbar, Cards, Badges)
    │   ├── context/         ← Global AuthContext and state providers
    │   ├── pages/
    │   │   ├── customer/    ← Home, Shop, Cart, Checkout, OrderTracking, Wishlist
    │   │   ├── shopkeeper/  ← Dashboard, Orders, Products, Legal/GST Registration
    │   │   ├── admin/       ← Admin Dashboard, Shops, Users, System Orders
    │   │   ├── Login.jsx    ← Swiggy Instamart-style WhatsApp OTP login
    │   │   └── RiderPortal.jsx ← Mobile delivery partner GPS transmitter
    │   └── services/        ← API fetchers, location streaming & socket clients
```

---

## 🔀 Git Branching Strategy & GitFlow

This repository follows standard industrial GitFlow conventions:

| Branch | Description | Status |
| :--- | :--- | :--- |
| **`main`** | Production-ready stable release branch | ![Production](https://img.shields.io/badge/Status-Stable-brightgreen) |
| **`develop`** | Active integration branch for ongoing staging | ![Develop](https://img.shields.io/badge/Status-Active-blue) |
| **`feature/whatsapp-otp`** | WhatsApp gateway dispatcher and UltraMsg automation | ![Feature](https://img.shields.io/badge/Status-Merged-success) |
| **`feature/live-tracking-map`** | CartoDB Voyager map, Haversine ETA calculation & radar marker | ![Feature](https://img.shields.io/badge/Status-Merged-success) |
| **`feature/rider-portal`** | Dedicated mobile driver console with Google Maps directions | ![Feature](https://img.shields.io/badge/Status-Merged-success) |
| **`feature/instamart-ui`** | 6-digit individual box OTP and Swiggy Instamart aesthetic | ![Feature](https://img.shields.io/badge/Status-Merged-success) |

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js v18+ (tested on Node.js v24.17.0)
* npm or pnpm

### 1. Clone Repository
```bash
git clone https://github.com/bhavyacec25/Apna_kirana.git
cd Apna_kirana
```

### 2. Configure Backend Environment
Copy the environment template in `backend/.env.example` to `backend/.env` and update your credentials:
```env
PORT=5000
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
WHATSAPP_INSTANCE_ID=your_instance_id
WHATSAPP_API_KEY=your_token
JWT_SECRET=apnakirana_secret_key
```

### 3. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
> Server runs on `http://localhost:5000` with WebSocket attached.

### 4. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
```
> Client opens on `http://localhost:5173`.

---

## 📡 REST API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-otp` | Public | Generates & dispatches OTP via WhatsApp / Gmail |
| `POST` | `/api/auth/verify-otp` | Public | Verifies 6-digit OTP code & issues JWT session |
| `GET` | `/api/orders` | Auth | Retrieves user-filtered or shop-filtered order history |
| `GET` | `/api/orders/:id/location` | Customer | Returns live coordinates, ETA, speed, and real GPS status |
| `GET` | `/api/orders/:id/rider` | Public | Provides delivery driver console data |
| `POST` | `/api/orders/:id/rider-location` | Rider | Streams real mobile GPS coordinates (`lat`, `lng`, `speed`) |
| `POST` | `/api/orders/:id/rider-status` | Rider | Updates order status (`Out for Delivery`, `Delivered`) |

---

## 👨‍💻 Author

**Bhavya Chhajer**  
* GitHub: [@bhavyacec25](https://github.com/bhavyacec25)  
* Email: [chhajerbhavya30@gmail.com](mailto:chhajerbhavya30@gmail.com)

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
