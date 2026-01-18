import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";
import dotenv from "dotenv";
dotenv.config();

const accessKey = process.env.S3_ACCESS_KEY?.trim();
const secretKey = process.env.S3_SECRET_KEY?.trim();
const endpoint = process.env.S3_ENDPOINT?.trim();

export const s3 = new S3Client({
  endpoint,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false // allow self-signed certs
    })
  })
});

console.log("S3 client initialized for MinIO:", {
  endpoint,
  accessKeyPreview: accessKey?.slice(0, 4) + "***"
});
