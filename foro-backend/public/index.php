<?php
// public/index.php
// Establecemos la zona horaria oficial de Argentina (UTC-3)
date_default_timezone_set('America/Argentina/Buenos_Aires');

// ==============================================================================
//  ENRUTADOR PRINCIPAL (ROUTER) & API REST DEL FORO
// ==============================================================================
// Este archivo es el punto de entrada único (Single Entry Point).
// Cada vez que el navegador o JavaScript hace una petición, entra por acá.
// PHP analiza qué ruta se pidió ($ruta) y qué método se usó ($metodo) para decidir qué hacer.

// Extraemos la ruta limpia de la URL solicitada (ejemplo: '/api/forum' o '/api/thread/6aa...')
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// ==============================================================================
// 1. ENTREGA DE LA PÁGINA WEB PRINCIPAL (FRONTEND)
// ==============================================================================
// Si el usuario entra a la raíz '/', le entregamos directamente el archivo index.html
// con la cabecera 'text/html' para que el navegador dibuje la interfaz gráfica retro.
if ($ruta === '/' || $ruta === '/index.html') {
    header("Content-Type: text/html; charset=UTF-8");
    readfile(__DIR__ . '/index.html');
    exit;
}

// ==============================================================================
// 2. CABECERAS PARA LA API REST (JSON & CORS)
// ==============================================================================
// Para todas las demás rutas (que empiezan con /api/...), le avisamos al navegador
// que vamos a responder con datos en formato JSON y habilitamos CORS (permite que
// JavaScript pueda comunicarse con el servidor sin bloqueos de seguridad).
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Las peticiones OPTIONS las hacen los navegadores automáticamente antes de enviar datos (Pre-flight).
// Respondemos con código 200 OK y cerramos.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==============================================================================
// 3. CARGA DE DEPENDENCIAS Y BASE DE DATOS
// ==============================================================================
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

// Conectamos a MongoDB y seleccionamos las dos colecciones principales:
$db = Database::getDatabase();
$coleccionHilos = $db->hilos;             // Colección para los temas principales
$coleccionRespuestas = $db->respuestas;   // Colección para los comentarios/respuestas

// Capturamos el método HTTP de la petición (GET, POST, etc.)
$metodo = $_SERVER['REQUEST_METHOD'];

/**
 * Función auxiliar para leer los datos que JavaScript envía en el cuerpo (Body) por POST.
 * Como vienen en formato JSON plano, 'file_get_contents' lee el texto y 'json_decode'
 * lo transforma en un arreglo asociativo estándar de PHP.
 */
function getJson(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}

/*
==============================================================================
📌 ENDPOINT 1: GET /api/forum - Portada y Categorías
==============================================================================
Devuelve la lista de categorías del foro junto a las estadísticas globales
(total de hilos y total de posts en la base de datos).
*/
if ($metodo === 'GET' && $ruta === '/api/forum') {
    $totalHilos = $coleccionHilos->countDocuments();
    $totalPosts = $coleccionRespuestas->countDocuments();

    $categories = [
        [
            'id'           => 'general',
            'name'         => 'Charla General & Off-Topic',
            'description'  => 'Debates, presentaciones, humor y temas varios de la comunidad.',
            // Contamos los hilos que tengan category_id = general (o los que no tengan por ser viejos)
            'thread_count' => $coleccionHilos->countDocuments(['$or' => [['category_id' => 'general'], ['category_id' => ['$exists' => false]]]]),
            'last_activity'=> 'Hoy'
        ],
        [
            'id'           => 'tech',
            'name'         => 'Tecnología & Hardware',
            'description'  => 'Computación, overclocking, placas de video y sistemas operativos.',
            'thread_count' => $coleccionHilos->countDocuments(['category_id' => 'tech']),
            'last_activity'=> 'Hoy'
        ],
        [
            'id'           => 'gaming',
            'name'         => 'Videojuegos & Emulación',
            'description'  => 'PC Gaming, consolas retro, mods y lanzamientos.',
            'thread_count' => $coleccionHilos->countDocuments(['category_id' => 'gaming']),
            'last_activity'=> 'Ayer'
        ],
        [
            'id'           => 'paranormal',
            'name'         => 'Paranormal & Misterio',
            'description'  => 'Casos extraños, leyendas urbanas, creepypastas y misterios sin resolver.',
            'thread_count' => $coleccionHilos->countDocuments(['category_id' => 'paranormal']),
            'last_activity'=> 'Reciente'
        ],
        [
            'id'           => 'anecdotas',
            'name'         => 'Anécdotas & Historias',
            'description'  => 'Historias personales, anécdotas escolares y vivencias cotidianas.',
            'thread_count' => $coleccionHilos->countDocuments(['category_id' => 'anecdotas']),
            'last_activity'=> 'Reciente'
        ],
        [
            'id'           => 'nsfw',
            'name'         => 'NSFW & Adultos (+18)',
            'description'  => 'Debates para mayores de edad, humor bizarro y temas picantes.',
            'thread_count' => $coleccionHilos->countDocuments(['category_id' => 'nsfw']),
            'last_activity'=> 'Reciente'
        ],
        [
            'id'           => 'consejos',
            'name'         => 'Consejos & Ayuda Comunitaria',
            'description'  => 'Preguntas, consejos sobre estudios, relaciones y vida cotidiana.',
            'thread_count' => $coleccionHilos->countDocuments(['category_id' => 'consejos']),
            'last_activity'=> 'Reciente'
        ]
    ];

    echo json_encode([
        'stats' => [
            'total_threads' => $totalHilos,
            'total_posts'   => $totalPosts,
            'total_users'   => 1
        ],
        'categories' => $categories
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/*
==============================================================================
 📌 ENDPOINT 2: GET /api/category/{id} - Lista de Hilos de una Categoría
==============================================================================
Usa una expresión regular (preg_match) para capturar el nombre de la categoría
y busca los hilos correspondientes en Mongo.
*/
if ($metodo === 'GET' && preg_match('#^/api/category/([a-zA-Z0-9_-]+)$#', $ruta, $m)) {
    $catId = $m[1]; // $m[1] contiene la parte capturada en la URL (el ID de categoría)
    $categoryNames = [
        'general'    => 'Charla General & Off-Topic',
        'tech'       => 'Tecnología & Hardware',
        'gaming'     => 'Videojuegos & Emulación',
        'paranormal' => 'Paranormal & Misterio',
        'anecdotas'  => 'Anécdotas & Historias',
        'nsfw'       => 'NSFW & Adultos (+18)',
        'consejos'   => 'Consejos & Ayuda Comunitaria'
    ];

    $filtro = ($catId === 'general') 
        ? ['$or' => [['category_id' => 'general'], ['category_id' => ['$exists' => false]]]]
        : ['category_id' => $catId];

    // Buscamos los hilos ordenados por fecha descendente (-1 = los más nuevos arriba)
    $cursor = $coleccionHilos->find($filtro, ['sort' => ['fecha' => -1]]);
    $threads = [];

    foreach ($cursor as $doc) {
        $threads[] = [
            'id'                 => (string) $doc['_id'],
            'title'              => $doc['titulo'] ?? $doc['title'] ?? 'Sin título',
            'creator'            => ['username' => is_array($doc['autor'] ?? null) ? ($doc['autor']['username'] ?? 'Anon') : ($doc['autor'] ?? 'Anon')],
            'reply_count'        => $doc['respuestas'] ?? $doc['reply_count'] ?? $coleccionRespuestas->countDocuments(['id_hilo' => $doc['_id']]),
            'created_at'         => $doc['fecha'] ?? ($doc['created_at'] instanceof UTCDateTime ? $doc['created_at']->toDateTime()->format('d/m/Y H:i') : 'Reciente'),
            'last_activity'      => $doc['fecha'] ?? 'Reciente',
            'limite_mensajes'    => $doc['limite_mensajes'] ?? 300,
            'extensiones_usadas' => $doc['extensiones_usadas'] ?? 0
        ];
    }

    echo json_encode([
        'id'          => $catId,
        'name'        => $categoryNames[$catId] ?? ucfirst($catId),
        'description' => 'Hilos de la categoría ' . $catId,
        'threads'     => $threads
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/*
==============================================================================
 ENDPOINT 3: POST /api/threads - Crear un Nuevo Hilo
==============================================================================
Recibe título, contenido, autor y categoría en JSON.
Inserta el documento en la colección 'hilos' con:
- limite_mensajes = 300 (límite inicial)
- extensiones_usadas = 0 (máximo 3)
- votos_extension = 0
*/
if ($metodo === 'POST' && $ruta === '/api/threads') {
    $data = getJson();
    $title      = trim($data['title'] ?? '');
    $content    = trim($data['content'] ?? '');
    $author     = trim($data['author'] ?? 'Anónimo');
    $categoryId = trim($data['category_id'] ?? 'general');

    if (empty($title) || empty($content)) {
        http_response_code(400);
        echo json_encode(['status' => false, 'error' => 'Título y mensaje son obligatorios']);
        exit;
    }

    $nuevo = [
        'titulo'             => $title,
        'contenido'          => $content,
        'autor'              => $author,
        'category_id'        => $categoryId,
        'respuestas'         => 0,
        'limite_mensajes'    => 300, // Límite inicial de vida
        'extensiones_usadas' => 0,   // Extensiones consumidas (máx 3)
        'votos_extension'    => 0,   // Votos acumulados para extender
        'fecha'              => date('Y-m-d H:i:s')
    ];

    $res = $coleccionHilos->insertOne($nuevo);

    echo json_encode([
        'status' => true,
        'id'     => (string) $res->getInsertedId()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
==============================================================================
 ENDPOINT 4: GET /api/thread/{id} - Ver un Hilo y sus Respuestas
==============================================================================
Busca el hilo original por su ObjectId (24 caracteres hex).
Luego busca todas las respuestas vinculadas en 'respuestas' donde id_hilo == threadId.
Devuelve los datos del hilo, estado de supervivencia y el array de posts.
*/
if ($metodo === 'GET' && preg_match('#^/api/thread/([a-f0-9]{24})$#', $ruta, $m)) {
    $threadId = $m[1];
    $hilo = $coleccionHilos->findOne(['_id' => new ObjectId($threadId)]);

    if (!$hilo) {
        http_response_code(404);
        echo json_encode(['error' => 'Hilo no encontrado o ya fue purgado']);
        exit;
    }

    $cursorPosts = $coleccionRespuestas->find(['id_hilo' => new ObjectId($threadId)], ['sort' => ['fecha' => 1]]);
    $posts = [];

    // Post 0: El mensaje original (OP - Original Post)
    $likesHilo = isset($hilo['likes']) ? array_values((array) $hilo['likes']) : [];
    $posts[] = [
        'id'          => (string) $hilo['_id'],
        'content'     => $hilo['contenido'] ?? $hilo['content'] ?? '',
        'author'      => [
            'username'  => is_array($hilo['autor'] ?? null) ? ($hilo['autor']['username'] ?? 'Anon') : ($hilo['autor'] ?? 'Anon'),
            'rank'      => 'Creador del Tema',
            'join_date' => '2026'
        ],
        'timestamp'   => $hilo['fecha'] ?? 'Reciente',
        'likes'       => $likesHilo,
        'likes_count' => count($likesHilo)
    ];

    // Posts 1..N: Las respuestas de los usuarios
    foreach ($cursorPosts as $p) {
        $likesPost = isset($p['likes']) ? array_values((array) $p['likes']) : [];
        $posts[] = [
            'id'          => (string) $p['_id'],
            'content'     => $p['comentario'] ?? $p['content'] ?? '',
            'author'      => [
                'username'  => is_array($p['autor'] ?? null) ? ($p['autor']['username'] ?? 'Anon') : ($p['autor'] ?? 'Anon'),
                'rank'      => 'Miembro',
                'join_date' => '2026'
            ],
            'timestamp'   => $p['fecha'] ?? 'Reciente',
            'likes'       => $likesPost,
            'likes_count' => count($likesPost)
        ];
    }

    $totalMensajes = count($posts);

    echo json_encode([
        'id'                 => (string) $hilo['_id'],
        'title'              => $hilo['titulo'] ?? $hilo['title'] ?? 'Sin título',
        'creator'            => ['username' => is_array($hilo['autor'] ?? null) ? ($hilo['autor']['username'] ?? 'Anon') : ($hilo['autor'] ?? 'Anon')],
        'created_at'         => $hilo['fecha'] ?? 'Reciente',
        'limite_mensajes'    => $hilo['limite_mensajes'] ?? 300,
        'extensiones_usadas' => $hilo['extensiones_usadas'] ?? 0,
        'votos_extension'    => $hilo['votos_extension'] ?? 0,
        'total_mensajes'     => $totalMensajes,
        'posts'              => $posts
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/*
==============================================================================
 ENDPOINT 5: POST /api/thread/{id}/reply - Responder a un Hilo (Auto-Purgado)
==============================================================================
1. Inserta la respuesta en la colección 'respuestas' vinculada con ObjectId(threadId).
2. Suma +1 al contador de respuestas en el hilo.
3. Cuenta el total de mensajes: si total >= límite Y ya gastó las 3 extensiones,
   ejecuta deleteOne() del hilo y deleteMany() de las respuestas para liberar almacenamiento.
*/
if ($metodo === 'POST' && preg_match('#^/api/thread/([a-f0-9]{24})/reply$#', $ruta, $m)) {
    $threadId = $m[1];
    $data = getJson();
    $content = trim($data['content'] ?? '');
    $author  = trim($data['author'] ?? 'Anónimo');

    if (empty($content)) {
        http_response_code(400);
        echo json_encode(['error' => 'El comentario no puede estar vacío']);
        exit;
    }

    $hiloActual = $coleccionHilos->findOne(['_id' => new ObjectId($threadId)]);
    if (!$hiloActual) {
        http_response_code(404);
        echo json_encode(['error' => 'El hilo ya no existe o fue purgado']);
        exit;
    }

    $limiteMaximo       = $hiloActual['limite_mensajes'] ?? 300;
    $extensionesUsadas  = $hiloActual['extensiones_usadas'] ?? 0;

    // 1. Guardamos la respuesta en MongoDB
    $nuevaRespuesta = [
        'id_hilo'    => new ObjectId($threadId), // Clave foránea al hilo
        'comentario' => $content,
        'autor'      => $author,
        'fecha'      => date('Y-m-d H:i:s')
    ];
    $res = $coleccionRespuestas->insertOne($nuevaRespuesta);

    // 2. Incrementamos contador en el hilo
    $coleccionHilos->updateOne(
        ['_id' => new ObjectId($threadId)],
        ['$inc' => ['respuestas' => 1]]
    );

    // 3. Verificamos si superó el límite de supervivencia
    $totalRespuestas = $coleccionRespuestas->countDocuments(['id_hilo' => new ObjectId($threadId)]);
    $totalMensajes   = 1 + $totalRespuestas;

    //  SI LLEGÓ AL LÍMITE Y YA GASTÓ SUS 3 EXTENSIONES -> PURGADO
    if ($totalMensajes >= $limiteMaximo && $extensionesUsadas >= 3) {
        // Borramos el documento del hilo
        $coleccionHilos->deleteOne(['_id' => new ObjectId($threadId)]);
        // Borramos todos los comentarios asociados a ese hilo
        $coleccionRespuestas->deleteMany(['id_hilo' => new ObjectId($threadId)]);

        echo json_encode([
            'status'       => true,
            'hilo_borrado' => true,
            'mensaje'      => 'El hilo alcanzó el límite máximo de ' . $limiteMaximo . ' mensajes (3/3 extensiones) y fue purgado 🗑️'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'status' => true,
        'id'     => (string) $res->getInsertedId()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
==============================================================================
 ENDPOINT 6: POST /api/thread/{id}/extender - Votar Extensión (+100 msgs)
==============================================================================
Permite a los usuarios votar para salvar el hilo.
- Suma +1 voto ($votos).
- Si alcanza 3 votos: expande limite_mensajes += 100, suma extensiones_usadas += 1 y resetea votos a 0.
- Máximo permitido: 3 extensiones.
*/
if ($metodo === 'POST' && preg_match('#^/api/thread/([a-f0-9]{24})/extender$#', $ruta, $m)) {
    $threadId = $m[1];
    $hilo = $coleccionHilos->findOne(['_id' => new ObjectId($threadId)]);

    if (!$hilo) {
        http_response_code(404);
        echo json_encode(['error' => 'El hilo no existe o ya fue eliminado']);
        exit;
    }

    $extensiones = $hilo['extensiones_usadas'] ?? 0;
    $votos       = ($hilo['votos_extension'] ?? 0) + 1;
    $limite      = $hilo['limite_mensajes'] ?? 300;

    // Validación de tope máximo de 3 extensiones
    if ($extensiones >= 3) {
        http_response_code(400);
        echo json_encode(['error' => 'Este hilo ya utilizó el máximo de 3 extensiones permitidas']);
        exit;
    }

    // Si la comunidad juntó 3 votos -> APROBADA LA EXTENSIÓN
    if ($votos >= 3) {
        $nuevoLimite = $limite + 100;
        $coleccionHilos->updateOne(
            ['_id' => new ObjectId($threadId)],
            [
                '$set' => [
                    'limite_mensajes' => $nuevoLimite,
                    'votos_extension' => 0 // Reiniciamos contador de votos para la próxima
                ],
                '$inc' => [
                    'extensiones_usadas' => 1 // Gastamos 1 extensión
                ]
            ]
        );

        echo json_encode([
            'status'             => true,
            'extendido'          => true,
            'nuevo_limite'       => $nuevoLimite,
            'extensiones_usadas' => $extensiones + 1,
            'mensaje'            => '🎉 ¡Extensión aprobada por la comunidad! Nuevo límite: ' . $nuevoLimite . ' mensajes.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Si aún no llega a 3 votos, solo guardamos el voto sumado
    $coleccionHilos->updateOne(
        ['_id' => new ObjectId($threadId)],
        ['$set' => ['votos_extension' => $votos]]
    );

    echo json_encode([
        'status'             => true,
        'extendido'          => false,
        'votos_actuales'     => $votos,
        'votos_necesarios'   => 3,
        'mensaje'            => 'Voto registrado: ' . $votos . '/3 votos para extender +100 mensajes.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
==============================================================================
 ENDPOINT 7: GET /api/user/me - Perfil de Usuario
==============================================================================
Devuelve la información del usuario simulado y estadísticas personales.
*/
if ($metodo === 'GET' && $ruta === '/api/user/me') {
    echo json_encode([
        'username'   => 'Enzo',
        'rank'       => 'Administrador del Foro',
        'join_date'  => 'Sep 2026',
        'post_count' => $coleccionRespuestas->countDocuments()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/*
==============================================================================
 ENDPOINT 8: GET /api/user/notifications - Bandeja de Alertas
==============================================================================
*/
if ($ruta === '/api/user/notifications') {
    echo json_encode(['unread_count' => 0, 'notifications' => []]);
    exit;
}

/*
==============================================================================
 ENDPOINT 9: GET /api/search?q={query} - Buscador por Palabras Clave
==============================================================================
Usa expresiones regulares en MongoDB (Regex) para buscar coincidencias
en los campos 'titulo' o 'contenido' de los hilos sin importar mayúsculas.
*/
if ($metodo === 'GET' && $ruta === '/api/search') {
    $query = $_GET['q'] ?? '';
    // Expresión regular insensible a mayúsculas/minúsculas ('i')
    $regex = new \MongoDB\BSON\Regex($query, 'i');
    $cursor = $coleccionHilos->find([
        '$or' => [
            ['titulo' => $regex],
            ['contenido' => $regex]
        ]
    ]);

    $results = [];
    foreach ($cursor as $doc) {
        $results[] = [
            'id'    => (string) $doc['_id'],
            'title' => $doc['titulo'] ?? 'Sin título'
        ];
    }

    echo json_encode(['threads' => $results], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
==============================================================================
 📌 ENDPOINT 10: POST /api/thread/{id}/like - Dar/Quitar Like a un Hilo (OP)
==============================================================================
Usa $addToSet para dar like único y $pull para quitar el like (toggle atómico en MongoDB).
*/
if ($metodo === 'POST' && preg_match('#^/api/thread/([a-f0-9]{24})/like$#', $ruta, $m)) {
    $threadId = $m[1];
    $data = getJson();
    $username = trim($data['username'] ?? 'Anónimo');

    $hilo = $coleccionHilos->findOne(['_id' => new ObjectId($threadId)]);
    if (!$hilo) {
        http_response_code(404);
        echo json_encode(['error' => 'Hilo no encontrado o eliminado']);
        exit;
    }

    $likes = isset($hilo['likes']) ? array_values((array) $hilo['likes']) : [];
    $liked = in_array($username, $likes);

    if ($liked) {
        // Ya dio like -> Quitar Like ($pull)
        $coleccionHilos->updateOne(
            ['_id' => new ObjectId($threadId)],
            ['$pull' => ['likes' => $username]]
        );
        $liked = false;
        $likesCount = max(0, count($likes) - 1);
    } else {
        // No dio like -> Agregar Like atómico ($addToSet)
        $coleccionHilos->updateOne(
            ['_id' => new ObjectId($threadId)],
            ['$addToSet' => ['likes' => $username]]
        );
        $liked = true;
        $likesCount = count($likes) + 1;
    }

    echo json_encode([
        'status'      => true,
        'liked'       => $liked,
        'likes_count' => $likesCount
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
==============================================================================
 📌 ENDPOINT 11: POST /api/post/{id}/like - Dar/Quitar Like a una Respuesta
==============================================================================
*/
if ($metodo === 'POST' && preg_match('#^/api/post/([a-f0-9]{24})/like$#', $ruta, $m)) {
    $postId = $m[1];
    $data = getJson();
    $username = trim($data['username'] ?? 'Anónimo');

    $post = $coleccionRespuestas->findOne(['_id' => new ObjectId($postId)]);
    if (!$post) {
        http_response_code(404);
        echo json_encode(['error' => 'Respuesta no encontrada']);
        exit;
    }

    $likes = isset($post['likes']) ? array_values((array) $post['likes']) : [];
    $liked = in_array($username, $likes);

    if ($liked) {
        // Ya dio like -> Quitar Like ($pull)
        $coleccionRespuestas->updateOne(
            ['_id' => new ObjectId($postId)],
            ['$pull' => ['likes' => $username]]
        );
        $liked = false;
        $likesCount = max(0, count($likes) - 1);
    } else {
        // No dio like -> Agregar Like atómico ($addToSet)
        $coleccionRespuestas->updateOne(
            ['_id' => new ObjectId($postId)],
            ['$addToSet' => ['likes' => $username]]
        );
        $liked = true;
        $likesCount = count($likes) + 1;
    }

    echo json_encode([
        'status'      => true,
        'liked'       => $liked,
        'likes_count' => $likesCount
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ==============================================================================
// 404: RUTA NO ENCONTRADA
// ==============================================================================
// Si el cliente pide una ruta de API que no coincide con ningún 'if' anterior
http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada: ' . $ruta], JSON_UNESCAPED_UNICODE);
