<?php
// CORS headers for security
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Kun POST-anmodninger er tilladt']);
    exit;
}

// Get the JSON data from the request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['products']) || !is_array($data['products'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ugyldige produktdata']);
    exit;
}

// Define the file path
$filePath = __DIR__ . '/products.json';

// Write the data to the file with proper formatting
$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if (file_put_contents($filePath, $json) !== false) {
    echo json_encode(['success' => true, 'message' => 'Produkter gemt succesfuldt']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Kunne ikke skrive til fil: ' . $filePath]);
}
?>
