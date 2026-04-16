/**
 * routes/swaggerDocs.js
 * Swagger JSDoc definitions — read automatically via apis: ["./routes/*.js"]
 * No exports, no logic.
 */

// ═══════════════════════════════════════════════════════
// BOOKINGS
// ═══════════════════════════════════════════════════════

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: List all bookings
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, finished]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: OK
 *
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [room_id, guest_name, guest_email, check_in, check_out]
 *             properties:
 *               room_id:
 *                 type: string
 *                 example: "uuid-room"
 *               guest_name:
 *                 type: string
 *                 example: "John Doe"
 *               guest_email:
 *                 type: string
 *                 example: "john@example.com"
 *               guest_phone:
 *                 type: string
 *                 example: "+40758077433"
 *               check_in:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-10"
 *               check_out:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-13"
 *               guests:
 *                 type: integer
 *                 example: 2
 *               preferred_language:
 *                 type: string
 *                 enum: [ro, en]
 *                 example: "en"
 *               payment_method:
 *                 type: string
 *                 enum: [card, bank_transfer, reception]
 *                 example: "card"
 *               payment_split:
 *                 type: string
 *                 enum: [full, advance]
 *                 example: "full"
 *               needs_invoice:
 *                 type: boolean
 *                 example: false
 *               company_name:
 *                 type: string
 *                 example: "Example SRL"
 *               company_cui:
 *                 type: string
 *                 example: "RO12345678"
 *               company_reg_no:
 *                 type: string
 *                 example: "J40/1234/2020"
 *               company_address:
 *                 type: string
 *                 example: "Str. Exemplu nr. 1, Bucharest"
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Invalid data
 *       409:
 *         description: Room not available
 */

/**
 * @swagger
 * /api/bookings/availability:
 *   get:
 *     summary: Get active bookings for calendar
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Update booking status (admin)
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled, finished]
 *                 example: "confirmed"
 *               reason:
 *                 type: string
 *                 example: "Cancelled by guest"
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Booking not found
 */

// ═══════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════

/**
 * @swagger
 * /api/payments/create-checkout:
 *   post:
 *     summary: Create a Stripe Checkout session
 *     tags: [Payments]
 *     description: Amount is read from DB — not from the request body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id]
 *             properties:
 *               booking_id:
 *                 type: string
 *                 example: "uuid-booking"
 *     responses:
 *       200:
 *         description: Checkout URL generated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               checkout_url: "https://checkout.stripe.com/pay/cs_..."
 *               session_id: "cs_test_..."
 *       503:
 *         description: Stripe not configured
 */

/**
 * @swagger
 * /api/payments/verify/{sessionId}:
 *   get:
 *     summary: Verify a Stripe session status
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: "cs_test_..."
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             example:
 *               paid: true
 *               payment_split: "full"
 *               charge_amount: 300
 *               remaining_amount: 0
 */

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Account created
 *       409:
 *         description: Email already registered
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: JWT token returned
 *         content:
 *           application/json:
 *             example:
 *               token: "eyJ..."
 *               user:
 *                 id: "uuid"
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *       401:
 *         description: Invalid credentials
 */

// ═══════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: List all active rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: OK
 */

// ═══════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: List approved reviews
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: OK
 *
 *   post:
 *     summary: Submit a review
 *     tags: [Reviews]
 *     description: Requires a valid finished booking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id, guest_email, rating, text]
 *             properties:
 *               booking_id:
 *                 type: string
 *               guest_email:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted (pending approval)
 *       400:
 *         description: Already reviewed or stay not finished
 */

// ═══════════════════════════════════════════════════════
// TEST JOBS
// ═══════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-jobs/seed:
 *   get:
 *     summary: "🌱 [RO] Seed test bookings"
 *     tags: [Test Jobs]
 *     description: |
 *       Creates 2 Romanian test bookings:
 *       - **BLV-TEST-001** — confirmed, check-out yesterday → Job 3 + Job 2
 *       - **BLV-TEST-002** — pending, created 4 days ago → Job 4
 *     responses:
 *       200:
 *         description: Test bookings created
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               nextSteps:
 *                 - "1. /trigger-finalize"
 *                 - "2. /trigger-reviews"
 *                 - "3. /trigger-expire"
 *                 - "4. /cleanup"
 */

/**
 * @swagger
 * /api/test-jobs/seed-en:
 *   get:
 *     summary: "🌱 [EN] Seed test bookings"
 *     tags: [Test Jobs]
 *     description: |
 *       Creates 3 English test bookings (preferred_language = 'en'):
 *       - **BLV-TEST-EN-001** — confirmed, check-out yesterday → Job 3 + Job 2
 *       - **BLV-TEST-EN-002** — confirmed, check-in tomorrow → Job 1
 *       - **BLV-TEST-EN-003** — pending, created 4 days ago → Job 4
 *     responses:
 *       200:
 *         description: EN test bookings created
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               nextSteps:
 *                 - "1. /trigger-reminders → EN-002 gets reminder in English"
 *                 - "2. /trigger-finalize  → EN-001 becomes finished"
 *                 - "3. /trigger-reviews   → EN-001 gets review request in English"
 *                 - "4. /trigger-expire    → EN-003 gets cancelled"
 *                 - "5. /cleanup-en"
 */

/**
 * @swagger
 * /api/test-jobs/preview-reminders:
 *   get:
 *     summary: "👁 Preview — check-in reminders"
 *     tags: [Test Jobs]
 *     description: Shows bookings with check-in tomorrow. No emails sent.
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /api/test-jobs/preview-expire:
 *   get:
 *     summary: "👁 Preview — expiring bookings"
 *     tags: [Test Jobs]
 *     description: Shows pending bank_transfer bookings older than 3 days. No changes made.
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /api/test-jobs/trigger-reminders:
 *   get:
 *     summary: "▶️ Job 1 — Check-in reminder"
 *     tags: [Test Jobs]
 *     description: Sends check-in reminder emails to guests arriving tomorrow. Runs daily at 10:00.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               emailsSent: 1
 *               emailsFailed: 0
 *               bookings:
 *                 - ref: "BLV-TEST-EN-002"
 *                   lang: "en"
 */

/**
 * @swagger
 * /api/test-jobs/trigger-reviews:
 *   get:
 *     summary: "▶️ Job 2 — Review request"
 *     tags: [Test Jobs]
 *     description: Sends review request emails to guests who checked out yesterday. Runs daily at 12:00.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               emailsSent: 1
 *               emailsFailed: 0
 */

/**
 * @swagger
 * /api/test-jobs/trigger-finalize:
 *   get:
 *     summary: "▶️ Job 3 — Finalize bookings"
 *     tags: [Test Jobs]
 *     description: Marks confirmed bookings with past check-out as 'finished'. Runs daily at 01:00.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               finalized: 1
 */

/**
 * @swagger
 * /api/test-jobs/trigger-expire:
 *   get:
 *     summary: "▶️ Job 4 — Expire bank_transfer bookings"
 *     tags: [Test Jobs]
 *     description: Cancels pending bank_transfer bookings older than 3 days and notifies guests. Runs daily at 09:00.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               cancelled: 1
 *               failed: 0
 *               bookings:
 *                 - ref: "BLV-TEST-EN-003"
 *                   lang: "en"
 */

/**
 * @swagger
 * /api/test-jobs/cleanup:
 *   get:
 *     summary: "🗑️ [RO] Delete test bookings"
 *     tags: [Test Jobs]
 *     description: Deletes BLV-TEST-001 and BLV-TEST-002 from the database.
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /api/test-jobs/cleanup-en:
 *   get:
 *     summary: "🗑️ [EN] Delete test bookings"
 *     tags: [Test Jobs]
 *     description: Deletes BLV-TEST-EN-001, BLV-TEST-EN-002 and BLV-TEST-EN-003 from the database.
 *     responses:
 *       200:
 *         description: OK
 */
