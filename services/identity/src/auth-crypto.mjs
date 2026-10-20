import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptSecret(value, key) {
  if (value === null || value === undefined) {
    return null;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value, key) {
  if (value === null || value === undefined) {
    return null;
  }
  const [version, ivValue, tagValue, ciphertextValue, ...extra] =
    value.split(".");
  if (
    version !== "v1" ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra.length
  ) {
    throw new Error("Encrypted Identity value has an unsupported format.");
  }

  const iv = Buffer.from(ivValue, "base64url");
  const authTag = Buffer.from(tagValue, "base64url");
  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Encrypted Identity value has an unsupported format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
