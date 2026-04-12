<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$reservedPath = __DIR__ . '/reserved.json';
$author = $_GET['author'] ?? '';

if (empty($author)) {
    echo json_encode(['reserved' => false]);
    exit;
}

$safeAuthor = preg_replace('/[^a-zA-Z0-9_-]/', '_', $author);
$lowerAuthor = strtolower($safeAuthor);

$reserved = ['nicknames' => []];
if (file_exists($reservedPath)) {
    $reserved = json_decode(file_get_contents($reservedPath), true) ?: ['nicknames' => []];
}

// Case-insensitive check
$isReserved = false;
$reservedBy = null;

foreach ($reserved['nicknames'] as $key => $info) {
    if (strtolower($key) === $lowerAuthor) {
        $isReserved = true;
        $reservedBy = $info['author'];
        break;
    }
}

echo json_encode([
    'reserved' => $isReserved,
    'author' => $reservedBy
]);
?>
