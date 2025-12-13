<?php
// ---------------------------------
// upload-temp.php (plain PHP)
// ---------------------------------

// ---- Config (tweak if needed) ----
$MAX_BYTES       = 8 * 1024 * 1024;               // 8 MB
$ALLOWED_MIME    = ['image/jpeg','image/png','image/gif','image/webp'];
$UPLOAD_SUBDIR   = '/uploads/tmp';                // web-visible path from docroot
$PUBLIC_BASE_URL = null;                          // null = auto from request

// Optional: CORS if uploading from another origin
// header('Access-Control-Allow-Origin: https://your-domain.com');
// header('Vary: Origin');
// header('Access-Control-Allow-Credentials: true');
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

function respond($arr, $status=200) {
  http_response_code($status);
  header('Content-Type: application/json');
  echo json_encode($arr, JSON_UNESCAPED_SLASHES);
  exit;
}
function join_paths(...$p) { return preg_replace('~/+~','/', join('/', $p)); }

$docRoot   = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');
$uploadDir = join_paths($docRoot, $UPLOAD_SUBDIR);

if (!is_dir($uploadDir)) {
  if (!mkdir($uploadDir, 0755, true)) {
    respond(['ok'=>false,'error'=>'Failed to create upload directory'], 500);
  }
}

// protect the folder from script execution (Apache)
$htaccess = join_paths($uploadDir, '.htaccess');
if (!file_exists($htaccess)) {
  @file_put_contents($htaccess,
    "Options -Indexes\n".
    "<FilesMatch \"\\.(php|phar|phtml|pl|cgi|sh)$\">\nDeny from all\n</FilesMatch>\n"
  );
}

// Accept either 'file' or 'image'
$field = null;
if (!empty($_FILES['file']))  $field = 'file';
if (!empty($_FILES['image'])) $field = $field ?: 'image';
if (!$field) respond(['ok'=>false, 'error'=>'No file uploaded'], 400);

$u = $_FILES[$field];
if (($u['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
  respond(['ok'=>false,'error'=>'Upload error code: '.$u['error']], 400);
}
if (($u['size'] ?? 0) <= 0 || $u['size'] > $MAX_BYTES) {
  respond(['ok'=>false,'error'=>'File too large or empty'], 400);
}

// MIME + integrity checks
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($u['tmp_name']);
if (!in_array($mime, $ALLOWED_MIME, true)) {
  respond(['ok'=>false,'error'=>'Unsupported MIME type'], 400);
}
$imgInfo = @getimagesize($u['tmp_name']);
if ($imgInfo === false) respond(['ok'=>false,'error'=>'Invalid image data'], 400);
$itype = @exif_imagetype($u['tmp_name']);
if ($itype === false) respond(['ok'=>false,'error'=>'Invalid image header'], 400);

// Normalize extension from magic number
$map = [
  IMAGETYPE_JPEG => 'jpg',
  IMAGETYPE_PNG  => 'png',
  IMAGETYPE_GIF  => 'gif',
  IMAGETYPE_WEBP => 'webp',
];
$ext = $map[$itype] ?? 'jpg';

// Generate unique filename
$basename = bin2hex(random_bytes(8)); // 16 hex chars
$filename = $basename . '.' . $ext;
$target   = join_paths($uploadDir, $filename);

if (!move_uploaded_file($u['tmp_name'], $target)) {
  respond(['ok'=>false,'error'=>'Failed to move uploaded file'], 500);
}
@chmod($target, 0644);

// Build public URL
if ($PUBLIC_BASE_URL) {
  $base = rtrim($PUBLIC_BASE_URL, '/');
} else {
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host   = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
  $base   = $scheme . '://' . $host;
}
$url = $base . $UPLOAD_SUBDIR . '/' . $filename;

// Return JSON
respond([
  'ok'       => true,
  'url'      => $url,
  'filename' => $filename,
  'mime'     => $mime,
  'width'    => $imgInfo[0] ?? null,
  'height'   => $imgInfo[1] ?? null,
  'bytes'    => $u['size'] ?? null,
], 200);
