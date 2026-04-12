<?php
/**
 * Simple Authentication API
 * Login and Register using reserved.json
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

$action = $input['action'] ?? '';
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (!$username || !$password) {
    echo json_encode(['success' => false, 'error' => 'Username and password required']);
    exit;
}

$reservedFile = __DIR__ . '/reserved.json';

if (!file_exists($reservedFile)) {
    echo json_encode(['success' => false, 'error' => 'Reserved file not found']);
    exit;
}

$reserved = json_decode(file_get_contents($reservedFile), true);
if (!isset($reserved['nicknames'])) {
    $reserved['nicknames'] = [];
}

switch ($action) {
    case 'login':
        handleLogin($username, $password, $reserved['nicknames']);
        break;
    
    case 'register':
        handleRegister($username, $password, $reserved, $reservedFile);
        break;
    
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit;
}

function handleLogin($username, $password, $nicknames) {
    // Cherche l'utilisateur (case-insensitive)
    $userKey = null;
    $userData = null;
    
    foreach ($nicknames as $key => $data) {
        if (strcasecmp($key, $username) === 0) {
            $userKey = $key;
            $userData = $data;
            break;
        }
    }
    
    if (!$userKey) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    // Vérifie le mot de passe
    $storedHash = $userData['password'] ?? '';
    
    if (!$storedHash) {
        echo json_encode(['success' => false, 'error' => 'No password set']);
        exit;
    }
    
    if (!password_verify($password, $storedHash)) {
        echo json_encode(['success' => false, 'error' => 'Invalid password']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'username' => $userKey
    ]);
}

function handleRegister($username, $password, &$reserved, $reservedFile) {
    // Validation
    if (strlen($username) < 2 || strlen($username) > 20) {
        echo json_encode(['success' => false, 'error' => 'Username must be 2-20 characters']);
        exit;
    }
    
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
        echo json_encode(['success' => false, 'error' => 'Invalid username format']);
        exit;
    }
    
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'error' => 'Password too short']);
        exit;
    }
    
    // Vérifie si le pseudo existe déjà (case-insensitive)
    foreach ($reserved['nicknames'] as $key => $data) {
        if (strcasecmp($key, $username) === 0) {
            echo json_encode(['success' => false, 'error' => 'Username already taken']);
            exit;
        }
    }
    
    // Crée l'utilisateur au format existant (compatible avec submit.php)
    $reserved['nicknames'][$username] = [
        'author' => $username,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'reservedAt' => date('c')
    ];
    
    if (file_put_contents($reservedFile, json_encode($reserved, JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true, 'username' => $username]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save']);
    }
}
