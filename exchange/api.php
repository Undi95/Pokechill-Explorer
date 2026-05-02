<?php
// Increase memory limit and execution time for large save files
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '30');
ini_set('display_errors', '0');
error_reporting(0);
@ob_end_clean(); // Clear any previous output

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

$roomsDir = __DIR__ . '/rooms/';
$savesDir = __DIR__ . '/saves/';
$giftsDir = __DIR__ . '/gifts/';

// Create directories if they don't exist
if (!is_dir($roomsDir)) mkdir($roomsDir, 0777, true);
if (!is_dir($savesDir)) mkdir($savesDir, 0777, true);
if (!is_dir($giftsDir)) mkdir($giftsDir, 0777, true);

function generateCode() {
    return strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
}

function getRoomFile($code) {
    global $roomsDir;
    return $roomsDir . strtoupper($code) . '.json';
}

function getSaveFile($username) {
    global $savesDir;
    // Sanitize username for filename
    $safeUsername = preg_replace('/[^a-zA-Z0-9_-]/', '_', $username);
    return $savesDir . $safeUsername . '.json';
}

function getBackupFile($username) {
    global $savesDir;
    // Sanitize username for filename
    $safeUsername = preg_replace('/[^a-zA-Z0-9_-]/', '_', $username);
    return $savesDir . $safeUsername . '_backup.json';
}

function getGiftsFile($username) {
    global $giftsDir;
    $safeUsername = preg_replace('/[^a-zA-Z0-9_-]/', '_', $username);
    return $giftsDir . $safeUsername . '_gifts.json';
}

function getSentGiftsFile($username) {
    global $giftsDir;
    $safeUsername = preg_replace('/[^a-zA-Z0-9_-]/', '_', $username);
    return $giftsDir . $safeUsername . '_sent.json';
}

function cleanupOldRooms() {
    global $roomsDir;
    $files = glob($roomsDir . '*.json');
    foreach ($files as $file) {
        if (filemtime($file) < time() - 600) unlink($file);
    }
}

function cleanupOldSaves() {
    // No retention limit - saves are kept indefinitely
    // global $savesDir;
    // $files = glob($savesDir . '*.json');
    // foreach ($files as $file) {
    //     if (filemtime($file) < time() - (30 * 24 * 60 * 60)) unlink($file);
    // }
}

// Safety net: PHP's json_decode/encode round-trips empty objects {} as []. The
// game expects empty preview team slots to be objects — convert empty arrays
// (and nulls) inside saved.previewTeams.*.slot1..slot6 to stdClass so they
// re-encode as {}. Mutates and returns the input.
function normalizeSaveTeamsPHP(&$saveData) {
    if (!is_array($saveData)) return $saveData;
    if (!isset($saveData['saved']) || !is_array($saveData['saved'])) return $saveData;
    if (!isset($saveData['saved']['previewTeams']) || !is_array($saveData['saved']['previewTeams'])) return $saveData;
    foreach ($saveData['saved']['previewTeams'] as $teamKey => &$team) {
        if (!is_array($team)) continue;
        for ($i = 1; $i <= 6; $i++) {
            $slotKey = 'slot' . $i;
            $slot = $team[$slotKey] ?? null;
            // Treat null, missing, or empty array as "empty slot" → restore {}
            if ($slot === null || (is_array($slot) && count($slot) === 0)) {
                $team[$slotKey] = new stdClass();
            }
        }
    }
    unset($team);
    return $saveData;
}

// Calculate challenges completed from save data (simplified version of JS logic)
function calculateChallengesFromSave($saveData) {
    $completedCount = 0;
    
    // Count unique pokemon
    $uniquePokemon = 0;
    $shinies = 0;
    $starSigns = 0;
    $level100 = 0;
    
    foreach ($saveData as $key => $value) {
        if (is_array($value) && isset($value['caught']) && isset($value['movepool']) && $value['caught'] > 0) {
            $uniquePokemon++;
            
            if (isset($value['shiny']) && $value['shiny'] === true) {
                $shinies++;
            }
            
            if (isset($value['starsign']) && $value['starsign'] !== null) {
                $starSigns++;
            }
            
            if (isset($value['level']) && $value['level'] >= 100) {
                $level100++;
            }
        }
    }
    
    // Check main challenges (simplified tier checks)
    // unique_pokemon: tiers [1, 10, 100, 250, 500, 1000]
    if ($uniquePokemon >= 1) $completedCount++;
    if ($uniquePokemon >= 10) $completedCount++;
    if ($uniquePokemon >= 100) $completedCount++;
    if ($uniquePokemon >= 250) $completedCount++;
    if ($uniquePokemon >= 500) $completedCount++;
    if ($uniquePokemon >= 1000) $completedCount++;
    
    // first_shiny: tiers [1, 3, 5, 10, 20, 50]
    if ($shinies >= 1) $completedCount++;
    if ($shinies >= 3) $completedCount++;
    if ($shinies >= 5) $completedCount++;
    if ($shinies >= 10) $completedCount++;
    if ($shinies >= 20) $completedCount++;
    if ($shinies >= 50) $completedCount++;
    
    // more_shiny: tiers [100, 200, 350, 600, 800, 1000]
    if ($shinies >= 100) $completedCount++;
    if ($shinies >= 200) $completedCount++;
    if ($shinies >= 350) $completedCount++;
    if ($shinies >= 600) $completedCount++;
    if ($shinies >= 800) $completedCount++;
    if ($shinies >= 1000) $completedCount++;
    
    // star_shines: tiers [10, 25, 50, 100, 250, 500]
    if ($starSigns >= 10) $completedCount++;
    if ($starSigns >= 25) $completedCount++;
    if ($starSigns >= 50) $completedCount++;
    if ($starSigns >= 100) $completedCount++;
    if ($starSigns >= 250) $completedCount++;
    if ($starSigns >= 500) $completedCount++;
    
    // level_100: tiers [10, 25, 50, 100, 250, 500]
    if ($level100 >= 10) $completedCount++;
    if ($level100 >= 25) $completedCount++;
    if ($level100 >= 50) $completedCount++;
    if ($level100 >= 100) $completedCount++;
    if ($level100 >= 250) $completedCount++;
    if ($level100 >= 500) $completedCount++;
    
    return $completedCount;
}

// Calculate stats from save data
function calculateSaveStats($saveData, $challengesCount = null) {
    $stats = [
        'achievements' => 0,
        'caught' => 0,
        'shinies' => 0,
        'starShines' => 0,
        'uniquePokemon' => 0,
        'teams' => 0
    ];
    
    // Count achievements (from provided count or calculate from save)
    if ($challengesCount !== null) {
        $stats['achievements'] = $challengesCount;
    } else {
        // Calculate from save data
        $stats['achievements'] = calculateChallengesFromSave($saveData);
    }
    
    // Count teams (only non-empty ones)
    if (isset($saveData['saved']) && isset($saveData['saved']['previewTeams'])) {
        $nonEmptyTeams = 0;
        foreach ($saveData['saved']['previewTeams'] as $team) {
            // Check if team has at least one slot with a pokemon
            $hasPokemon = false;
            foreach ($team as $key => $slot) {
                if (is_array($slot) && isset($slot['pkmn']) && $slot['pkmn']) {
                    $hasPokemon = true;
                    break;
                }
            }
            if ($hasPokemon) {
                $nonEmptyTeams++;
            }
        }
        $stats['teams'] = $nonEmptyTeams;
    }
    
    // Count PokÃ©mon from main data (keys that have 'caught' and 'movepool')
    $uniqueList = [];
    foreach ($saveData as $key => $value) {
        if (is_array($value) && isset($value['caught']) && isset($value['movepool'])) {
            $stats['caught'] += intval($value['caught']);
            $uniqueList[] = $key;
            
            // Count shinies (mÃªme dÃ©sactivÃ©s), comme les challenges - UNIQUES
            if (isset($value['shiny']) && $value['shiny'] === true) {
                $stats['shinies']++; // Compte TOUS les shinies (mÃªme dÃ©sactivÃ©s)
            }
            
            // Count star shines (has starsign) - UNIQUES
            if (isset($value['starsign']) && $value['starsign'] !== null) {
                $stats['starShines']++; // Compte les star shines uniques
            }
        }
    }
    
    $stats['uniquePokemon'] = count($uniqueList);
    
    return $stats;
}

$action = $_GET['action'] ?? '';
cleanupOldRooms();
cleanupOldSaves();

switch ($action) {
    case 'create':
        $code = generateCode();
        while (file_exists(getRoomFile($code))) $code = generateCode();
        $room = [
            'code' => $code,
            'created' => time(),
            'playerA' => ['present' => true, 'pokemon' => null, 'confirmed' => false],
            'playerB' => ['present' => false, 'pokemon' => null, 'confirmed' => false]
        ];
        file_put_contents(getRoomFile($code), json_encode($room), LOCK_EX);
        echo json_encode(['code' => $code, 'message' => 'Room created']);
        break;

    case 'join':
        $code = strtoupper($_GET['code'] ?? '');
        $file = getRoomFile($code);
        if (!file_exists($file)) {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
            exit;
        }
        $room = json_decode(file_get_contents($file), true);
        if ($room['playerB']['present']) {
            http_response_code(403);
            echo json_encode(['error' => 'Room is full']);
            exit;
        }
        $room['playerB']['present'] = true;
        file_put_contents($file, json_encode($room), LOCK_EX);
        clearstatcache(true, $file);
        echo json_encode(['message' => 'Joined room', 'code' => $code]);
        break;

    case 'status':
        $code = strtoupper($_GET['code'] ?? '');
        $player = $_GET['player'] ?? '';
        $file = getRoomFile($code);
        if (!file_exists($file)) {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
            exit;
        }
        $room = json_decode(file_get_contents($file), true);
        
        $otherPokemon = null;
        if ($player === 'A' && $room['playerB']['pokemon'] !== null) {
            $otherPokemon = $room['playerB']['pokemon'];
        } elseif ($player === 'B' && $room['playerA']['pokemon'] !== null) {
            $otherPokemon = $room['playerA']['pokemon'];
        }
        
        echo json_encode([
            'code' => $room['code'],
            'bothPresent' => $room['playerA']['present'] && $room['playerB']['present'],
            'playerASelected' => $room['playerA']['pokemon'] !== null,
            'playerBSelected' => $room['playerB']['pokemon'] !== null,
            'bothSelected' => $room['playerA']['pokemon'] !== null && $room['playerB']['pokemon'] !== null,
            'playerAConfirmed' => $room['playerA']['confirmed'],
            'playerBConfirmed' => $room['playerB']['confirmed'],
            'bothConfirmed' => $room['playerA']['confirmed'] && $room['playerB']['confirmed'],
            'exchangeComplete' => $room['playerA']['confirmed'] && $room['playerB']['confirmed'],
            'otherPokemon' => $otherPokemon
        ]);
        break;

    case 'offer':
        $code = strtoupper($_GET['code'] ?? '');
        $player = $_GET['player'] ?? '';
        $data = json_decode(file_get_contents('php://input'), true);
        
        $file = getRoomFile($code);
        if (!file_exists($file)) {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
            exit;
        }
        $room = json_decode(file_get_contents($file), true);
        $key = $player === 'A' ? 'playerA' : 'playerB';
        $room[$key]['pokemon'] = $data['pokemon'];
        file_put_contents($file, json_encode($room), LOCK_EX);
        clearstatcache(true, $file);
        echo json_encode(['message' => 'Pokemon submitted']);
        break;

    case 'confirm':
        $code = strtoupper($_GET['code'] ?? '');
        $player = $_GET['player'] ?? '';
        
        $file = getRoomFile($code);
        if (!file_exists($file)) {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
            exit;
        }
        $room = json_decode(file_get_contents($file), true);
        $key = $player === 'A' ? 'playerA' : 'playerB';
        $room[$key]['confirmed'] = true;
        file_put_contents($file, json_encode($room), LOCK_EX);
        clearstatcache(true, $file);
        
        // Re-lire le fichier pour Ãªtre sÃ»r d'avoir l'Ã©tat Ã  jour
        $room = json_decode(file_get_contents($file), true);
        $otherKey = $player === 'A' ? 'playerB' : 'playerA';
        
        echo json_encode([
            'message' => 'Confirmed',
            'exchangeComplete' => $room['playerA']['confirmed'] && $room['playerB']['confirmed'],
            'otherPokemon' => $room[$otherKey]['pokemon']
        ]);
        break;

    // ============ SAVEZONE ============
    case 'savezone_upload':
        $username = $_GET['username'] ?? '';
        $slot = intval($_GET['slot'] ?? 1);
        
        if (!$username) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            exit;
        }
        
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
            exit;
        }
        
        if (!isset($input['saveData'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing saveData field']);
            exit;
        }
        
        $saveFile = getSaveFile($username);
        $saves = ['slot1' => null, 'slot2' => null];
        
        // Ensure saves directory exists
        global $savesDir;
        if (!is_dir($savesDir)) {
            mkdir($savesDir, 0777, true);
        }
        
        if (file_exists($saveFile)) {
            $saves = json_decode(file_get_contents($saveFile), true);
            if (!$saves) {
                $saves = ['slot1' => null, 'slot2' => null];
            }
        }
        
        // Safety net: restore {} for empty preview team slots before storing/encoding
        normalizeSaveTeamsPHP($input['saveData']);

        // Calculate stats with challenges count from client
        $challengesCount = isset($input['challengesCount']) ? intval($input['challengesCount']) : null;
        $stats = calculateSaveStats($input['saveData'], $challengesCount);

        // Save to slot
        $saveEntry = [
            'date' => time(),
            'data' => $input['saveData'],
            'stats' => $stats
        ];
        
        $backupFile = getBackupFile($username);
        
        if ($slot === 1) {
            // If slot 1 exists, move it to backup file (slot 2)
            if ($saves['slot1'] !== null) {
                file_put_contents($backupFile, json_encode($saves['slot1'], JSON_PRETTY_PRINT), LOCK_EX);
            }
            $saves['slot1'] = $saveEntry;
        } else {
            // Direct save to backup file
            file_put_contents($backupFile, json_encode($saveEntry, JSON_PRETTY_PRINT), LOCK_EX);
        }
        
        // Only keep slot1 in main file
        $written = file_put_contents($saveFile, json_encode(['slot1' => $saves['slot1']], JSON_PRETTY_PRINT), LOCK_EX);
        
        if ($written === false) {
            echo json_encode(['success' => false, 'error' => 'Failed to write file']);
        } else {
            echo json_encode(['success' => true, 'message' => 'Save uploaded', 'bytes' => $written]);
        }
        break;
        
    case 'savezone_get':
        $username = $_GET['username'] ?? '';
        
        if (!$username) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            exit;
        }
        
        $saveFile = getSaveFile($username);
        $backupFile = getBackupFile($username);
        
        // Format dates for display
        $formattedSaves = ['slot1' => null, 'slot2' => null];
        
        // Read slot 1 from main file
        if (file_exists($saveFile)) {
            $saves = json_decode(file_get_contents($saveFile), true);
            if (isset($saves['slot1']) && $saves['slot1'] !== null) {
                $slot1Data = $saves['slot1']['data'] ?? null;
                if ($slot1Data !== null) normalizeSaveTeamsPHP($slot1Data);
                $formattedSaves['slot1'] = [
                    'date' => date('Y-m-d H:i:s', $saves['slot1']['date']),
                    'stats' => $saves['slot1']['stats'] ?? ['achievements' => 0, 'caught' => 0],
                    'data' => $slot1Data
                ];
            }
        }

        // Read slot 2 from backup file
        if (file_exists($backupFile)) {
            $backup = json_decode(file_get_contents($backupFile), true);
            if ($backup !== null) {
                // Handle both old format (with slot1 wrapper) and new format (flat)
                if (isset($backup['slot1']) && is_array($backup['slot1'])) {
                    // Old format - extract from slot1
                    $backupData = $backup['slot1'];
                } else {
                    // New format - flat structure
                    $backupData = $backup;
                }
                $slot2Data = $backupData['data'] ?? null;
                if ($slot2Data !== null) normalizeSaveTeamsPHP($slot2Data);
                $formattedSaves['slot2'] = [
                    'date' => date('Y-m-d H:i:s', $backupData['date'] ?? time()),
                    'stats' => $backupData['stats'] ?? ['achievements' => 0, 'caught' => 0],
                    'data' => $slot2Data
                ];
            }
        }
        
        // Check if any save exists
        if ($formattedSaves['slot1'] === null && $formattedSaves['slot2'] === null) {
            echo json_encode(['success' => true, 'saves' => null]);
            exit;
        }
        
        echo json_encode(['success' => true, 'saves' => $formattedSaves]);
        break;
        
    case 'savezone_download':
        $username = $_GET['username'] ?? '';
        $slot = intval($_GET['slot'] ?? 1);
        
        if (!$username) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            exit;
        }
        
        if ($slot === 1) {
            // Download from main file
            $saveFile = getSaveFile($username);
            
            if (!file_exists($saveFile)) {
                http_response_code(404);
                echo json_encode(['error' => 'No saves found']);
                exit;
            }
            
            $saves = json_decode(file_get_contents($saveFile), true);
            
            if (!isset($saves['slot1']) || $saves['slot1'] === null) {
                http_response_code(404);
                echo json_encode(['error' => 'Save not found in this slot']);
                exit;
            }
            
            $downloadData = $saves['slot1']['data'];
            // Safety net: re-shape empty preview team slots back to {} for the game.
            normalizeSaveTeamsPHP($downloadData);
            echo json_encode(['success' => true, 'saveData' => $downloadData]);
        } else {
            // Download from backup file
            $backupFile = getBackupFile($username);

            if (!file_exists($backupFile)) {
                http_response_code(404);
                echo json_encode(['error' => 'No backup found']);
                exit;
            }

            $backup = json_decode(file_get_contents($backupFile), true);

            if ($backup === null) {
                http_response_code(404);
                echo json_encode(['error' => 'Backup not found']);
                exit;
            }

            // Handle both old format (with slot1 wrapper) and new format (flat)
            if (isset($backup['slot1']) && is_array($backup['slot1'])) {
                $saveData = $backup['slot1']['data'] ?? null;
            } else {
                $saveData = $backup['data'] ?? null;
            }

            if ($saveData === null) {
                http_response_code(404);
                echo json_encode(['error' => 'Save data not found in backup']);
                exit;
            }

            // Safety net: re-shape empty preview team slots back to {} for the game.
            normalizeSaveTeamsPHP($saveData);
            echo json_encode(['success' => true, 'saveData' => $saveData]);
        }
        break;
        
    case 'savezone_stats':
        // Calculate community stats from ACTIVE saves only (exclude backups)
        $totalSaves = 0;
        $totalPlayers = 0;
        $totalAchievements = 0;
        $totalCaught = 0;
        $totalShinies = 0;
        $totalStarShines = 0;
        $totalUniquePokemon = 0;
        $totalTeams = 0;
        
        $allUniquePokemon = [];
        
        $files = glob($savesDir . '*.json');
        
        foreach ($files as $file) {
            $filename = basename($file);
            
            // Skip backup files (ending with _backup.json)
            if (strpos($filename, '_backup.json') !== false) {
                continue;
            }
            
            $saves = json_decode(file_get_contents($file), true);
            
            // Only count slot1 (active saves)
            if (isset($saves['slot1']) && $saves['slot1'] !== null) {
                $totalSaves++;
                $totalPlayers++;
                
                // Recalculer les stats depuis les donnÃ©es brutes pour Ãªtre Ã  jour
                if (isset($saves['slot1']['data'])) {
                    $liveStats = calculateSaveStats($saves['slot1']['data']);
                    $totalAchievements += $liveStats['achievements'] ?? 0;
                    $totalCaught += $liveStats['caught'] ?? 0;
                    $totalUniquePokemon += $liveStats['uniquePokemon'] ?? 0;
                    $totalShinies += $liveStats['shinies'] ?? 0;
                    $totalStarShines += $liveStats['starShines'] ?? 0;
                    $totalTeams += $liveStats['teams'] ?? 0;
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'totalSaves' => $totalSaves,
                'totalPlayers' => $totalPlayers,
                'totalAchievements' => $totalAchievements,
                'totalCaught' => $totalCaught,
                'totalUniquePokemon' => $totalUniquePokemon,
                'totalShinies' => $totalShinies,
                'totalStarShines' => $totalStarShines,
                'totalTeams' => $totalTeams
            ]
        ]);
        break;

    // ============ ITEM GIFT SYSTEM ============
    case 'item_gift_send':
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';
        
        if (!$from || !$to) {
            http_response_code(400);
            echo json_encode(['error' => 'Sender and recipient required']);
            exit;
        }
        
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        if (!$input || !isset($input['items']) || empty($input['items'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Items required']);
            exit;
        }
        
        // Check recipient exists (has a save)
        $recipientFile = getSaveFile($to);
        if (!file_exists($recipientFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'Recipient not found']);
            exit;
        }
        
        // Get sender's save and remove items
        $senderFile = getSaveFile($from);
        $senderModifiedSave = null;
        
        if (file_exists($senderFile)) {
            $senderSaves = json_decode(file_get_contents($senderFile), true);
            
            if (isset($senderSaves['slot1']) && $senderSaves['slot1'] !== null && isset($senderSaves['slot1']['data']) && $senderSaves['slot1']['data'] !== null) {
                $senderSaveData = $senderSaves['slot1']['data'];
                $removedItems = [];
                $failedItems = [];
                
                foreach ($input['items'] as $item) {
                    $itemId = $item['id'];
                    $quantity = intval($item['quantity']);
                    
                    if (isset($senderSaveData[$itemId]) && is_array($senderSaveData[$itemId]) && isset($senderSaveData[$itemId]['got'])) {
                        $currentQty = intval($senderSaveData[$itemId]['got']);
                        if ($currentQty >= $quantity) {
                            $senderSaveData[$itemId]['got'] = $currentQty - $quantity;
                            $removedItems[] = $item;
                        } else {
                            $failedItems[] = ['item' => $item, 'reason' => 'Insufficient quantity'];
                        }
                    } else {
                        $failedItems[] = ['item' => $item, 'reason' => 'Item not found'];
                    }
                }
                
                // Update timestamp
                $currentTime = time();
                
                // Update slot1 in main file
                $senderSaves['slot1']['data'] = $senderSaveData;
                $senderSaves['slot1']['date'] = $currentTime;
                
                // Only keep slot1 in main file
                file_put_contents($senderFile, json_encode(['slot1' => $senderSaves['slot1']], JSON_PRETTY_PRINT), LOCK_EX);
                
                // Also update backup file if it exists
                $senderBackupFile = getBackupFile($from);
                if (file_exists($senderBackupFile)) {
                    $backup = json_decode(file_get_contents($senderBackupFile), true);
                    if ($backup !== null) {
                        // Handle both old format (with slot1 wrapper) and new format (flat)
                        if (isset($backup['slot1']) && is_array($backup['slot1'])) {
                            $backup['slot1']['data'] = $senderSaveData;
                            $backup['slot1']['date'] = $currentTime;
                        } else {
                            $backup['data'] = $senderSaveData;
                            $backup['date'] = $currentTime;
                        }
                        file_put_contents($senderBackupFile, json_encode($backup, JSON_PRETTY_PRINT), LOCK_EX);
                    }
                }
                
                $senderModifiedSave = ['slot1' => $senderSaves['slot1']];
            }
        }
        
        $gift = [
            'id' => uniqid(),
            'from' => $from,
            'to' => $to,
            'items' => $input['items'],
            'message' => $input['message'] ?? '',
            'date' => time(),
            'status' => 'pending'
        ];
        
        // Add to recipient's gifts
        $giftsFile = getGiftsFile($to);
        $gifts = [];
        if (file_exists($giftsFile)) {
            $gifts = json_decode(file_get_contents($giftsFile), true) ?: [];
        }
        $gifts[] = $gift;
        file_put_contents($giftsFile, json_encode($gifts, JSON_PRETTY_PRINT), LOCK_EX);
        
        // Add to sender's sent gifts
        $sentFile = getSentGiftsFile($from);
        $sent = [];
        if (file_exists($sentFile)) {
            $sent = json_decode(file_get_contents($sentFile), true) ?: [];
        }
        $sent[] = $gift;
        file_put_contents($sentFile, json_encode($sent, JSON_PRETTY_PRINT), LOCK_EX);
        
        // Verify sender save data is valid before returning
        if ($senderModifiedSave !== null && isset($senderModifiedSave['slot1']['data']) && $senderModifiedSave['slot1']['data'] !== null) {
            $response = [
                'success' => true, 
                'message' => 'Gift sent', 
                'giftId' => $gift['id'],
                'senderSaveData' => $senderModifiedSave
            ];
        } else {
            $response = [
                'success' => true, 
                'message' => 'Gift sent', 
                'giftId' => $gift['id']
                // Don't include senderSaveData if it's invalid
            ];
        }
        
        echo json_encode($response);
        break;
        
    case 'item_gift_receive':
        $username = $_GET['username'] ?? '';
        
        if (!$username) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            exit;
        }
        
        $giftsFile = getGiftsFile($username);
        $gifts = [];
        if (file_exists($giftsFile)) {
            $gifts = json_decode(file_get_contents($giftsFile), true) ?: [];
        }
        
        // Filter pending gifts
        $pendingGifts = array_filter($gifts, function($g) {
            return $g['status'] === 'pending';
        });
        
        echo json_encode(['success' => true, 'gifts' => array_values($pendingGifts)]);
        break;
        
    case 'item_gift_sent':
        $username = $_GET['username'] ?? '';
        
        if (!$username) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            exit;
        }
        
        $sentFile = getSentGiftsFile($username);
        $sent = [];
        if (file_exists($sentFile)) {
            $sent = json_decode(file_get_contents($sentFile), true) ?: [];
        }
        
        echo json_encode(['success' => true, 'gifts' => $sent]);
        break;
        
    case 'item_gift_apply':
        $username = $_GET['username'] ?? '';
        $giftId = $_GET['giftId'] ?? '';
        
        if (!$username || !$giftId) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and giftId required']);
            exit;
        }
        
        $giftsFile = getGiftsFile($username);
        if (!file_exists($giftsFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'No gifts found']);
            exit;
        }
        
        $gifts = json_decode(file_get_contents($giftsFile), true) ?: [];
        
        // Find the gift
        $giftIndex = -1;
        $gift = null;
        foreach ($gifts as $i => $g) {
            if ($g['id'] === $giftId) {
                $giftIndex = $i;
                $gift = $g;
                break;
            }
        }
        
        if ($gift === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Gift not found']);
            exit;
        }
        
        if ($gift['status'] !== 'pending') {
            http_response_code(400);
            echo json_encode(['error' => 'Gift already processed']);
            exit;
        }
        
        // Get user's save
        $saveFile = getSaveFile($username);
        if (!file_exists($saveFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'User save not found']);
            exit;
        }
        
        $saves = json_decode(file_get_contents($saveFile), true);
        if (!isset($saves['slot1']) || $saves['slot1'] === null) {
            http_response_code(404);
            echo json_encode(['error' => 'No active save found']);
            exit;
        }
        
        $saveData = $saves['slot1']['data'];
        
        // Apply items to save
        $appliedItems = [];
        $failedItems = [];
        
        foreach ($gift['items'] as $item) {
            $itemId = $item['id'];
            $quantity = intval($item['quantity']);
            
            // Check if item exists in save
            if (isset($saveData[$itemId]) && is_array($saveData[$itemId])) {
                // Add quantity to existing item
                if (isset($saveData[$itemId]['got'])) {
                    $saveData[$itemId]['got'] = intval($saveData[$itemId]['got']) + $quantity;
                    $appliedItems[] = $item;
                } else {
                    $failedItems[] = ['item' => $item, 'reason' => 'Invalid item structure'];
                }
            } else {
                // Item doesn't exist in save
                $failedItems[] = ['item' => $item, 'reason' => 'Item not found in save'];
            }
        }
        
        if (empty($appliedItems)) {
            http_response_code(400);
            echo json_encode(['error' => 'No items could be applied', 'failed' => $failedItems]);
            exit;
        }
        
        // Update timestamp
        $currentTime = time();
        
        // Update slot1 in main file
        $saves['slot1']['data'] = $saveData;
        $saves['slot1']['date'] = $currentTime;
        file_put_contents($saveFile, json_encode(['slot1' => $saves['slot1']], JSON_PRETTY_PRINT), LOCK_EX);
        
        // Also update backup file if it exists
        $backupFile = getBackupFile($username);
        if (file_exists($backupFile)) {
            $backup = json_decode(file_get_contents($backupFile), true);
            if ($backup !== null) {
                // Handle both old format (with slot1 wrapper) and new format (flat)
                if (isset($backup['slot1']) && is_array($backup['slot1'])) {
                    $backup['slot1']['data'] = $saveData;
                    $backup['slot1']['date'] = $currentTime;
                } else {
                    $backup['data'] = $saveData;
                    $backup['date'] = $currentTime;
                }
                file_put_contents($backupFile, json_encode($backup, JSON_PRETTY_PRINT), LOCK_EX);
            }
        }
        
        // Mark gift as applied (but not yet accepted)
        $gifts[$giftIndex]['status'] = 'applied';
        $gifts[$giftIndex]['appliedDate'] = time();
        $gifts[$giftIndex]['appliedItems'] = $appliedItems;
        $gifts[$giftIndex]['failedItems'] = $failedItems;
        file_put_contents($giftsFile, json_encode($gifts, JSON_PRETTY_PRINT), LOCK_EX);
        
        // Safety net: re-shape empty preview team slots back to {} for the game.
        normalizeSaveTeamsPHP($saveData);

        // Return modified save for download
        echo json_encode([
            'success' => true,
            'message' => 'Items applied',
            'appliedItems' => $appliedItems,
            'failedItems' => $failedItems,
            'saveData' => $saveData
        ]);
        break;
        
    case 'item_gift_accept':
        $username = $_GET['username'] ?? '';
        $giftId = $_GET['giftId'] ?? '';
        
        if (!$username || !$giftId) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and giftId required']);
            exit;
        }
        
        $giftsFile = getGiftsFile($username);
        if (!file_exists($giftsFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'No gifts found']);
            exit;
        }
        
        $gifts = json_decode(file_get_contents($giftsFile), true) ?: [];
        
        // Find and update the gift
        $found = false;
        foreach ($gifts as &$g) {
            if ($g['id'] === $giftId) {
                if ($g['status'] !== 'applied') {
                    http_response_code(400);
                    echo json_encode(['error' => 'Gift must be applied first']);
                    exit;
                }
                $g['status'] = 'accepted';
                $g['acceptedDate'] = time();
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Gift not found']);
            exit;
        }
        
        file_put_contents($giftsFile, json_encode($gifts, JSON_PRETTY_PRINT), LOCK_EX);
        
        echo json_encode(['success' => true, 'message' => 'Gift accepted']);
        break;
        
    case 'item_gift_reject':
        $username = $_GET['username'] ?? '';
        $giftId = $_GET['giftId'] ?? '';
        
        if (!$username || !$giftId) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and giftId required']);
            exit;
        }
        
        $giftsFile = getGiftsFile($username);
        if (!file_exists($giftsFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'No gifts found']);
            exit;
        }
        
        $gifts = json_decode(file_get_contents($giftsFile), true) ?: [];
        
        // Find and update the gift
        $found = false;
        foreach ($gifts as &$g) {
            if ($g['id'] === $giftId) {
                if ($g['status'] === 'accepted') {
                    http_response_code(400);
                    echo json_encode(['error' => 'Cannot reject accepted gift']);
                    exit;
                }
                $g['status'] = 'rejected';
                $g['rejectedDate'] = time();
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Gift not found']);
            exit;
        }
        
        file_put_contents($giftsFile, json_encode($gifts, JSON_PRETTY_PRINT), LOCK_EX);
        
        echo json_encode(['success' => true, 'message' => 'Gift rejected']);
        break;

    case 'ping':
        echo json_encode(['status' => 'ok', 'message' => 'PokeChill Exchange & Savezone API running!']);
        break;

    case 'cancel':
        $code = strtoupper($_GET['code'] ?? '');
        $roomFile = $roomsDir . $code . '.json';
        if (file_exists($roomFile)) {
            unlink($roomFile);
            echo json_encode(['message' => 'Cancelled']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
        }
        break;

    case 'list_users':
        // Get list of users who have saves (for autocomplete)
        $users = [];
        if (is_dir($savesDir)) {
            $files = scandir($savesDir);
            foreach ($files as $file) {
                if (substr($file, -5) !== '.json') continue;
                $basename = basename($file, '.json');
                // Skip backup files and slot files
                if (strpos($basename, '_backup') !== false) continue;
                if (strpos($basename, '_slot') !== false) continue;
                $users[] = $basename;
            }
        }
        sort($users);
        echo json_encode(['users' => $users]);
        break;

    case 'team_edit':
        // Edit team metadata (name, description)
        $input = json_decode(file_get_contents('php://input'), true);
        
        // DEBUG: Log received data
        file_put_contents(__DIR__ . '/debug_team_edit.txt', json_encode($input, JSON_PRETTY_PRINT), FILE_APPEND);
        file_put_contents(__DIR__ . '/debug_team_edit.txt', "\n---\n", FILE_APPEND);
        
        if (!$input || !isset($input['oldName']) || !isset($input['author'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        $oldName = $input['oldName'];
        $author = $input['author'];
        $newName = $input['newName'] ?? $oldName;
        $description = $input['description'] ?? '';
        $requestingAuthor = $input['requestingAuthor'] ?? '';
        
        // Verify ownership
        if ($requestingAuthor !== $author) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only edit your own teams']);
            exit;
        }
        
        $featuredDir = __DIR__ . '/../www/Featured/';
        $authorDir = $featuredDir . preg_replace('/[^a-zA-Z0-9_-]/', '_', $author) . '/';
        
        if (!is_dir($authorDir)) {
            http_response_code(404);
            echo json_encode(['error' => 'Author directory not found']);
            exit;
        }
        
        // Find the team file
        $teamFile = null;
        $files = glob($authorDir . '*.json');
        foreach ($files as $file) {
            $data = json_decode(file_get_contents($file), true);
            // Support both formats: direct team object or wrapped in "teams" array
            $teamName = $data['name'] ?? ($data['teams'][0]['name'] ?? ($data['teamName'] ?? ''));
            if ($data && $teamName === $oldName) {
                $teamFile = $file;
                break;
            }
        }
        
        if (!$teamFile) {
            http_response_code(404);
            echo json_encode(['error' => 'Team not found']);
            exit;
        }
        
        // Load and update team data
        $teamData = json_decode(file_get_contents($teamFile), true);
        
        // Support both formats: direct team object or wrapped in "teams" array
        if (isset($teamData['teams']) && is_array($teamData['teams'])) {
            // Wrapped format
            $teamData['teams'][0]['name'] = $newName;
            $teamData['teams'][0]['description'] = $description;
        } else {
            // Direct format
            $teamData['name'] = $newName;
            $teamData['description'] = $description;
        }
        
        // Update team slots if provided
        if (isset($input['team']) && is_array($input['team'])) {
            // Convert compact array to slots format
            $slots = [];
            foreach ($input['team'] as $idx => $pokemon) {
                if ($pokemon && isset($pokemon['pokemon'])) {
                    $slot = [
                        'pokemon' => $pokemon['pokemon'],
                        'shiny' => $pokemon['shiny'] ?? false,
                        'level' => $pokemon['level'] ?? 100
                    ];
                    
                    // Handle IVs - can be ivs object or ivTotal
                    if (isset($pokemon['ivs']) && is_array($pokemon['ivs'])) {
                        $slot['ivs'] = $pokemon['ivs'];
                        $slot['ivTotal'] = array_sum($pokemon['ivs']);
                    } elseif (isset($pokemon['ivTotal'])) {
                        $slot['ivTotal'] = $pokemon['ivTotal'];
                    } else {
                        $slot['ivTotal'] = 36;
                    }
                    
                    // Optional fields
                    if (!empty($pokemon['item'])) {
                        $slot['item'] = $pokemon['item'];
                    }
                    if (!empty($pokemon['nature'])) {
                        $slot['nature'] = $pokemon['nature'];
                    }
                    if (!empty($pokemon['starSign'])) {
                        $slot['starSign'] = $pokemon['starSign'];
                    }
                    if (!empty($pokemon['ability'])) {
                        $slot['ability'] = $pokemon['ability'];
                    }
                    if (!empty($pokemon['hiddenAbilityUnlocked'])) {
                        $slot['hiddenAbilityUnlocked'] = $pokemon['hiddenAbilityUnlocked'];
                    }
                    if (!empty($pokemon['moves']) && is_array($pokemon['moves'])) {
                        $slot['moves'] = $pokemon['moves'];
                    }
                    $slots[] = $slot;
                }
            }
            // Update both formats
            $teamData['team'] = $slots;
            $teamData['slots'] = $slots;
            if (isset($teamData['teams']) && is_array($teamData['teams'])) {
                $teamData['teams'][0]['slots'] = $slots;
            }
        }
        
        // Rename file if name changed
        $newFile = $teamFile;
        if ($newName !== $oldName) {
            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $newName);
            $newFile = $authorDir . 'member_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $author) . '_' . $safeName . '_' . date('Ymd_His') . '.json';
        }
        
        // DEBUG: Check what we're about to save
        file_put_contents(__DIR__ . '/debug_save.txt', 'Saving to: ' . $newFile . "\n" . json_encode($teamData['teams'][0]['slots'][1]['starSign'] ?? 'NOT SET', JSON_PRETTY_PRINT));
        
        // Save team file
        if (file_put_contents($newFile, json_encode($teamData, JSON_PRETTY_PRINT), LOCK_EX) === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save team']);
            exit;
        }
        
        // Remove old file if renamed
        if ($newFile !== $teamFile) {
            unlink($teamFile);
        }
        
        // Update manifest
        $manifestFile = $featuredDir . 'manifest.json';
        if (file_exists($manifestFile)) {
            $manifest = json_decode(file_get_contents($manifestFile), true);
            if ($manifest && isset($manifest['teams'])) {
                foreach ($manifest['teams'] as &$team) {
                    if ($team['name'] === $oldName && $team['author'] === $author) {
                        $team['name'] = $newName;
                        $team['description'] = $description;
                        if (isset($teamData['slots'])) {
                            $team['slots'] = $teamData['slots'];
                        }
                        if (isset($teamData['team'])) {
                            $team['team'] = $teamData['team'];
                        }
                        break;
                    }
                }
                file_put_contents($manifestFile, json_encode($manifest, JSON_PRETTY_PRINT), LOCK_EX);
            }
        }
        
        echo json_encode(['success' => true, 'message' => 'Team updated']);
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
}
?>
