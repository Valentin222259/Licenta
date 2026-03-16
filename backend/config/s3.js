const { S3Client } = require("@aws-sdk/client-s3");

// ─── Client Amazon S3 (AWS SDK v3) ────────────────────────────────────────────
//
// Variabile necesare în .env:
//   AWS_ACCESS_KEY_ID     = AKIA...
//   AWS_SECRET_ACCESS_KEY = ...
//   AWS_REGION            = eu-central-1   (sau ce regiune alegi)
//   S3_BUCKET_NAME        = belvedere-images
//
// Pe Elastic Beanstalk NU pui credențialele manual —
// în schimb atașezi un IAM Role instanței EC2 cu permisiuni S3.
// SDK-ul le detectează automat din environment.
//
// Pentru development local folosești variabilele din .env.

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",

  // Credențialele sunt opționale explicit — SDK le ia automat din:
  // 1. Variabilele de mediu (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY) — local dev
  // 2. IAM Role atașat instanței EC2 — producție EB
  // 3. ~/.aws/credentials — dacă ai AWS CLI configurat local
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "belvedere-images";

module.exports = { s3Client, BUCKET_NAME };
