<?php
// Config - Paths
$FEATURED_DIR = __DIR__ . '/../Featured/';
$MANIFEST_PATH = $FEATURED_DIR . 'manifest.json';
$RATINGS_PATH = __DIR__ . '/ratings.json';

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Disable error display
ini_set('display_errors', 0);
error_reporting(E_ALL);
?>
