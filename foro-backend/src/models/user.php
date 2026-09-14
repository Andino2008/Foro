<?php
// src/Models/User.php

namespace App\Models;

use MongoDB\Database;
use MongoDB\BSON\UTCDateTime;

class User {
    private $collection;

    public function __construct(Database $db) {
        $this->collection = $db->users;
    }

    public function register(string $username, string $password): array {
        // Verificar si el usuario ya existe
        $existingUser = $this->collection->findOne(['username' => $username]);
        if ($existingUser) {
            return ['status' => false, 'error' => 'El nombre de usuario ya está en uso'];
        }

        // Hasheo seguro nativo de PHP
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // Documento a insertar
        $document = [
            'username'   => $username,
            'password'   => $hashedPassword,
            'role'       => 'member',
            'created_at' => new UTCDateTime()
        ];

        $result = $this->collection->insertOne($document);

        return [
            'status' => true,
            'id'     => (string) $result->getInsertedId()
        ];
    }

    public function findByUsername(string $username) {
        return $this->collection->findOne(['username' => $username]);
    }
}