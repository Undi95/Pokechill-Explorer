<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

$roomsDir = __DIR__ . '/rooms/';
if (!is_dir($roomsDir)) mkdir($roomsDir, 0777, true);

function generateCode() {
    return strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
}

function getRoomFile($code) {
    global $roomsDir;
    return $roomsDir . strtoupper($code) . '.json';
}

function cleanupOldRooms() {
    global $roomsDir;
    $files = glob($roomsDir . '*.json');
    foreach ($files as $file) {
        if (filemtime($file) < time() - 600) unlink($file);
    }
}

$action = $_GET['action'] ?? '';
cleanupOldRooms();

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
        
        // Re-lire le fichier pour être sûr d'avoir l'état à jour
        $room = json_decode(file_get_contents($file), true);
        $otherKey = $player === 'A' ? 'playerB' : 'playerA';
        
        echo json_encode([
            'message' => 'Confirmed',
            'exchangeComplete' => $room['playerA']['confirmed'] && $room['playerB']['confirmed'],
            'otherPokemon' => $room[$otherKey]['pokemon']
        ]);
        break;

    case 'ping':
        echo json_encode(['status' => 'ok', 'message' => 'PokeChill Exchange PHP is running!']);
        break;

    case 'cancel':
        $code = strtoupper($_GET['code'] ?? '');
        $roomFile = $roomsDir . $code . '.json';
        if (file_exists($roomFile)) {
            unlink($roomFile); // Supprime la room
            echo json_encode(['message' => 'Cancelled']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
        }
        break;


    default:
        echo json_encode(['error' => 'Unknown action']);
}
?>
