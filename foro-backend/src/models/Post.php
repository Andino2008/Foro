<?php
// src/Models/Post.php

namespace App\Models;

use MongoDB\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Post {
    private $collection;

    public function __construct(Database $db) {
        // Colección 'posts' en MongoDB
        $this->collection = $db->posts;
    }

    /**
     * Crear una respuesta dentro de un hilo
     */
    public function create(string $threadId, string $content, array $author, ?array $quotedPost = null): array {
        $document = [
            'thread_id'    => new ObjectId($threadId),
            'content'      => $content,
            'author'       => [
                'id'         => $author['id'] ?? null,
                'username'   => $author['username'] ?? 'Anónimo',
                'rank'       => $author['rank'] ?? 'Usuario',
                'join_date'  => $author['join_date'] ?? '2026',
                'post_count' => $author['post_count'] ?? 1,
                'signature'  => $author['signature'] ?? ''
            ],
            'quoted_post'  => $quotedPost, // null o array con { id, author_username, content, page }
            'likes'        => [],
            'created_at'   => new UTCDateTime()
        ];

        $result = $this->collection->insertOne($document);

        return [
            'status' => true,
            'id'     => (string) $result->getInsertedId()
        ];
    }

    /**
     * Obtener respuestas de un hilo con paginación
     */
    public function getByThread(string $threadId, int $page = 1, int $perPage = 10): array {
        try {
            $skip = ($page - 1) * $perPage;
            $cursor = $this->collection->find(
                ['thread_id' => new ObjectId($threadId)],
                [
                    'sort'  => ['created_at' => 1], // Más antiguos primero (estilo foro clásico)
                    'skip'  => $skip,
                    'limit' => $perPage
                ]
            );

            $posts = [];
            foreach ($cursor as $doc) {
                $posts[] = $this->formatPost($doc);
            }

            return $posts;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Contar respuestas de un hilo específico
     */
    public function countByThread(string $threadId): int {
        try {
            return $this->collection->countDocuments(['thread_id' => new ObjectId($threadId)]);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Contar total de posts en todo el foro
     */
    public function countAll(): int {
        return $this->collection->countDocuments();
    }

    /**
     * Helper para formatear un post
     */
    private function formatPost($doc): array {
        $timestamp = $doc['created_at'] instanceof UTCDateTime 
            ? $doc['created_at']->toDateTime()->format('d/m/Y, H:i') 
            : 'Reciente';

        return [
            'id'          => (string) $doc['_id'],
            'thread_id'   => (string) $doc['thread_id'],
            'content'     => $doc['content'] ?? '',
            'author'      => [
                'id'         => (string) ($doc['author']['id'] ?? ''),
                'username'   => $doc['author']['username'] ?? 'Anónimo',
                'rank'       => $doc['author']['rank'] ?? 'Usuario',
                'join_date'  => $doc['author']['join_date'] ?? '2026',
                'post_count' => $doc['author']['post_count'] ?? 1,
                'signature'  => $doc['author']['signature'] ?? ''
            ],
            'quoted_post' => $doc['quoted_post'] ?? null,
            'likes_count' => isset($doc['likes']) ? count($doc['likes']) : 0,
            'timestamp'   => $timestamp
        ];
    }
}
