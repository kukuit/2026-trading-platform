import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const AVATAR_ROUTE_PREFIX = "/api/storage/avatars";
const AVATAR_STORAGE_DIR = path.join(process.cwd(), "storage", "avatars");
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const allowedAvatarTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

type AvatarMimeType = keyof typeof allowedAvatarTypes;

export class AvatarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarValidationError";
  }
}

export function avatarContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  return null;
}

export function isSafeAvatarFilename(filename: string) {
  return /^[0-9a-f-]{36}\.(jpg|png)$/i.test(filename);
}

export async function readAvatarFile(filename: string) {
  if (!isSafeAvatarFilename(filename)) return null;
  return readFile(path.join(AVATAR_STORAGE_DIR, filename));
}

export async function saveAvatarFile(value: FormDataEntryValue | null) {
  if (!isFileLike(value) || value.size === 0) return null;

  const mimeType = value.type.toLowerCase();
  if (!isAllowedAvatarType(mimeType)) {
    throw new AvatarValidationError("Avatar must be a PNG or JPG image.");
  }

  if (value.size > MAX_AVATAR_BYTES) {
    throw new AvatarValidationError("Avatar must be 2MB or smaller.");
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  assertMagicBytes(buffer, mimeType);

  const dimensions = imageDimensions(buffer, mimeType);
  if (!dimensions || dimensions.width !== dimensions.height) {
    throw new AvatarValidationError("Avatar image must use a 1:1 aspect ratio.");
  }

  await mkdir(AVATAR_STORAGE_DIR, { recursive: true });

  const filename = `${randomUUID()}.${allowedAvatarTypes[mimeType]}`;
  await writeFile(path.join(AVATAR_STORAGE_DIR, filename), buffer, { flag: "wx" });

  return `${AVATAR_ROUTE_PREFIX}/${filename}`;
}

export async function deleteStoredAvatar(avatar: string | null | undefined) {
  if (!avatar?.startsWith(`${AVATAR_ROUTE_PREFIX}/`)) return;

  const filename = path.basename(avatar);
  if (!isSafeAvatarFilename(filename)) return;

  try {
    await unlink(path.join(AVATAR_STORAGE_DIR, filename));
  } catch {}
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function isAllowedAvatarType(value: string): value is AvatarMimeType {
  return value in allowedAvatarTypes;
}

function assertMagicBytes(buffer: Buffer, mimeType: AvatarMimeType) {
  const hasJpegSignature = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  const hasPngSignature =
    buffer.length > 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (mimeType === "image/jpeg" && hasJpegSignature) return;
  if (mimeType === "image/png" && hasPngSignature) return;

  throw new AvatarValidationError("Avatar file content does not match its image type.");
}

function imageDimensions(buffer: Buffer, mimeType: AvatarMimeType) {
  if (mimeType === "image/png") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  let offset = 2;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) return null;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;

    if (isJpegStartOfFrame(marker)) {
      if (offset + 7 > buffer.length) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function isJpegStartOfFrame(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}
