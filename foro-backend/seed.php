<?php
// seed.php - Inserta hilos iniciales en MongoDB Atlas (Nube)

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/database.php';

use MongoDB\BSON\ObjectId;

$db = Database::getDatabase();
$coleccionHilos = $db->hilos;
$coleccionRespuestas = $db->respuestas;

echo "🌱 Conectando a MongoDB Atlas en la nube...\n";

// Limpiamos colecciones previas para empezar limpio en la nube si se desea
$coleccionHilos->deleteMany([]);
$coleccionRespuestas->deleteMany([]);

// 1. Hilo en Charla General
$hilo1 = [
    'titulo'             => '¡Bienvenidos a ForoPrueba2002 en la Nube!',
    'contenido'          => 'Este foro ahora corre con MongoDB Atlas en la nube. Cuenten qué les parece la velocidad y el diseño retro.',
    'autor'              => 'Enzo',
    'category_id'        => 'general',
    'respuestas'         => 2,
    'limite_mensajes'    => 300,
    'extensiones_usadas' => 0,
    'votos_extension'    => 0,
    'fecha'              => date('Y-m-d H:i:s')
];
$res1 = $coleccionHilos->insertOne($hilo1);
$id1 = $res1->getInsertedId();

$coleccionRespuestas->insertOne([
    'id_hilo'    => $id1,
    'comentario' => '¡Tremendo! Funciona volando con MongoDB Atlas.',
    'autor'      => 'RetroUser',
    'fecha'      => date('Y-m-d H:i:s')
]);

$coleccionRespuestas->insertOne([
    'id_hilo'    => $id1,
    'comentario' => 'Aguante el sistema de votación para extender los hilos 😎',
    'autor'      => 'Matias',
    'fecha'      => date('Y-m-d H:i:s')
]);

// 2. Hilo en Tecnología
$hilo2 = [
    'titulo'             => '¿Cuál fue tu primera placa de video?',
    'contenido'          => 'Abro debate de hardware clásico. ¿GeForce 4 MX o Radeon 9600 Pro?',
    'autor'              => 'HardwareKing',
    'category_id'        => 'tech',
    'respuestas'         => 1,
    'limite_mensajes'    => 300,
    'extensiones_usadas' => 0,
    'votos_extension'    => 0,
    'fecha'              => date('Y-m-d H:i:s')
];
$res2 = $coleccionHilos->insertOne($hilo2);
$id2 = $res2->getInsertedId();

$coleccionRespuestas->insertOne([
    'id_hilo'    => $id2,
    'comentario' => 'Yo jugaba al San Andreas en 640x480 con una FX 5200 jaja.',
    'autor'      => 'Enzo',
    'fecha'      => date('Y-m-d H:i:s')
]);

// 3. Hilo en Videojuegos
$hilo3 = [
    'titulo'             => 'Mix de Counter-Strike 1.6 este fin de semana',
    'contenido'          => 'Armamos torneo en de_dust2 e inferno. Servidor con sXe Injected activado.',
    'autor'              => 'ClanLeader',
    'category_id'        => 'gaming',
    'respuestas'         => 0,
    'limite_mensajes'    => 300,
    'extensiones_usadas' => 0,
    'votos_extension'    => 0,
    'fecha'              => date('Y-m-d H:i:s')
];
$coleccionHilos->insertOne($hilo3);

echo "✅ ¡Éxito total! Datos sembrados en MongoDB Atlas (Nube):\n";
echo " - 3 Hilos iniciales creados\n";
echo " - 3 Respuestas creadas\n";
