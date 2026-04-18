# Requirements Document

## Introduction

The AI-Driven Surplus Food Management System is a full-stack web application that connects restaurants with NGOs to reduce food waste. Restaurants post surplus food details, NGOs discover and claim nearby donations, and an AI-based smart matching algorithm prioritizes matches by distance, quantity, and expiry urgency. A CSR dashboard provides analytics on food saved, donations made, estimated people fed, and CO2 emissions reduced. The system is built with React.js (frontend), Node.js/Express (backend), and MongoDB (database), with optional Firebase for hosting and authentication.

## Glossary

- **System**: The AI-Driven Surplus Food Management System as a whole
- **Restaurant**: A registered food-providing organization that posts surplus food listings
- **NGO**: A registered non-governmental organization that claims and collects surplus food
- **Admin**: A privileged user who manages the system and can view all data
- **Food_Listing**: A record created by a Restaurant describing surplus food available for donation
- **Food_Request**: A record created by an NGO expressing intent to collect a specific Food_Listing
- **Matching_Engine**: The AI component that ranks Food_Listings for a given NGO based on distance, quantity, and expiry urgency
- **Prediction_Engine**: The rule-based or ML component that forecasts future surplus quantity for a Restaurant
- **CSR_Dashboard**: The analytics view showing aggregate impact metrics
- **Haversine_Calculator**: The utility that computes great-circle distance between two geographic coordinates
- **Auth_Service**: The component responsible for user registration, login, session management, email verification, and password reset
- **Email_Service**: The component responsible for sending transactional emails (verification codes, password reset links)
- **Verification_Code**: A time-limited numeric or alphanumeric code sent to a user's email to confirm ownership
- **Reset_Token**: A time-limited signed token sent via email to authorize a password reset
- **Notification_Service**: The component responsible for sending in-app alerts to users
- **PDF_Exporter**: The component that generates downloadable CSR reports in PDF format

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a Restaurant or NGO representative, I want to register and log in with a role-specific account, so that I can access the dashboard appropriate to my organization type.

#### Acceptance Criteria

1. THE Auth_Service SHALL support two user roles: `restaurant` and `ngo`.
2. WHEN a new user submits a registration form with a valid email, password, organization name, and role, THE Auth_Service SHALL create a new account in an `unverified` state, send a Verification_Code to the provided email, and return a message instructing the user to verify their email.
3. IF a registration request is submitted with an email that already exists, THEN THE Auth_Service SHALL return an error message indicating the email is already registered.
4. WHEN a user submits valid login credentials, THE Auth_Service SHALL return a signed session token and the user's role.
5. IF a login request is submitted with invalid credentials, THEN THE Auth_Service SHALL return an error message and SHALL NOT return a session token.
6. WHILE a user holds a valid session token, THE System SHALL grant access only to the endpoints and UI views permitted for that user's role.
7. WHEN a session token expires after 24 hours, THE Auth_Service SHALL reject subsequent authenticated requests and require re-login.

---

### Requirement 13: Email Verification

**User Story:** As a newly registered user, I want to verify my email address with a code, so that the system can confirm I own the email and prevent duplicate or fake accounts.

#### Acceptance Criteria

1. WHEN a new account is created, THE Email_Service SHALL send a 6-digit Verification_Code to the registered email address that expires after 15 minutes.
2. WHEN a user submits the correct Verification_Code via `POST /auth/verify-email`, THE Auth_Service SHALL mark the account as `verified` and return a signed session token.
3. IF the submitted Verification_Code is incorrect, THEN THE Auth_Service SHALL return an error message stating the code is invalid and SHALL NOT verify the account.
4. IF the submitted Verification_Code has expired, THEN THE Auth_Service SHALL return an error message stating the code has expired and SHALL NOT verify the account.
5. IF a user attempts to log in with an `unverified` account, THEN THE Auth_Service SHALL return an error message instructing the user to verify their email first and SHALL NOT return a session token.
6. WHEN a user requests a new Verification_Code via `POST /auth/resend-verification`, THE Email_Service SHALL invalidate any existing code for that email and send a fresh 6-digit code with a new 15-minute expiry.
7. THE System SHALL prevent duplicate verified accounts by ensuring only one `verified` account can exist per email address.

---

### Requirement 14: Forgot Password and Password Reset

**User Story:** As a registered user who has forgotten my password, I want to receive a password reset link by email, so that I can securely set a new password and regain access to my account.

#### Acceptance Criteria

1. WHEN a user submits their email address via `POST /auth/forgot-password`, THE Auth_Service SHALL generate a Reset_Token, store a hashed version of it with a 1-hour expiry, and instruct THE Email_Service to send a password reset link containing the token to that email.
2. IF the submitted email does not match any registered account, THEN THE Auth_Service SHALL return the same success-like response as a valid request to prevent email enumeration attacks.
3. WHEN a user submits a new password along with a valid Reset_Token via `POST /auth/reset-password`, THE Auth_Service SHALL hash the new password, update the user's `passwordHash`, invalidate the Reset_Token, and return a success message.
4. IF the submitted Reset_Token is invalid or does not match any stored token, THEN THE Auth_Service SHALL return an error message stating the token is invalid and SHALL NOT update the password.
5. IF the submitted Reset_Token has expired (older than 1 hour), THEN THE Auth_Service SHALL return an error message stating the token has expired and SHALL NOT update the password.
6. IF the new password submitted during reset is fewer than 8 characters, THEN THE Auth_Service SHALL return a validation error and SHALL NOT update the password.
7. AFTER a successful password reset, THE Auth_Service SHALL invalidate all existing session tokens for that user, requiring re-login.

---

### Requirement 2: Restaurant — Post Surplus Food

**User Story:** As a Restaurant, I want to post details about my surplus food, so that NGOs can discover and claim it.

#### Acceptance Criteria

1. WHEN a Restaurant submits a food posting with food name, quantity in kilograms, expiry datetime, and location (latitude and longitude), THE System SHALL create a new Food_Listing record with status `available` and return the created record.
2. IF a food posting request is missing any required field (food name, quantity, expiry datetime, or location), THEN THE System SHALL return a descriptive validation error identifying the missing field.
3. IF the submitted quantity is less than or equal to zero, THEN THE System SHALL return a validation error stating that quantity must be a positive number.
4. IF the submitted expiry datetime is earlier than the current server time, THEN THE System SHALL return a validation error stating that expiry time must be in the future.
5. THE System SHALL associate each Food_Listing with the authenticated Restaurant's account identifier.
6. WHEN a Restaurant requests its own food listings via `GET /availableFood`, THE System SHALL return all Food_Listings belonging to that Restaurant ordered by creation date descending.

---

### Requirement 3: NGO — View and Claim Surplus Food

**User Story:** As an NGO, I want to view available surplus food sorted by proximity and urgency, so that I can efficiently claim donations before they expire.

#### Acceptance Criteria

1. WHEN an NGO requests available food listings, THE System SHALL return all Food_Listings with status `available`, sorted by the Matching_Engine's priority score descending.
2. THE Matching_Engine SHALL compute a priority score for each Food_Listing using distance from the NGO's registered location, remaining time until expiry, and listed quantity.
3. WHEN an NGO submits an acceptance request for a specific Food_Listing via `POST /acceptRequest`, THE System SHALL create a Food_Request record with status `requested` and update the Food_Listing status to `claimed`.
4. IF an NGO submits an acceptance request for a Food_Listing that already has status `claimed` or `delivered`, THEN THE System SHALL return an error message stating the listing is no longer available.
5. WHILE a Food_Request exists for a listing, THE System SHALL display the current status (`requested`, `accepted`, or `delivered`) to both the Restaurant and the NGO involved.
6. WHEN a Restaurant updates a Food_Request status to `accepted` or `delivered`, THE System SHALL persist the new status and return the updated Food_Request record.
7. THE NGO Dashboard SHALL display the AI composite score for each listing as a visible "AI Score" badge, and SHALL display urgency labels: 🔴 High urgency (expiry ≤ 2 hours), 🟡 Medium urgency (expiry ≤ 6 hours), 🟢 Best match (highest composite score in the list).
8. THE NGO Dashboard SHALL display the predicted surplus for tomorrow for each food type, sourced from the Prediction_Engine, alongside each listing card.

---

### Requirement 4: Smart Matching Algorithm (AI Feature)

**User Story:** As an NGO, I want the system to rank surplus food listings intelligently, so that the most urgent and nearest donations appear first.

#### Acceptance Criteria

1. THE Matching_Engine SHALL accept as input a list of Food_Listings and an NGO's geographic coordinates, and SHALL return the list sorted by priority score descending.
2. THE Matching_Engine SHALL compute distance between the NGO's location and each Food_Listing's location using the Haversine_Calculator.
3. THE Matching_Engine SHALL assign a higher priority score to Food_Listings with a shorter distance from the NGO.
4. THE Matching_Engine SHALL assign a higher priority score to Food_Listings with less time remaining until expiry (greater urgency).
5. THE Matching_Engine SHALL assign a higher priority score to Food_Listings with a larger quantity.
6. THE Matching_Engine SHALL normalize each factor (distance, expiry urgency, quantity) to a 0–1 scale before combining them into a single composite score.
7. FOR ALL valid sets of Food_Listings and NGO coordinates, THE Matching_Engine SHALL return a list of the same length as the input list (no listings are dropped).
8. FOR ALL valid sets of Food_Listings and NGO coordinates, applying THE Matching_Engine twice SHALL produce the same sorted order as applying it once (idempotence).

---

### Requirement 5: Food Surplus Prediction

**User Story:** As a Restaurant, I want to see a predicted surplus quantity for upcoming days, so that I can plan donations in advance.

#### Acceptance Criteria

1. WHEN a Restaurant requests a surplus prediction for a given day of the week and food type, THE Prediction_Engine SHALL return a predicted surplus quantity in kilograms.
2. THE Prediction_Engine SHALL derive predictions from the Restaurant's historical Food_Listing records stored in the database.
3. IF a Restaurant has fewer than 3 historical records for a given food type, THEN THE Prediction_Engine SHALL return a default estimate of 5 kg and include a message indicating insufficient historical data.
4. THE Prediction_Engine SHALL use a rule-based weighted average of past quantities for the same day of the week and food type to compute the prediction.
5. WHEN the Prediction_Engine returns a result, THE System SHALL include the predicted quantity, the food type, the target day, and the confidence level (`low`, `medium`, or `high`) based on the number of historical records used.

---

### Requirement 6: Location and Distance Calculation

**User Story:** As an NGO, I want to see how far each food listing is from my location, so that I can make informed pickup decisions.

#### Acceptance Criteria

1. THE Haversine_Calculator SHALL accept two pairs of latitude and longitude coordinates and SHALL return the great-circle distance in kilometers.
2. WHEN a Food_Listing is created, THE System SHALL store the location as a latitude and longitude pair.
3. WHEN an NGO views available food listings, THE System SHALL include the computed distance in kilometers from the NGO's registered location for each listing.
4. IF either coordinate pair contains a latitude outside the range −90 to 90 or a longitude outside the range −180 to 180, THEN THE Haversine_Calculator SHALL return a validation error.
5. FOR ALL valid coordinate pairs, computing the distance from point A to point B SHALL return the same value as computing the distance from point B to point A (symmetry property).

---

### Requirement 7: CSR Analytics Dashboard

**User Story:** As an Admin or stakeholder, I want to view aggregate impact metrics with visual charts and a downloadable PDF report, so that I can report on the organization's social and environmental contribution.

#### Acceptance Criteria

1. WHEN a request is made to `GET /analytics`, THE System SHALL return the total weight of food saved in kilograms, the total number of completed donations, the estimated number of people fed, and the estimated CO2 emissions reduced in kilograms.
2. THE System SHALL compute estimated people fed using the formula: `total_kg_saved × 2` (assuming 0.5 kg per meal, 1 meal per person).
3. THE System SHALL compute estimated CO2 reduced using the formula: `total_kg_saved × 2.5` (kg CO2 per kg food waste avoided).
4. THE System SHALL derive all analytics values from Food_Listings with status `delivered`.
5. WHEN the analytics endpoint is called with an optional date range filter, THE System SHALL restrict calculations to Food_Listings delivered within the specified date range.
6. THE CSR Dashboard SHALL display graphical charts visualizing the analytics metrics, including at minimum a bar or line chart of donations over time and a summary chart of food saved vs. people fed vs. CO2 reduced.
7. THE CSR Dashboard SHALL include an "Export PDF" button that, when clicked, calls `GET /export/csr-report` and triggers a browser file download of the generated PDF report.

---

### Requirement 8: API Endpoints

**User Story:** As a developer integrating with the system, I want well-defined REST API endpoints, so that frontend and third-party clients can interact with the backend reliably.

#### Acceptance Criteria

1. THE System SHALL expose `POST /addFood` to create a new Food_Listing, requiring authentication with the `restaurant` role.
2. THE System SHALL expose `GET /availableFood` to retrieve Food_Listings, requiring authentication.
3. THE System SHALL expose `POST /acceptRequest` to create a Food_Request, requiring authentication with the `ngo` role.
4. THE System SHALL expose `GET /analytics` to retrieve CSR metrics, requiring authentication.
5. IF a request is made to any authenticated endpoint without a valid session token, THEN THE System SHALL return HTTP status 401 and an error message.
6. IF a request is made to a role-restricted endpoint by a user with an insufficient role, THEN THE System SHALL return HTTP status 403 and an error message.
7. WHEN any API endpoint encounters an unhandled server error, THE System SHALL return HTTP status 500 and a generic error message without exposing internal stack traces.

---

### Requirement 9: Separate Role-Based Dashboards (Frontend)

**User Story:** As a user, I want a dashboard tailored to my role, so that I only see the features and data relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN a Restaurant user logs in, THE System SHALL display the Restaurant Dashboard showing the food posting form and the Restaurant's own Food_Listings.
2. WHEN an NGO user logs in, THE System SHALL display the NGO Dashboard showing available Food_Listings sorted by the Matching_Engine's priority score.
3. THE System SHALL display the current status of each Food_Request on both the Restaurant Dashboard and the NGO Dashboard.
4. WHEN an Admin user logs in, THE System SHALL display the CSR Dashboard with aggregate analytics metrics, graphical charts, and an "Export PDF" button.
5. IF a user attempts to navigate to a dashboard route not permitted for their role, THEN THE System SHALL redirect the user to their permitted dashboard.

---

### Requirement 10: Notifications

**User Story:** As a Restaurant or NGO user, I want to receive in-app alerts when the status of a food listing or request changes, so that I can act promptly.

#### Acceptance Criteria

1. WHEN a Food_Request status changes to `accepted` or `delivered`, THE Notification_Service SHALL create an in-app alert for the NGO associated with that request.
2. WHEN a new Food_Request is created for a Restaurant's listing, THE Notification_Service SHALL create an in-app alert for the Restaurant.
3. WHEN a user loads their dashboard, THE System SHALL display all unread notifications for that user.
4. WHEN a user marks a notification as read, THE System SHALL update the notification record and exclude it from subsequent unread notification responses.
5. THE frontend SHALL poll `GET /notifications` every 10 seconds to surface new alerts without requiring a page reload, ensuring near-real-time notification delivery without WebSocket infrastructure.

---

### Requirement 15: AI Visibility in UI

**User Story:** As an NGO user, I want to see the AI reasoning behind each listing's ranking, so that I can make informed pickup decisions quickly.

#### Acceptance Criteria

1. THE NGO Dashboard SHALL display the composite AI score (0–1, rounded to 2 decimal places) as a visible badge on each listing card.
2. THE NGO Dashboard SHALL display urgency labels on each listing: 🔴 High urgency when expiry is within 2 hours, 🟡 Medium urgency when expiry is within 6 hours, and 🟢 Best match on the top-ranked listing.
3. THE Restaurant Dashboard SHALL display the Prediction_Engine's predicted surplus quantity and confidence level for tomorrow, grouped by food type.

---

### Requirement 16: Deployment

**User Story:** As a developer, I want the system deployed and accessible online, so that stakeholders can evaluate the prototype without local setup.

#### Acceptance Criteria

1. THE frontend SHALL be deployable to Vercel using the `VITE_API_URL` environment variable to point to the backend.
2. THE backend SHALL be deployable to Render with all environment variables from `.env.example` configured as Render environment variables.
3. THE backend SHALL connect to a MongoDB Atlas cluster via the `MONGO_URI` environment variable.
4. THE README SHALL include one-click deploy instructions or step-by-step deployment guides for both Vercel and Render.

---

### Requirement 11: CSR Report Export

**User Story:** As an Admin, I want to export the CSR analytics as a PDF report, so that I can share impact data with stakeholders.

#### Acceptance Criteria

1. WHEN an Admin requests a CSR report export, THE PDF_Exporter SHALL generate a PDF document containing all analytics metrics returned by `GET /analytics`.
2. THE PDF_Exporter SHALL include the report generation date, total food saved, number of donations, estimated people fed, and estimated CO2 reduced in the exported document.
3. WHEN the PDF is successfully generated, THE System SHALL return the file as a downloadable attachment with the filename `csr-report-{YYYY-MM-DD}.pdf`.
4. IF the PDF generation fails, THEN THE System SHALL return an error message and SHALL NOT return a partial or corrupted file.

---

### Requirement 12: Sample Data and Local Setup

**User Story:** As a developer, I want sample seed data and clear setup instructions, so that I can run and evaluate the system locally without manual data entry.

#### Acceptance Criteria

1. THE System SHALL include a seed script that inserts at least 3 Restaurant accounts, 3 NGO accounts, 10 Food_Listings with varied statuses, and 5 Food_Requests into the database.
2. THE System SHALL include a README file with step-by-step instructions to install dependencies, configure environment variables, run the seed script, start the backend server, and start the frontend development server.
3. THE README SHALL include deployment instructions for hosting the frontend on Vercel or Firebase Hosting and the backend on Render.
4. THE System SHALL use environment variables for all sensitive configuration values including database connection strings, JWT secrets, and API keys, and SHALL NOT hard-code these values in source files.
