# SurplusIQ — AI-Driven Surplus Food Management System

A full-stack web application that connects restaurants with NGOs to reduce food waste using AI-powered surplus prediction, smart matching, and real-time tracking.

---

## What This Platform Does

Restaurants prepare food daily but often end up with surplus. This platform:

1. **Predicts surplus** before it happens using a Machine Learning model (Linear Regression + Random Forest)
2. **Lets restaurants donate or sell** the predicted surplus to nearby NGOs
3. **NGOs discover and claim** food listings ranked by AI score (distance + urgency + quantity)
4. **Tracks delivery** with real-time status updates and delivery partner details
5. **Reports CSR impact** — food saved, people fed, CO₂ reduced — with downloadable PDF reports

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework — component-based, type-safe |
| Vite | Fast dev server and build tool |
| React Router v6 | Client-side routing with role-based access |
| Axios | HTTP client for API calls |
| Recharts | Bar charts for CSR analytics dashboard |
| Leaflet + React-Leaflet | Free interactive India map (no API key needed) |
| OpenStreetMap | Map tile provider for Leaflet |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| TypeScript | Type safety across the backend |
| MongoDB + Mongoose | NoSQL database for users, listings, requests, notifications |
| JWT (jsonwebtoken) | Stateless authentication — 24-hour tokens |
| bcryptjs | Password hashing (salt rounds: 10) |
| Nodemailer | Sends verification codes and password reset OTPs via Gmail SMTP |
| PDFKit | Generates downloadable CSR impact reports as PDF |
| Axios | Calls the Python ML microservice |

### Machine Learning (Python Microservice)
| Technology | Purpose |
|---|---|
| Python 3 | ML microservice language |
| Flask | Lightweight REST API framework for the ML service |
| scikit-learn | Linear Regression + Random Forest Regressor for surplus prediction |
| pandas | Loads and processes the training dataset (CSV) |
| numpy | Numerical computations |

### Testing
| Technology | Purpose |
|---|---|
| Jest + ts-jest | Unit and integration test runner |
| Supertest | HTTP integration tests against the Express app |
| MongoDB Memory Server | In-memory MongoDB for tests (no live DB needed) |
| fast-check | Property-based testing for pure functions |

---

## Architecture

```
Browser (React SPA)
    ↓ HTTP/JSON (port 5173)
Node.js / Express API (port 5000)
    ↓ Mongoose          ↓ HTTP (port 8000)
MongoDB             Python ML Service (Flask + scikit-learn)
```

---

## User Roles

### Restaurant
- Runs the **AI Surplus Predictor** — enters food type, quantity, expected guests, prep time, expiry time
- ML model predicts surplus or shortage
- If surplus → choose **Donate** (free to NGOs) or **Sell** (discounted)
- Posts food listing which NGOs can see and claim
- Views **My Listings** with live claim/delivery status
- Manages **Incoming NGO Requests** — accepts or marks delivered
- Views **CSR Impact Dashboard** — food saved, people fed, CO₂ reduced, downloadable PDF report

### NGO
- Views **Available Food** listings ranked by AI composite score
- Map shows all food locations across India (Leaflet)
- Accepts listings — auto-switches to **My Accepted Food** tab
- Tracks delivery status: Requested → Accepted → Delivered
- Sees assigned **delivery partner** details (name, phone, vehicle, ETA)

### Admin
- Full **CSR Analytics Dashboard** with charts and PDF export
- Access to all analytics data

---

## Key Features

### 1. AI Surplus Prediction (ML)
- **Algorithm**: Linear Regression + Random Forest (scikit-learn picks the better one by R² score)
- **Training data**: `ml/food_surplus_dataset.csv` — 105 records across 7 food types (Rice, Curry, Pizza, Bread, Pasta, Biryani, Salad)
- **Inputs**: food type, quantity prepared, expected guests, hours until expiry, day of week
- **Output**: predicted surplus kg, consumption rate, R² accuracy score, urgency level, recommendation
- **Typical accuracy**: R² > 99% (Random Forest)

### 2. Smart Matching Engine
- Pure TypeScript function — no ML library needed
- Scores each listing: `0.4 × distanceScore + 0.4 × urgencyScore + 0.2 × quantityScore`
- Uses Haversine formula for great-circle distance calculation
- Returns listings sorted by composite score descending

### 3. Email OTP Authentication
- Registration sends a 6-digit OTP to Gmail
- Forgot password sends a 6-digit OTP → user enters OTP → sets new password → auto logged in
- OTPs expire after 15 minutes
- Powered by Nodemailer + Gmail SMTP with App Password

### 4. India Map (Leaflet)
- Shows all food listing locations as colored pins
- 🟢 Available · 🟠 Claimed · 🔵 Delivered · 🟣 Your location
- Restricted to India bounds — cannot pan outside India
- Click any pin → popup with food details

### 5. CSR Dashboard
- Pulls data from `GET /analytics`
- Metrics: Total Food Saved (kg), Total Donations, People Fed (kg × 2), CO₂ Reduced (kg × 2.5)
- Bar chart visualization (Recharts)
- **Download CSR Report** → generates PDF via PDFKit (accessible to restaurant + admin)

### 6. Notifications
- In-app bell icon polls every 10 seconds
- Restaurant notified when NGO claims their listing
- NGO notified when restaurant accepts or marks delivered
- Click notification → marks as read

---

## Project Structure

```
/
├── backend/                    Node.js + Express API
│   ├── src/
│   │   ├── models/             Mongoose schemas (User, FoodListing, FoodRequest, Notification)
│   │   ├── routes/             Express routers (auth, food, analytics, notifications, PDF, predict)
│   │   ├── services/           Business logic (auth, food, analytics, email, PDF, prediction)
│   │   ├── middleware/         JWT auth + role guard
│   │   ├── utils/              Haversine calculator
│   │   └── tests/              Unit, PBT, and integration tests
│   ├── .env                    Environment variables (not committed)
│   └── .env.example            Template for environment variables
│
├── frontend/                   React + Vite SPA
│   ├── src/
│   │   ├── pages/              Login, Register, VerifyEmail, ForgotPassword, ResetPassword,
│   │   │                       RestaurantDashboard, NGODashboard, AdminDashboard
│   │   ├── components/         NavBar, NotificationBell, FoodMap, PrivateRoute
│   │   ├── context/            AuthContext (token + user state)
│   │   ├── api/                Axios client + typed API functions
│   │   └── styles/             Dark theme tokens (colors, radius, shadow)
│   └── .env                    VITE_API_URL + VITE_GOOGLE_MAPS_API_KEY
│
└── ml/                         Python ML microservice
    ├── predict_service.py      Flask API — trains and serves the model
    ├── food_surplus_dataset.csv Training data (105 records, 7 food types)
    └── requirements.txt        flask, pandas, numpy, scikit-learn
```

---

## Prerequisites

- Node.js v18+
- Python 3.9+
- MongoDB (local or Atlas)

---

## Environment Setup

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/surplus-food
JWT_SECRET=your_random_secret
PORT=5000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
APP_BASE_URL=http://localhost:5173
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

---

## Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# ML service
cd ml && pip install -r requirements.txt
```

---

## Run the App

Open 3 terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 — ML Service:**
```bash
cd ml
python predict_service.py
```

---

## Seed the Database

```bash
cd backend
npm run seed
```

Creates 3 restaurant accounts, 3 NGO accounts, 10 food listings, 5 requests.
All seed accounts use password: `Password123!`

| Role | Email |
|---|---|
| Restaurant | greenleaf@restaurant.com |
| Restaurant | sunrisecafe@restaurant.com |
| Restaurant | harvestkitchen@restaurant.com |
| NGO | hopeharbor@ngo.org |
| NGO | feedla@ngo.org |
| NGO | chicagocares@ngo.org |

---

## Run Tests

```bash
cd backend
npm test
```

Runs 95 tests across 14 suites — unit, property-based (fast-check), and integration (Supertest + MongoDB Memory Server).

---

## API Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | /auth/register | Public | Register new account |
| POST | /auth/login | Public | Login |
| POST | /auth/verify-email | Public | Verify email with OTP |
| POST | /auth/forgot-password | Public | Send login OTP to email |
| POST | /auth/verify-login-otp | Public | Verify OTP and login |
| POST | /auth/reset-password-otp | Public | Verify OTP + set new password + login |
| POST | /food/addFood | Restaurant | Post food listing |
| GET | /food/availableFood | NGO | Get ranked available listings |
| POST | /food/acceptRequest | NGO | Claim a listing |
| GET | /food/myRequests | NGO | Get NGO's accepted requests |
| GET | /food/myListings | Restaurant | Get restaurant's listings |
| GET | /food/myListingsWithRequests | Restaurant | Listings with request status |
| GET | /food/incomingRequests | Restaurant | NGO requests for restaurant's listings |
| PATCH | /food/requests/:id/status | Restaurant | Update request status |
| GET | /analytics | Authenticated | CSR metrics |
| GET | /export/csr-report | Restaurant/Admin | Download PDF report |
| POST | /predict-surplus | Authenticated | ML surplus prediction |
| GET | /notifications | Authenticated | Unread notifications |
| PATCH | /notifications/:id/read | Authenticated | Mark notification read |

---

## Deployment

### Backend → Render
- Root directory: `backend`
- Build: `npm install && npm run build`
- Start: `node dist/server.js`
- Add all `.env` variables in Render dashboard

### Frontend → Vercel
- Root directory: `frontend`
- Add `VITE_API_URL=https://your-render-backend-url`

### Database → MongoDB Atlas
- Create free M0 cluster
- Whitelist Render IP
- Copy connection string to `MONGO_URI`

### ML Service
- Deploy to Render as a separate Python web service
- Add `ML_SERVICE_URL` to backend environment variables
