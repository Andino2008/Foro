<?php
// config/database.php
// ==============================================================================
// 🔌 GESTOR DE CONEXIÓN A MONGODB (PATRÓN SINGLETON)
// ==============================================================================
// Este archivo se encarga de abrir una sola conexión con la base de datos
// y reutilizarla en todo el sistema para no saturar la memoria ni el servidor.
//
// 🔒 SEGURIDAD:
// La cadena de conexión y credenciales NUNCA se escriben en texto plano acá.
// Se leen dinámicamente desde la variable de entorno 'MONGODB_URI' configurada
// en Render o en un archivo .env local protegido por .gitignore.

require_once __DIR__ . '/../vendor/autoload.php';

use MongoDB\Client;

class Database {
    private static ?Client $client = null;
    private static string $dbName = 'foro_db';

    public static function getDatabase() {
        if (self::$client === null) {
            try {
                // 1. Buscamos la variable de entorno MONGODB_URI (Render / Servidor de Producción)
                $uri = getenv('MONGODB_URI') ?: ($_ENV['MONGODB_URI'] ?? $_SERVER['MONGODB_URI'] ?? null);

                // 2. Si no existe en el sistema, buscamos en un archivo .env local si existiera
                if (!$uri) {
                    if (file_exists(__DIR__ . '/.env')) {
                        $env = parse_ini_file(__DIR__ . '/.env');
                        $uri = $env['MONGODB_URI'] ?? null;
                    } elseif (file_exists(__DIR__ . '/../.env')) {
                        $env = parse_ini_file(__DIR__ . '/../.env');
                        $uri = $env['MONGODB_URI'] ?? null;
                    }
                }

                // 3. Si aún no hay URI configurada, lanzamos un mensaje claro de configuración
                if (!$uri) {
                    throw new \Exception('No se encontró la variable de entorno MONGODB_URI. Por favor configurala en el panel de Render o en tu archivo .env local.');
                }
                
                // Creamos el cliente oficial de MongoDB con la URI segura
                self::$client = new Client($uri);

                // Enviamos una orden 'ping' de prueba para verificar que la nube responde
                self::$client->selectDatabase(self::$dbName)->command(['ping' => 1]);

                // ======================================================================
                // 💡 OPCIONAL (A FUTURO): Auto-purgado por inactividad tras 48hs (Índice TTL nativo):
                // MongoDB revisa en segundo plano y borra solo lo que supere 48hs (172800 segundos)
                // self::$client->selectDatabase(self::$dbName)->hilos->createIndex(['fecha' => 1], ['expireAfterSeconds' => 172800]);
                // ======================================================================
                
            } catch (\Exception $e) {
                http_response_code(500);
                die(json_encode([
                    'status'  => 'error',
                    'message' => 'Fallo la conexión con MongoDB Atlas: ' . $e->getMessage()
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        return self::$client->selectDatabase(self::$dbName);
    }
}