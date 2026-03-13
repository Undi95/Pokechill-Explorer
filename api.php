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
        if (filemtime($file) < time() - 600) {
            unlink($file);
        }
    }
}

$action = $_GET['action'] ?? '';
cleanupOldRooms();

switch ($action) {
    case 'create':
        $code = generateCode();
        while (file_exists(getRoomFile($code))) {
            $code = generateCode();
        }
        $room = [
            'code' => $code,
            'created' => time(),
            'playerA' => ['present' => true, 'pokemon' => null, 'confirmed' => false],
            'playerB' => ['present' => false, 'pokemon' => null, 'confirmed' => false]
        ];
        file_put_contents(getRoomFile($code), json_encode($room));
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
        file_put_contents($file, json_encode($room));
        echo json_encode(['message' => 'Joined room', 'code' => $code]);
        break;

    case 'status':
        $code = strtoupper($_GET['code'] ?? '');
        $file = getRoomFile($code);
        if (!file_exists($file)) {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
            exit;
        }
        $room = json_decode(file_get_contents($file), true);
        echo json_encode([
            'code' => $room['code'],
            'bothPresent' => $room['playerA']['present'] && $room['playerB']['present'],
            'playerASelected' => $room['playerA']['pokemon'] !== null,
            'playerBSelected' => $room['playerB']['pokemon'] !== null,
            'bothSelected' => $room['playerA']['pokemon'] !== null && $room['playerB']['pokemon'] !== null,
            'bothConfirmed' => $room['playerA']['confirmed'] && $room['playerB']['confirmed'],
            'exchangeComplete' => $room['playerA']['confirmed'] && $room['playerB']['confirmed']
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
        file_put_contents($file, json_encode($room));
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
        file_put_contents($file, json_encode($room));
        
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

    default:
        echo json_encode(['error' => 'Unknown action']);
}
?>
