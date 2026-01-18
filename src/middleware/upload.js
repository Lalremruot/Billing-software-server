import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
// import { s3 } from "./utils/s3.js";
import path from "path";
import { s3 } from "../utils/s3.js";

const storage = multer.memoryStorage(); // we no longer write to disk

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb(new Error("Only images are allowed"), false);
};

export const uploadUserLogo = multer({ storage, fileFilter });

// Middleware to upload file to S3/MinIO
// If a file is present, uploads it and attaches the URL to req.uploadedFileUrl
// Then calls next() to continue to the next middleware
export const uploadToMinio = async (req, res, next) => {
  try {
    // If no file is provided, continue to next middleware (file upload is optional)
    const file = req.file;
    if (!file) {
      return next();
    }

    // Validate required environment variables
    if (!process.env.S3_BUCKET) {
      return res.status(500).json({ 
        error: "S3_BUCKET environment variable is not configured" 
      });
    }

    if (!process.env.S3_ENDPOINT) {
      return res.status(500).json({ 
        error: "S3_ENDPOINT environment variable is not configured" 
      });
    }

    // Validate credentials are set and not empty
    const accessKey = process.env.S3_ACCESS_KEY?.trim();
    const secretKey = process.env.S3_SECRET_KEY?.trim();
    
    if (!accessKey || !secretKey || accessKey.length === 0 || secretKey.length === 0) {
      return res.status(500).json({ 
        error: "S3 credentials (S3_ACCESS_KEY or S3_SECRET_KEY) are not configured or are empty",
        details: "Please ensure both S3_ACCESS_KEY and S3_SECRET_KEY are set in your .env file"
      });
    }

    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    console.log("Attempting to upload to S3/MinIO:");
    console.log("  Bucket:", process.env.S3_BUCKET);
    console.log("  Endpoint:", process.env.S3_ENDPOINT);
    console.log("  Filename:", filename);
    console.log("  File size:", file.buffer.length, "bytes");
    console.log("  Access Key (first 4 chars):", accessKey?.substring(0, 4) + "***");
    console.log("  S3 Client Config:",process.env.S3_SECRET_KEY, {
      region: s3.config.region,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: s3.config.forcePathStyle,
      hasCredentials: !!s3.config.credentials
    });

    await s3.send(new PutObjectCommand(uploadParams));
    
    console.log("Upload successful!");

    // Construct the file URL
    const fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${filename}`;
    
    // Attach the uploaded file URL to the request object for the next middleware
    req.uploadedFileUrl = fileUrl;
    
    // Continue to the next middleware (updateProfile)
    return next();
  } catch (err) {
    console.error("S3 Upload Error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      name: err.name,
      $metadata: err.$metadata
    });
    
    // Provide more specific error messages
    const errorMessage = err.message || "";
    const errorName = err.name || "";
    
    // Check for credential errors
    if (errorMessage.includes("credential") || errorMessage.includes("Credential") || 
        errorName.includes("Credential")) {
      return res.status(500).json({ 
        error: "S3 credentials are invalid",
        details: `The credentials you provided don't match your MinIO server. Please verify:
1. S3_ACCESS_KEY matches a valid MinIO access key
2. S3_SECRET_KEY matches the secret key for that access key
3. These credentials exist in your MinIO server configuration
4. If using MinIO root user, ACCESS_KEY is usually "minioadmin" and SECRET_KEY is your MINIO_ROOT_PASSWORD`
      });
    }
    
    // Check for access denied (403) - usually means credentials are wrong
    if (err.$metadata?.httpStatusCode === 403 || errorMessage.includes("403") || 
        errorMessage.includes("AccessDenied") || errorMessage.includes("Forbidden")) {
      return res.status(500).json({ 
        error: "Access denied by MinIO",
        details: `Your credentials were rejected. Please verify:
1. S3_ACCESS_KEY and S3_SECRET_KEY are correct
2. The user has permission to write to bucket "${process.env.S3_BUCKET}"
3. The bucket exists in your MinIO server`
      });
    }
    
    // Check for bucket errors
    if (errorMessage.includes("Bucket") || errorMessage.includes("bucket") || 
        errorMessage.includes("NoSuchBucket")) {
      return res.status(500).json({ 
        error: "S3 bucket error",
        details: `Bucket "${process.env.S3_BUCKET}" not found. Please verify:
1. The bucket exists in your MinIO server
2. S3_BUCKET="${process.env.S3_BUCKET}" is spelled correctly
3. Your credentials have access to this bucket`
      });
    }
    
    // Check for endpoint/network errors
    if (errorMessage.includes("endpoint") || errorMessage.includes("ENOTFOUND") || 
        errorMessage.includes("ECONNREFUSED") || errorMessage.includes("getaddrinfo")) {
      return res.status(500).json({ 
        error: "Cannot connect to MinIO server",
        details: `Unable to reach your MinIO server at "${process.env.S3_ENDPOINT}". Please verify:
1. S3_ENDPOINT="${process.env.S3_ENDPOINT}" is correct
2. Your MinIO server is running
3. The endpoint URL includes the protocol (http:// or https://)
4. There are no firewall/network issues blocking the connection`
      });
    }
    
    return res.status(500).json({ 
      error: "Upload failed",
      details: errorMessage || "Unknown error occurred",
      errorCode: err.code,
      errorName: err.name
    });
  }
};
