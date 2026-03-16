const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "belvedere-images";
const REGION = process.env.AWS_REGION || "eu-central-1";

const s3Client = new S3Client({
  region: REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Upload fișier în S3 ─────────────────────────────────────────────────────
async function uploadToS3(buffer, originalName, mimeType, folder = "misc") {
  const ext = originalName.split(".").pop();
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
}

// ─── Șterge fișier din S3 ────────────────────────────────────────────────────
async function deleteFromS3(key) {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
  );
}

// ─── URL semnat (acces temporar la fișiere private) ──────────────────────────
async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// ─── Verifică configurarea S3 la pornire ─────────────────────────────────────
function checkS3Config() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
    console.warn(
      "⚠️  S3: variabilele AWS_* lipsesc din .env — upload imagini dezactivat",
    );
    return false;
  }
  console.log(`✅ S3 configurat: bucket=${BUCKET_NAME}, region=${REGION}`);
  return true;
}

module.exports = {
  s3Client,
  BUCKET_NAME,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  checkS3Config,
};
