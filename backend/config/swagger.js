/**
 * config/swagger.js
 * Swagger / OpenAPI 3.0 — available at http://localhost:3001/api-docs
 */

"use strict";

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Maramures Belvedere — API",
      version: "1.0.0",
      description:
        "REST API for the Maramures Belvedere guesthouse booking application.",
      contact: {
        name: "Maramures Belvedere",
        email: "contact@maramures-belvedere.ro",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local (development)",
      },
    ],
    tags: [
      { name: "Bookings" },
      { name: "Payments" },
      { name: "Rooms" },
      { name: "Auth" },
      { name: "Reviews" },
      { name: "Settings" },
      {
        name: "Test Jobs",
        description: "Manual triggers for cron jobs — development only.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
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
            room_name: { type: "string", example: "Room 3" },
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
            company_name: { type: "string", nullable: true },
            company_cui: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Error message" },
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
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
