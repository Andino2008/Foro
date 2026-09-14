<?php
// config/database.php
// ==============================================================================
// 🔌 GESTOR DE CONEXIÓN A MONGODB (PATRÓN SINGLETON)
// ==============================================================================
// Este archivo se encarga de abrir una sola conexión con la base de datos
// y reutilizarla en todo el sistema para no saturar la memoria ni el servidor.

require_once __DIR__ . '/../vendor/autoload.php';

use MongoDB\Client;

class Database {
    private static ?Client $client = null;
    private static string $dbName = 'foro_db';

    public static function getDatabase() {
        if (self::$client === null) {
            try {
                // Cadena de conexión a MongoDB Atlas (Nube Oficial)
                // Permite usar variable de entorno 'MONGODB_URI' si existe, o el enlace de Atlas directo
                $uri = getenv('MONGODB_URI') ?: "mongodb+srv://andinoenzo40_db_user:t8w8PDZYD2YBrNfP@foro.bjorb3s.mongodb.net/?appName=foro";
                
                // Creamos el cliente oficial de MongoDB
                self::$client = new Client($uri);

                // Enviamos una orden 'ping' de prueba para verificar que la nube responde
                self::$client->selectDatabase(self::$dbName)->command(['ping' => 1]);
                
            } catch (\Exception $e) {
                http_response_code(500);
                die(json_encode([
                    'status'  => 'error',
                    'message' => 'Fallo la conexión con MongoDB Atlas en la nube: ' . $e->getMessage()
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        return self::$client->selectDatabase(self::$dbName);
    }
}