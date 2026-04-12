<?php
/**
 * Team List API
 * Returns all member-submitted teams from Featured/*/ folders
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, must-revalidate');

$teams = [];
$featuredDir = __DIR__ . '/../Featured/';

// Check if directory exists
if (!is_dir($featuredDir)) {
    echo json_encode([]);
    exit;
}

// Scan author directories
$entries = scandir($featuredDir);
foreach ($entries as $entry) {
    if ($entry === '.' || $entry === '..' || $entry === 'Archives') {
        continue;
    }
    
    $authorDir = $featuredDir . $entry . '/';
    if (!is_dir($authorDir)) {
        continue;
    }
    
    // Find all JSON files in author directory
    $files = glob($authorDir . '*.json');
    foreach ($files as $file) {
        // Skip manifest.json
        if (basename($file) === 'manifest.json') {
            continue;
        }
        
        $content = file_get_contents($file);
        $team = json_decode($content, true);
        
        if (!$team || !is_array($team)) {
            continue;
        }
        
        // Must have required fields
        if (empty($team['name']) || empty($team['author'])) {
            continue;
        }
        
        // Add file path for delete functionality
        $relativePath = 'Featured/' . $entry . '/' . basename($file);
        $team['file'] = $relativePath;
        
        // Add compatibility fields
        if (!isset($team['team']) && isset($team['slots'])) {
            $team['team'] = $team['slots'];
        }
        
        $teams[] = $team;
    }
}

// Sort by submission date (newest first)
usort($teams, function($a, $b) {
    $aTime = isset($a['_submittedAt']) ? strtotime($a['_submittedAt']) : 0;
    $bTime = isset($b['_submittedAt']) ? strtotime($b['_submittedAt']) : 0;
    return $bTime - $aTime;
});

echo json_encode($teams);
?>
