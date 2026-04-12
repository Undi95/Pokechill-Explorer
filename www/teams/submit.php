<?php
require_once 'config.php';

global $FEATURED_DIR, $MANIFEST_PATH;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate ALL fields required
if (!$data || empty($data['name']) || empty($data['author']) || empty($data['description']) || empty($data['slots'])) {
    echo json_encode(['success' => false, 'error' => 'All fields are required']);
    exit;
}

$name = trim($data['name']);
$author = trim($data['author']);
$description = trim($data['description']);
$reserveNickname = $data['reserveNickname'] ?? false;
$password = $data['password'] ?? '';

if (strlen($name) === 0 || strlen($author) === 0 || strlen($description) === 0) {
    echo json_encode(['success' => false, 'error' => 'Fields cannot be empty']);
    exit;
}

// Load reserved nicknames
$reservedPath = __DIR__ . '/reserved.json';
$reserved = ['nicknames' => []];

if (file_exists($reservedPath)) {
    $content = file_get_contents($reservedPath);
    $decoded = json_decode($content, true);
    if (is_array($decoded) && isset($decoded['nicknames']) && is_array($decoded['nicknames'])) {
        $reserved = $decoded;
    }
}

// CRITICAL: Check if nickname is reserved (case-insensitive)
$lowerAuthor = strtolower($author);
$isReserved = false;
$reservedBy = null;
$storedHash = null;

error_log("[SECURITY] Checking author: '$author' (lowercase: '$lowerAuthor')");

foreach ($reserved['nicknames'] as $key => $info) {
    $lowerKey = strtolower($key);
    error_log("[SECURITY] Comparing with reserved key: '$key' (lowercase: '$lowerKey')");
    
    if ($lowerKey === $lowerAuthor) {
        $isReserved = true;
        $reservedBy = $info['author'];
        $storedHash = $info['password'];
        error_log("[SECURITY] MATCH FOUND! Reserved by: '$reservedBy'");
        break;
    }
}

// CRITICAL: BLOCK if reserved and no valid password
if ($isReserved) {
    error_log("[SECURITY] Nickname IS RESERVED. Password provided: " . (empty($password) ? 'NO' : 'YES'));
    
    // Must provide password
    if (empty($password)) {
        error_log("[SECURITY] BLOCKED: No password provided");
        echo json_encode([
            'success' => false, 
            'error' => "🔒 Nickname \"$reservedBy\" is protected. Enter password.", 
            'requirePassword' => true
        ]);
        exit;
    }
    
    // Verify password
    $passwordValid = password_verify($password, $storedHash);
    error_log("[SECURITY] Password valid: " . ($passwordValid ? 'YES' : 'NO'));
    
    if (!$passwordValid) {
        error_log("[SECURITY] BLOCKED: Wrong password");
        echo json_encode([
            'success' => false, 
            'error' => "🔒 Wrong password for \"$reservedBy\"."
        ]);
        exit;
    }
    
    error_log("[SECURITY] Password OK, allowing upload");
} else {
    error_log("[SECURITY] Nickname is NOT reserved");
    
    // Want to reserve? Need password
    if ($reserveNickname) {
        if (empty($password) || strlen($password) < 6) {
            echo json_encode(['success' => false, 'error' => 'To protect this nickname, enter a password with at least 6 characters']);
            exit;
        }
        
        // Reserve it
        $safeKey = preg_replace('/[^a-zA-Z0-9_-]/', '_', $author);
        $reserved['nicknames'][$safeKey] = [
            'author' => $author,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'reservedAt' => date('c')
        ];
        file_put_contents($reservedPath, json_encode($reserved, JSON_PRETTY_PRINT));
        error_log("[SECURITY] Reserved new nickname: '$safeKey'");
    }
}

// Continue with upload...
$safeAuthor = preg_replace('/[^a-zA-Z0-9_-]/', '_', $author);
$authorDir = $FEATURED_DIR . $safeAuthor . '/';

if (!is_dir($authorDir)) {
    if (!mkdir($authorDir, 0755, true)) {
        echo json_encode(['success' => false, 'error' => 'Cannot create author directory']);
        exit;
    }
}

$manifest = ['teams' => []];
if (file_exists($MANIFEST_PATH)) {
    $manifest = json_decode(file_get_contents($MANIFEST_PATH), true) ?: ['teams' => []];
}

foreach ($manifest['teams'] as $team) {
    if ($team['name'] === $name && $team['author'] === $author) {
        echo json_encode(['success' => false, 'error' => 'You already have a team with this name']);
        exit;
    }
}

$safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $name);
$timestamp = date('Ymd_His');
$filename = "member_{$safeAuthor}_{$safeName}_{$timestamp}.json";
$filepath = $authorDir . $filename;
$relativePath = "Featured/{$safeAuthor}/{$filename}";

$teamData = [
    'name' => $name,
    'author' => $author,
    'description' => $description,
    'slots' => array_values(array_filter($data['slots'], function($slot) {
        return !empty($slot['pokemon']);
    })),
    '_isMemberSubmitted' => true,
    '_submittedAt' => date('c')
];

if (file_put_contents($filepath, json_encode($teamData, JSON_PRETTY_PRINT)) === false) {
    echo json_encode(['success' => false, 'error' => 'Failed to save team file']);
    exit;
}

$manifest['teams'][] = [
    'name' => $name,
    'author' => $author,
    'file' => $relativePath,
    '_isMemberSubmitted' => true,
    '_submittedAt' => date('c')
];

if (!isset($manifest['authors'])) {
    $manifest['authors'] = [];
}
if (!in_array($author, $manifest['authors'])) {
    $manifest['authors'][] = $author;
}

file_put_contents($MANIFEST_PATH, json_encode($manifest, JSON_PRETTY_PRINT));

echo json_encode([
    'success' => true,
    'message' => 'Team submitted successfully!',
    'filename' => $filename,
    'reserved' => $isReserved || $reserveNickname
]);
?>
