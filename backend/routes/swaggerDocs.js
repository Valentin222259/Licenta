/**
 * routes/swaggerDocs.js — Documentația Swagger pentru toate rutele
 *
 * Acest fișier conține DOAR comentarii JSDoc cu @swagger.
 * Nu exportă nimic, nu are logică — e citit automat de swagger-jsdoc.
 *
 * Nu trebuie montat în server.js — swagger.js îl găsește prin glob apis: ["./routes/*.js"]
 */

// ═══════════════════════════════════════════════════════════════════
// REZERVĂRI
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Listă toate rezervările
 *     tags: [Rezervări]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, finished]
 *         description: Filtrează după status
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
 *         description: Listă rezervări
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 total:
 *                   type: integer
 *                   example: 12
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Creează o rezervare nouă
 *     tags: [Rezervări]
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
 *                 example: "uuid-camera"
 *               guest_name:
 *                 type: string
 *                 example: "Ion Popescu"
 *               guest_email:
 *                 type: string
 *                 example: "ion@example.com"
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
 *                 example: "SC Exemplu SRL"
 *               company_cui:
 *                 type: string
 *                 example: "RO12345678"
 *               company_reg_no:
 *                 type: string
 *                 example: "J40/1234/2020"
 *               company_address:
 *                 type: string
 *                 example: "Str. Exemplu nr. 1, București"
 *     responses:
 *       201:
 *         description: Rezervare creată cu succes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Date invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Camera nu este disponibilă în perioada selectată
 */

/**
 * @swagger
 * /api/bookings/availability:
 *   get:
 *     summary: Disponibilitate camere (rezervările active)
 *     tags: [Rezervări]
 *     responses:
 *       200:
 *         description: Lista rezervărilor active pentru calendar
 */

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Schimbă statusul unei rezervări (admin)
 *     tags: [Rezervări]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID-ul rezervării
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
 *                 example: "Anulat de către client"
 *                 description: Motivul anulării (opțional, pentru cancelled)
 *     responses:
 *       200:
 *         description: Status actualizat cu succes
 *       400:
 *         description: Tranziție de status invalidă
 *       404:
 *         description: Rezervarea nu există
 */

// ═══════════════════════════════════════════════════════════════════
// PLĂȚI
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/payments/create-checkout:
 *   post:
 *     summary: Creează sesiune Stripe Checkout
 *     tags: [Plăți]
 *     description: |
 *       Generează un link de plată Stripe pentru o rezervare existentă.
 *       Suma este preluată din DB (nu din request) — securitate împotriva manipulării.
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
 *                 example: "uuid-rezervare"
 *     responses:
 *       200:
 *         description: Link Stripe generat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 checkout_url:
 *                   type: string
 *                   example: "https://checkout.stripe.com/pay/cs_..."
 *                 session_id:
 *                   type: string
 *       503:
 *         description: Stripe nu este configurat (lipsește STRIPE_SECRET_KEY)
 */

/**
 * @swagger
 * /api/payments/verify/{sessionId}:
 *   get:
 *     summary: Verifică statusul unei sesiuni Stripe
 *     tags: [Plăți]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: "cs_test_..."
 *     responses:
 *       200:
 *         description: Detalii sesiune Stripe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paid:
 *                   type: boolean
 *                 payment_split:
 *                   type: string
 *                 charge_amount:
 *                   type: integer
 *                 remaining_amount:
 *                   type: integer
 */

// ═══════════════════════════════════════════════════════════════════
// TEST JOBS
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-jobs:
 *   get:
 *     summary: Lista endpoint-urilor de test disponibile
 *     tags: [Test Jobs]
 *     responses:
 *       200:
 *         description: Lista tuturor endpoint-urilor de test
 */

/**
 * @swagger
 * /api/test-jobs/preview-reminders:
 *   get:
 *     summary: "Preview: ce rezervări ar primi reminder mâine"
 *     tags: [Test Jobs]
 *     description: |
 *       **Nu trimite niciun email.**
 *       Returnează lista rezervărilor cu check-in mâine care ar fi notificate de Job 1.
 *       Util pentru a verifica că jobul are date de procesat înainte de a-l declanșa.
 *     responses:
 *       200:
 *         description: Lista rezervărilor vizate de Job 1
 *         content:
 *           application/json:
 *             example:
 *               job: "Job 1 — Reminder check-in"
 *               targetDate: "2026-05-11"
 *               count: 2
 *               wouldSendTo:
 *                 - booking_ref: "BLV-2026-019"
 *                   guest_name: "Ion Popescu"
 *                   guest_email: "ion@example.com"
 *                   room_name: "Camera 3 — Balcon & Pădure"
 */

/**
 * @swagger
 * /api/test-jobs/trigger-reminders:
 *   get:
 *     summary: "▶️ Declanșează Job 1 — Reminder check-in"
 *     tags: [Test Jobs]
 *     description: |
 *       **Trimite efectiv emailuri** de reminder pentru rezervările cu check-in mâine.
 *       Echivalent cu ce face Job 1 automat zilnic la 10:00.
 *     responses:
 *       200:
 *         description: Rezultatul execuției
 *         content:
 *           application/json:
 *             example:
 *               job: "Job 1 — Reminder check-in"
 *               status: "done"
 *               emailsSent: 2
 *               emailsFailed: 0
 */

/**
 * @swagger
 * /api/test-jobs/trigger-reviews:
 *   get:
 *     summary: "▶️ Declanșează Job 2 — Cerere recenzie"
 *     tags: [Test Jobs]
 *     description: |
 *       **Trimite efectiv emailuri** de cerere recenzie pentru rezervările
 *       finalizate cu check-out ieri. Echivalent cu Job 2 (zilnic 12:00).
 *     responses:
 *       200:
 *         description: Rezultatul execuției
 */

/**
 * @swagger
 * /api/test-jobs/trigger-finalize:
 *   get:
 *     summary: "▶️ Declanșează Job 3 — Finalizare rezervări"
 *     tags: [Test Jobs]
 *     description: |
 *       **Marchează ca 'finished'** rezervările confirmate cu check-out trecut.
 *       Echivalent cu Job 3 (zilnic 01:00).
 *     responses:
 *       200:
 *         description: Rezervările finalizate
 */

/**
 * @swagger
 * /api/test-jobs/preview-expire:
 *   get:
 *     summary: "Preview: ce rezervări ar expira azi"
 *     tags: [Test Jobs]
 *     description: |
 *       **Nu anulează nimic.**
 *       Arată rezervările bank_transfer pending mai vechi de 3 zile
 *       care ar fi anulate de Job 4.
 *     responses:
 *       200:
 *         description: Lista rezervărilor vizate de Job 4
 */

/**
 * @swagger
 * /api/test-jobs/trigger-expire:
 *   get:
 *     summary: "▶️ Declanșează Job 4 — Expirare rezervări bank_transfer"
 *     tags: [Test Jobs]
 *     description: |
 *       **Anulează efectiv** rezervările bank_transfer pending mai vechi de 3 zile
 *       și trimite emailuri clientului + alertă admin.
 *       Echivalent cu Job 4 (zilnic 09:00).
 *     responses:
 *       200:
 *         description: Rezultatul execuției
 *         content:
 *           application/json:
 *             example:
 *               job: "Job 4 — Expirare bank_transfer"
 *               status: "done"
 *               cancelled: 1
 *               failed: 0
 */

// ═══════════════════════════════════════════════════════════════════
// AUTENTIFICARE
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Înregistrare cont nou
 *     tags: [Autentificare]
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
 *                 example: "Ion Popescu"
 *               email:
 *                 type: string
 *                 example: "ion@example.com"
 *               password:
 *                 type: string
 *                 example: "parola123"
 *     responses:
 *       201:
 *         description: Cont creat cu succes
 *       409:
 *         description: Email deja înregistrat
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentificare
 *     tags: [Autentificare]
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
 *                 example: "ion@example.com"
 *               password:
 *                 type: string
 *                 example: "parola123"
 *     responses:
 *       200:
 *         description: Autentificare reușită — returnează token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Credențiale invalide
 */

// ═══════════════════════════════════════════════════════════════════
// CAMERE
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Lista tuturor camerelor active
 *     tags: [Camere]
 *     responses:
 *       200:
 *         description: Lista camerelor
 */

/**
 * @swagger
 * /api/test-jobs/seed:
 *   get:
 *     summary: "🌱 Creează rezervări de test în DB"
 *     tags: [Test Jobs]
 *     description: |
 *       Inserează 2 rezervări fictive pentru testarea joburilor:
 *       - **BLV-TEST-001** — confirmed, check-out ieri → testează Job 3 și Job 2
 *       - **BLV-TEST-002** — pending, creat acum 4 zile → testează Job 4
 *
 *       **Rulează PRIMUL** înainte de orice trigger.
 *     responses:
 *       200:
 *         description: Rezervări create cu succes
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               message: "Rezervări de test create cu succes."
 *               nextSteps:
 *                 - "1. /api/test-jobs/trigger-finalize"
 *                 - "2. /api/test-jobs/trigger-reviews"
 *                 - "3. /api/test-jobs/trigger-expire"
 *                 - "4. /api/test-jobs/cleanup"
 */

/**
 * @swagger
 * /api/test-jobs/cleanup:
 *   get:
 *     summary: "🗑️ Șterge rezervările de test din DB"
 *     tags: [Test Jobs]
 *     description: |
 *       Șterge BLV-TEST-001 și BLV-TEST-002 din baza de date.
 *       **Rulează ULTIMUL** după ce ai terminat testele.
 *       Datele reale ale pensiunii nu sunt afectate.
 *     responses:
 *       200:
 *         description: Rezervări de test șterse
 *         content:
 *           application/json:
 *             example:
 *               status: "done"
 *               message: "2 rezervare(i) de test șterse."
 */

// ═══════════════════════════════════════════════════════════════════
// RECENZII
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Lista recenziilor aprobate
 *     tags: [Recenzii]
 *     responses:
 *       200:
 *         description: Lista recenziilor
 *   post:
 *     summary: Adaugă o recenzie (necesită booking_id valid și finalizat)
 *     tags: [Recenzii]
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
 *         description: Recenzie adăugată (în așteptare aprobare)
 *       400:
 *         description: Recenzie deja existentă sau sejur nefinalizat
 */
