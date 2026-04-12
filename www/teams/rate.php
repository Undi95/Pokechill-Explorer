<?php
require_once 'config.php';

global $RATINGS_PATH;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || empty($data['name']) || empty($data['author']) || empty($data['action'])) {
    echo json_encode(['success' => false, 'error' => 'Missing fields']);
    exit;
}

$name = $data['name'];
$author = $data['author'];
$action = $data['action']; // 'like' or 'unlike'
$teamKey = $data['teamKey'] ?? md5($author . '|' . $name);

// Load ratings
$ratings = [];
if (file_exists($RATINGS_PATH)) {
    $ratings = json_decode(file_get_contents($RATINGS_PATH), true) ?: [];
}

if (!isset($ratings[$teamKey])) {
    $ratings[$teamKey] = [
        'name' => $name,
        'author' => $author,
        'likes' => 0
    ];
}

// Handle like/unlike
if ($action === 'like') {
    $ratings[$teamKey]['likes']++;
} elseif ($action === 'unlike') {
    $ratings[$teamKey]['likes'] = max(0, $ratings[$teamKey]['likes'] - 1);
}

// Save ratings
file_put_contents($RATINGS_PATH, json_encode($ratings, JSON_PRETTY_PRINT));

echo json_encode([
    'success' => true,
    'likes' => $ratings[$teamKey]['likes']
]);
?>
