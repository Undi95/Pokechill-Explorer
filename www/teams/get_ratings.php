<?php
require_once 'config.php';

global $RATINGS_PATH;

// Load ratings
$ratings = [];
if (file_exists($RATINGS_PATH)) {
    $ratings = json_decode(file_get_contents($RATINGS_PATH), true) ?: [];
}

// Return all ratings simplified
$simplified = [];
foreach ($ratings as $key => $team) {
    $simplified[$key] = [
        'likes' => $team['likes'] ?? 0
    ];
}

echo json_encode(['success' => true, 'ratings' => $simplified]);
?>
