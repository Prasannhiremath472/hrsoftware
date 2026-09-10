const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_ROOT = path.resolve(__dirname, '..', '..', process.env.UPLOAD_DIR || 'storage');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function extFromMime(mimeType) {
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
  };
  return map[mimeType] || '';
}

/**
 * Saves a buffer under storage/<category>/<candidateId>/<uuid><ext>.
 * Returns { storedFilename, storagePath (relative to STORAGE_ROOT), absolutePath }.
 */
async function saveBuffer({ category, candidateId, buffer, mimeType, originalExt }) {
  const dir = path.join(STORAGE_ROOT, category, String(candidateId));
  ensureDirSync(dir);

  const ext = originalExt || extFromMime(mimeType) || '';
  const storedFilename = `${uuidv4()}${ext}`;
  const absolutePath = path.join(dir, storedFilename);

  await fsp.writeFile(absolutePath, buffer);

  const storagePath = path.relative(STORAGE_ROOT, absolutePath).split(path.sep).join('/');
  return { storedFilename, storagePath, absolutePath };
}

function resolveAbsolutePath(storagePath) {
  const resolved = path.resolve(STORAGE_ROOT, storagePath);
  // Prevent path traversal outside the storage root
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error('Invalid storage path');
  }
  return resolved;
}

async function deleteFile(storagePath) {
  try {
    const abs = resolveAbsolutePath(storagePath);
    await fsp.unlink(abs);
  } catch (_) {
    // ignore missing file
  }
}

/**
 * Removes storage/<category>/<candidateId>/ entirely — used when a candidate
 * is permanently deleted, since saveBuffer() scopes every uploaded file
 * (documents, photos, ...) under a per-candidate directory per category.
 */
async function deleteCandidateFiles(candidateId) {
  const categories = ['documents', 'photos', 'signatures'];
  await Promise.all(
    categories.map(async (category) => {
      const dir = path.join(STORAGE_ROOT, category, String(candidateId));
      try {
        await fsp.rm(dir, { recursive: true, force: true });
      } catch (_) {
        // ignore missing directory
      }
    })
  );
}

module.exports = {
  STORAGE_ROOT,
  saveBuffer,
  resolveAbsolutePath,
  deleteFile,
  deleteCandidateFiles,
  ensureDirSync,
  extFromMime,
};
