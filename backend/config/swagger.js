/**
 * config/swagger.js — Configurare Swagger / OpenAPI 3.0
 *
 * Generează documentația interactivă a API-ului.
 * Accesibilă la: http://localhost:3001/api-docs
 */

"use strict";

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pensiunea Maramureș Belvedere — API",
      version: "1.0.0",
      description: `
API-ul backend al aplicației de rezervări pentru Pensiunea Maramureș Belvedere.

## Autentificare
Rutele protejate necesită un token JWT trimis în header:
\`Authorization: Bearer <token>\`

## Endpoint-uri de test (doar development)
Rutele \`/api/test-jobs/*\` permit declanșarea manuală a job-urilor cron
fără să aștepți ora fixă de execuție.

## Flux rezervare
1. **POST /api/bookings** — creează rezervarea (status: pending)
2. **POST /api/payments/create-checkout** — generează link Stripe
3. **POST /api/payments/webhook** — confirmă automat după plată (status: confirmed)
4. **PUT /api/bookings/:id/status** — admin schimbă statusul manual
      `,
      contact: {
        name: "Pensiunea Maramureș Belvedere",
        email: "contact@belvedere.ro",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Server local (development)",
      },
    ],
    tags: [
      { name: "Rezervări", description: "Gestionarea rezervărilor" },
      { name: "Plăți", description: "Integrare Stripe — checkout și webhook" },
      { name: "Camere", description: "Camerele disponibile" },
      { name: "Autentificare", description: "Login, register, profil" },
      { name: "Recenzii", description: "Recenzii lăsate de oaspeți" },
      {
        name: "Test Jobs",
        description: "🧪 Testare manuală job-uri cron (doar development)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT obținut din POST /api/auth/login",
        },
      },
      schemas: {
        Booking: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            booking_ref: { type: "string", example: "BLV-2026-001" },
            guest_name: { type: "string", example: "Ion Popescu" },
            guest_email: { type: "string", example: "ion@example.com" },
            guest_phone: { type: "string", example: "+40758077433" },
            room_name: {
              type: "string",
              example: "Camera 3 — Balcon & Pădure",
            },
            check_in: { type: "string", format: "date", example: "2026-05-10" },
            check_out: {
              type: "string",
              format: "date",
              example: "2026-05-13",
            },
            nights: { type: "integer", example: 3 },
            guests: { type: "integer", example: 2 },
            total_price: { type: "integer", example: 750 },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "finished"],
              example: "confirmed",
            },
            payment_method: {
              type: "string",
              enum: ["card", "bank_transfer", "reception"],
              example: "card",
            },
            payment_split: {
              type: "string",
              enum: ["full", "advance"],
              example: "full",
            },
            stripe_amount: { type: "integer", example: 750, nullable: true },
            remaining_amount: { type: "integer", example: 0 },
            needs_invoice: { type: "boolean", example: false },
            company_name: {
              type: "string",
              example: "SC Exemplu SRL",
              nullable: true,
            },
            company_cui: {
              type: "string",
              example: "RO12345678",
              nullable: true,
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Mesaj de eroare" },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
      },
    },
  },
  // Fișierele în care Swagger caută comentarii JSDoc cu @swagger
  apis: ["./routes/*.js", "./routes/testJobs.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
