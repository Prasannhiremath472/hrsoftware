const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

function fileFilter(req, file, cb) {
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.test(file.originalname);
  if (!mimeOk || !extOk) {
    return cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
  cb(null, true);
}

function buildUploader() {
  const maxSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter,
  });
}

const upload = buildUploader();

module.exports = { upload, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
