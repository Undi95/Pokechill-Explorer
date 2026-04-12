<?php
require_once 'config.php';

global $FEATURED_DIR, $MANIFEST_PATH;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || empty($data['name']) || empty($data['author'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

$name = $data['name'];
$author = $data['author'];
$password = $data['password'] ?? '';
$requestingAuthor = $data['requestingAuthor'] ?? '';

// ADMIN: Undi can delete any team
$isAdmin = ($requestingAuthor === 'Undi' || $requestingAuthor === 'undi');

if (!$isAdmin) {
    // Load reserved nicknames
    $reservedPath = __DIR__ . '/reserved.json';
    $reserved = ['nicknames' => []];
    if (file_exists($reservedPath)) {
        $reserved = json_decode(file_get_contents($reservedPath), true) ?: ['nicknames' => []];
    }

    $safeAuthor = preg_replace('/[^a-zA-Z0-9_-]/', '_', $author);
    $lowerAuthor = strtolower($safeAuthor);
    
    // Case-insensitive check
    $isReserved = false;
    $storedHash = null;
    foreach ($reserved['nicknames'] as $key => $info) {
        if (strtolower($key) === $lowerAuthor) {
            $isReserved = true;
            $storedHash = $info['password'];
            break;
        }
    }

    // If nickname is reserved, require password
    if ($isReserved) {
        if (empty($password)) {
            echo json_encode(['success' => false, 'error' => 'This nickname is protected. Enter your password to delete.', 'requirePassword' => true]);
            exit;
        }
        
        if (!password_verify($password, $storedHash)) {
            echo json_encode(['success' => false, 'error' => 'Wrong password']);
            exit;
        }
    }
}

// Load manifest
if (!file_exists($MANIFEST_PATH)) {
    echo json_encode(['success' => false, 'error' => 'Manifest not found']);
    exit;
}

$manifest = json_decode(file_get_contents($MANIFEST_PATH), true);
if (!$manifest || !isset($manifest['teams'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid manifest']);
    exit;
}

// Find and delete file
$deleted = false;
$fileToDelete = null;
$newTeams = [];

foreach ($manifest['teams'] as $team) {
    if ($team['name'] === $name && $team['author'] === $author) {
        $fileToDelete = $FEATURED_DIR . str_replace('Featured/', '', $team['file']);
        $deleted = true;
    } else {
        $newTeams[] = $team;
    }
}

if (!$deleted) {
    echo json_encode(['success' => false, 'error' => 'Team not found']);
    exit;
}

// Delete file if exists
if ($fileToDelete && file_exists($fileToDelete)) {
    unlink($fileToDelete);
    
    // Remove empty author directory
    $authorDir = dirname($fileToDelete);
    if (is_dir($authorDir) && count(glob($authorDir . '/*.json')) === 0) {
        rmdir($authorDir);
    }
}

// Update manifest
$manifest['teams'] = $newTeams;

// Update authors list
$authorsInManifest = [];
foreach ($newTeams as $team) {
    $authorsInManifest[$team['author']] = true;
}
$manifest['authors'] = array_keys($authorsInManifest);

file_put_contents($MANIFEST_PATH, json_encode($manifest, JSON_PRETTY_PRINT));

echo json_encode(['success' => true, 'message' => 'Team deleted']);
?>
