<?php
// src/Models/Thread.php

namespace App\Models;

use MongoDB\Database;
use MongoDB\BSON\UTCDateTime;

class Thread {
    // Variable privada para guardar la colección 'threads' de Mongo
    private $collection;

    // El constructor recibe la conexión y selecciona la colección 'threads'
    public function __construct(Database $db) {
        $this->collection = $db->threads;
    }

    /**
     * Función para crear un nuevo Hilo
     */
    public function create(string $titulo, string $contenido, string $autor = 'Anónimo'): array {
        $documento = [
            'titulo'     => $titulo,
            'contenido'  => $contenido,
            'autor'      => $autor,
            'respuestas' => 0,
            'likes'      => [], // Array vacío de likes
            'fecha'      => new UTCDateTime() // Guarda la fecha actual con hora exacta en Mongo
        ];

        // insertOne lo guarda en la colección
        $resultado = $this->collection->insertOne($documento);

        return [
            'status' => true,
            'id'     => (string) $resultado->getInsertedId()
        ];
    }

    /**
     * Función para listar todos los hilos
     */
    public function getAll(): array {
        // find() sin filtros trae todos los documentos
        $cursor = $this->collection->find([], ['sort' => ['fecha' => -1]]); // -1 = los más nuevos primero

        $hilos = [];
           foreach ($cursor as $doc) {
            $hilos[] = [
                'id'         => (string) $doc['_id'],
                'titulo'     => $doc['titulo'] ?? $doc['title'] ?? 'Sin título',
                'contenido'  => $doc['contenido'] ?? $doc['content'] ?? '',
                'autor'      => is_array($doc['autor'] ?? null) 
                                ? ($doc['autor']['username'] ?? 'Anónimo') 
                                : ($doc['autor'] ?? 'Anónimo'),
                'respuestas' => $doc['respuestas'] ?? $doc['reply_count'] ?? 0,
                'likes'      => count($doc['likes'] ?? [])
            ];
        }

        return $hilos;
    }
}