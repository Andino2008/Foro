# 📋 DOCUMENTACIÓN TÉCNICA Y GESTIÓN DE PROYECTO
## Proyecto: **ForoPrueba2002 - Plataforma Comunitaria Retro con Persistencia NoSQL y Supervivencia Gamificada**

---

### 📌 FICHA TÉCNICA DEL PROYECTO
* **Nombre del Sistema:** ForoPrueba2002 (Mini 4chan / vBulletin Engine)
* **Líder de Proyecto & Desarrollador:** Enzo Andino
* **Área / Especialidad:** Programación Web, Arquitectura de Software y Bases de Datos
* **Estado Actual:** Versión 1.0 - Desplegada en Producción y Operativa en la Nube
* **Repositorio de Código:** `https://github.com/Andino2008/Foro`
* **Acceso Público en la Nube:** Desplegado mediante contenedores Docker en Render y base de datos distribuida en MongoDB Atlas.

---

## 1. 🎯 OBJETIVO

### 1.1 Objetivo General
Diseñar, programar e implementar desde cero una plataforma web integral de foro comunitario e interactivo con estética clásica de los años 2000 (estilo *vBulletin* y *phpBB*), sustentada sobre una arquitectura desacoplada de alto rendimiento compuesta por un **Backend en PHP nativo (API REST)** y una base de datos **NoSQL orientada a documentos (MongoDB Atlas)**, con despliegue en la nube, compatibilidad móvil total y un sistema innovador de ciclo de vida de mensajes para optimización de almacenamiento.

### 1.2 Objetivos Específicos
1. **Desarrollar una API REST robusta en PHP nativo:** Construir un enrutador central (*Single Entry Point*) que procese solicitudes asíncronas bajo el estándar HTTP, manejando respuestas estructuradas en formato JSON, control de cabeceras CORS y códigos de estado HTTP estandarizados sin depender de frameworks externos.
2. **Implementar Persistencia NoSQL con MongoDB:** Diseñar un modelo de datos documental no relacional eficiente para las colecciones de hilos y respuestas, aplicando consultas optimizadas, inserciones atómicas, ordenamiento temporal e indexación por identificadores `ObjectId`.
3. **Mecánica de Supervivencia y Auto-Purgado (*Bump Limit Gamificado*):** Desarrollar un algoritmo automatizado que controle el ciclo de vida de los temas. Cada hilo cuenta con un límite inicial de mensajes (300 msgs) que puede ser ampliado por la comunidad mediante votación colectiva (+100 msgs, hasta 3 veces). Al agotarse las extensiones y alcanzarse el tope máximo, el sistema ejecuta un purgado atómico (`deleteOne` y `deleteMany`) para evitar la saturación de espacio.
4. **Construir una Interfaz SPA (Single Page Application) Responsive:** Desarrollar el frontend utilizando HTML5 semántico, CSS3 retro con cursores temáticos y JavaScript Vanilla asíncrono (`fetch`), con un sistema de enrutamiento por hash (`#category/...`, `#thread/...`, `#profile`, `#search`), garantizando una experiencia fluida sin recargas de página y con adaptabilidad táctil para smartphones y tablets.
5. **Privacidad y Perfiles Descentralizados:** Implementar una gestión de identidad local por dispositivo mediante `localStorage`, permitiendo que cada usuario defina su propio alias y rango sin necesidad de contraseñas complejas, pre-llenando automáticamente sus datos en los formularios de publicación.
6. **Despliegue Continuo (CI/CD) y Seguridad en la Nube:** Contenedorizar la aplicación utilizando **Docker**, configurar la integración automática con **GitHub** hacia **Render.com** y proteger las credenciales de acceso a la base de datos mediante variables de entorno seguras (`MONGODB_URI`).

---

## 2. 📖 DESCRIPCIÓN DEL SISTEMA

### 2.1 Visión General
*ForoPrueba2002* es una plataforma de debate y discusión temática que combina la nostalgia visual de la época dorada de internet (principios del 2000) con las tecnologías y estándares de desarrollo web contemporáneos. La plataforma permite a los usuarios navegar por diferentes categorías temáticas (*Charla General*, *Tecnología & Hardware*, *Videojuegos & Emulación*), crear nuevos temas de debate, responder en tiempo real a publicaciones existentes, buscar contenidos por palabras clave y salvar hilos valiosos del borrado mediante votaciones comunitarias.

```
+-------------------------------------------------------------------------+
|                              ARQUITECTURA WEB                           |
+-------------------------------------------------------------------------+
|                                                                         |
|   [ Navegador Web / Smartphone ]                                        |
|         │                                                               |
|         │ (HTTP GET/POST - Formato JSON)                                |
|         ▼                                                               |
|   [ Frontend SPA: HTML5 + CSS Retro + JavaScript Vanilla ]              |
|         │                                                               |
|         │ (Llamadas asíncronas con fetch API)                           |
|         ▼                                                               |
|   [ Backend API REST: PHP 8.2+ en Contenedor Docker (Render) ]          |
|         │                                                               |
|         │ (Driver Oficial MongoDB PHP / Protocolo Seguro TLS)           |
|         ▼                                                               |
|   [ Base de Datos NoSQL: MongoDB Atlas Cluster M0 (Nube) ]             |
|         ├── Colección 'hilos' (Temas principales y límites)            |
|         └── Colección 'respuestas' (Comentarios vinculados)            |
+-------------------------------------------------------------------------+
```

### 2.2 Componentes Técnicos Principales

#### A. Backend & Enrutador REST (`public/index.php`)
* **Arquitectura:** Patrón *Front Controller* (Punto de entrada único). Todas las solicitudes entrantes son interceptadas y canalizadas según el método HTTP (`GET`, `POST`) y la ruta solicitada.
* **Manejo de Respuestas:** Respuestas en formato JSON con cabeceras `Content-Type: application/json; charset=UTF-8` y `Access-Control-Allow-Origin: *` para garantizar comunicación sin bloqueos de seguridad.
* **Endpoints Implementados:**
  * `GET /`: Entrega la interfaz gráfica principal (`index.html`).
  * `GET /api/forum`: Devuelve las categorías disponibles y estadísticas globales de la comunidad.
  * `GET /api/category/{id}`: Lista los hilos de una categoría ordenados cronológicamente.
  * `POST /api/threads`: Inserta un nuevo tema principal en MongoDB inicializando contadores y límites.
  * `GET /api/thread/{id}`: Obtiene el hilo original junto a todas sus respuestas asociadas y estado de supervivencia.
  * `POST /api/thread/{id}/reply`: Registra una nueva respuesta, incrementa el contador y evalúa si se debe ejecutar el auto-purgado.
  * `POST /api/thread/{id}/extender`: Registra votos comunitarios para ampliar el límite de mensajes del hilo (+100 msgs).
  * `GET /api/search?q={query}`: Realiza búsquedas de texto mediante expresiones regulares (*Regex* insensible a mayúsculas/minúsculas).

#### B. Capa de Datos NoSQL (`config/database.php`)
* **Patrón de Diseño Singleton:** Garantiza la apertura de una única instancia de conexión hacia el cluster de MongoDB, reutilizándola en cada petición para no agotar la memoria ni las conexiones del servidor.
* **Colecciones Documentales:**
  * `hilos`: Almacena el `titulo`, `contenido`, `autor`, `category_id`, `fecha`, `limite_mensajes`, `extensiones_usadas` y `votos_extension`.
  * `respuestas`: Almacena el `comentario`, `autor`, `fecha` y `id_hilo` (como referencia `ObjectId` al tema padre).

#### C. Lógica de Supervivencia y Auto-Purgado
* **Control de Capacidad:** Los servicios gratuitos de almacenamiento en la nube poseen límites de cuota fija. Para resolver este desafío técnico sin intervención manual de administradores, se creó un sistema de reciclaje dinámico:
  1. Cada hilo nuevo se crea con un límite máximo de **300 mensajes**.
  2. En la vista del hilo, se presenta un panel lateral de votación. Al reunir **3 votos de usuarios distintos**, el límite se incrementa en **+100 mensajes** (hasta un tope de 3 extensiones = 600 mensajes totales).
  3. Si un hilo alcanza su límite definitivo y ya consumió sus 3 extensiones, al recibir el siguiente mensaje se ejecutan las operaciones de borrado atómico en MongoDB:
     ```php
     $coleccionHilos->deleteOne(['_id' => new ObjectId($threadId)]);
     $coleccionRespuestas->deleteMany(['id_hilo' => new ObjectId($threadId)]);
     ```
  4. La interfaz de usuario retroalimenta el evento con efectos visuales dinámicos de confeti y alertas informativas sin bloquear la pantalla.

#### D. Frontend SPA y Experiencia Responsive (`forum.js` & `classic.css`)
* **Enrutamiento por Hash:** Permite navegar fluidamente entre categorías, hilos y búsquedas sin recargar la página web.
* **Diseño Retro 2002:** Paleta de colores inspirada en foros clásicos (*vBulletin/phpBB*), botones con biselado clásico, marcos delimitados y cursores SVG pixelados de Windows 98.
* **Adaptabilidad Móvil (Responsive):** Media queries completas (`@media (max-width: 768px)`) que reorganizan la barra lateral de votación, convierten tablas en tarjetas táctiles y apilan el formulario de respuestas para una experiencia perfecta en pantallas táctiles.
* **Gestión de Identidad Local (`localStorage`):** Cada dispositivo genera un perfil anónimo único (ej: `Anon_7392`) que el usuario puede personalizar desde la sección "Mi Perfil" con su alias y rango, autorellenando los campos de autor automáticamente.

---

## 3. 📅 CRONOGRAMA DE TRABAJO

El proyecto fue ejecutado a lo largo de **tres semanas de desarrollo intensivo**, resolviendo complejidades de infraestructura, programación nativa y diseño responsivo, con una proyección de **dos semanas adicionales** destinadas a control de calidad y presentación final.

```
LÍNEA DE TIEMPO DEL PROYECTO (5 SEMANAS TOTALES)
[Semana 1] ───► [Semana 2] ───► [Semana 3] ───► [Semana 4] ───► [Semana 5]
  Análisis &      Backend &       Frontend,       Pruebas Beta    Optimización
 Arquitectura    Persistencia     Cloud & CI/CD   & Monitoreo    & Presentación
 (COMPLETADO)    (COMPLETADO)     (COMPLETADO)    (EN CURSO)      (A FUTURO)
```

### 3.1 Etapa Ejecutada (Semanas 1 a 3 - Desarrollo Completo)

#### 🔹 Semana 1: Planificación, Arquitectura y Conexión de Datos
* **Definición de Requerimientos:** Análisis de las necesidades de la comunidad escolar, elección del stack tecnológico (PHP nativo sin frameworks para mayor comprensión del código, base de datos NoSQL MongoDB por su flexibilidad documental).
* **Diseño de Modelos Documentales:** Estructuración de los esquemas de documentos para hilos y respuestas, definiendo tipos de datos, relaciones por `ObjectId` y campos de control de vida útil.
* **Entorno de Desarrollo y Dependencias:** Configuración de PHP 8.2+, gestor de paquetes Composer, instalación y compilación del driver oficial `mongodb/mongodb`.
* **Desafíos Técnicos Superados:** Resolución de incompatibilidades de extensiones C en Windows mediante la configuración precisa del archivo `php.ini` y creación de la clase de conexión Singleton con control de excepciones.

#### 🔹 Semana 2: Desarrollo del Backend REST y Lógica de Negocio
* **Implementación del Router REST:** Construcción del motor de rutas centralizado en `public/index.php` con soporte para métodos HTTP (`GET`, `POST`, `OPTIONS`) y decodificación de payloads JSON.
* **Endpoints de Navegación y Publicación:** Creación de controladores para listar categorías, obtener hilos paginados y persistir temas nuevos en la base de datos.
* **Algoritmo de Supervivencia y Auto-Purgado:** Programación de la lógica matemática de conteo de mensajes, acumulación de votos comunitarios (`votos_extension`), incremento condicional de límites y ejecución segura de borrados en cascada (`deleteOne` y `deleteMany`).
* **Módulo de Búsqueda:** Integración del buscador por palabras clave utilizando operadores de expresión regular (`$regex`) insensibles a mayúsculas sobre los campos de título y contenido.

#### 🔹 Semana 3: Frontend SPA, Responsividad Móvil, Despliegue en la Nube y Seguridad
* **Maquetación Retro y SPA:** Diseño de la estructura visual clásica (`classic.css`) y programación del controlador de interfaz `public/js/forum.js` con navegación por fragmentos hash y consumo asíncrono con `fetch`.
* **Diseño Adaptativo Móvil:** Implementación de reglas `@media` para pantallas táctiles, transformando la grilla de dos columnas en una disposición vertical accesible desde celulares.
* **Sistema de Perfiles Independiente:** Desarrollo del módulo `localStorage` para almacenamiento de identidad en el navegador del cliente, evitando colisiones de nombres entre diferentes usuarios.
* **Contenedorización y Despliegue Cloud (DevOps):** Creación del archivo `Dockerfile` optimizado con compilación de dependencias PECL (`php-mongodb`), conexión con el repositorio en **GitHub** y despliegue automatizado en **Render.com**.
* **Migración a Base de Datos Distribuida:** Conexión del backend con el cluster en la nube **MongoDB Atlas**, verificación de latencias y migración de datos.
* **Auditoría de Seguridad y Sanitización:** Detección y corrección de credenciales mediante variables de entorno del sistema (`MONGODB_URI`), protección con `.gitignore` y sanitización contra inyecciones XSS en el cliente.

---

### 3.2 Etapa Futura Proyectada (Semanas 4 y 5 - Cierre y Evaluación)

#### 🔹 Semana 4: Pruebas de Estrés, Beta Testing y Moderación
* **Pruebas de Campo con Usuarios Reales:** Distribución del enlace público entre compañeros de curso para validar la estabilidad concurrente, la legibilidad en diferentes modelos de teléfonos y la persistencia de perfiles.
* **Monitoreo de Rendimiento en la Nube:** Análisis de tiempos de respuesta del contenedor en Render y consumo de operaciones de lectura/escritura (IOPS) en el cluster de MongoDB Atlas.
* **Filtro de Contenido Básico:** Incorporación de una lista de palabras vetadas o moderación básica en el backend para prevenir contenido indebido en el entorno escolar.

#### 🔹 Semana 5: Optimización Final, Documentación y Presentación
* **Indexación y Rendimiento:** Creación de índices compuestos en MongoDB (`category_id`, `fecha`) para acelerar las consultas a medida que crezca el volumen de datos.
* **Preparación del Material de Exposición:** Elaboración de diapositivas explicativas, diagramas de arquitectura y puesta a punto de la demostración interactiva en vivo frente al tribunal evaluador.
* **Cierre de Proyecto y Entrega Final:** Entrega formal del informe técnico y código fuente en el repositorio oficial.

---

## 4. 🏢 CLIENTE (COMITENTE)

### 4.1 Definición del Cliente
* **Entidad Solicitante:** Institución Educativa / Departamento de Informática y Programación.
* **Equipo Evaluador:** Profesores y directivos del área técnica a cargo de evaluar las competencias en programación web backend, administración de bases de datos, diseño de interfaces y despliegue de infraestructura.

### 4.2 Necesidades y Requerimientos del Cliente
* Demostrar la capacidad de construir una solución de software funcional e interactiva desde los cimientos (*from scratch*), sin recurrir a plantillas automáticas ni creadores de sitios prediseñados.
* Integrar conceptos fundamentales de ingeniería de software: separación de responsabilidades (Backend / Frontend / Base de Datos), consumo de APIs mediante JSON y control de versiones con Git.
* Justificar el uso de bases de datos NoSQL y resolver problemas del mundo real, como la administración de recursos y el almacenamiento limitado en entornos cloud gratuitos.

---

## 5. 👥 USUARIOS DEL SISTEMA

### 5.1 Público Objetivo
Comunidad de estudiantes, docentes y usuarios entusiastas de la informática que buscan un espacio ágil, anónimo y entretenido para debatir sobre tecnología, videojuegos y vida estudiantil.

### 5.2 Perfiles y Roles de Usuario

| Perfil de Usuario | Descripción y Atribuciones |
|---|---|
| **Usuario Visitante / Lector** | Puede ingresar desde cualquier navegador o celular, leer todos los hilos públicos de las categorías, utilizar el motor de búsqueda y ver las estadísticas generales del foro sin necesidad de registro previo. |
| **Usuario Participante (Miembro)** | Puede publicar nuevos temas (hilos), responder a debates existentes, votar en tiempo real para extender la vida útil de los temas y personalizar su alias público y rango personal desde su propio dispositivo. |
| **Creador del Hilo (*OP - Original Poster*)** | Usuario que origina un debate. Su mensaje se destaca visualmente en la cabecera del hilo con un formato distintivo respecto a las respuestas secundarias. |
| **Administrador del Sistema** | Rol técnico encargado de supervisar el estado del servidor en Render, auditar el cluster en MongoDB Atlas, verificar los registros de error y gestionar las variables de entorno. |

---

## 6. 🛠️ RECURSOS UTILIZADOS

### 6.1 Recursos Humanos

* **Líder de Proyecto & Desarrollador Full-Stack (Enzo Andino):**
  * Responsable de la concepción de la idea, diseño de la arquitectura y redacción del código en PHP nativo.
  * Diseño del frontend en HTML5/CSS3 y programación de la interactividad en JavaScript Vanilla.
  * Modelado de datos en MongoDB, configuración de índices y consultas.
  * Configuración de Docker, control de versiones en GitHub y despliegue en la nube en Render y MongoDB Atlas.
* **Equipo Docente / Asesor Técnico:**
  * Supervisión pedagógica, definición de pautas de evaluación y validación de requerimientos académicos.
* **Equipo de Pruebas (Beta Testers - Compañeros de Clase):**
  * Pruebas de usabilidad en entornos heterogéneos (diferentes sistemas operativos, tamaños de pantalla y velocidades de conexión).

---

### 6.2 Recursos Materiales, Tecnológicos y de Infraestructura

#### A. Hardware y Equipamiento
* Computadoras personales de desarrollo (Procesadores x64, 8GB+ RAM, SO Windows 10/11).
* Dispositivos móviles inteligentes (Android / iOS) utilizados como terminales de prueba para verificación responsive y táctil.
* Conexión a internet de banda ancha para sincronización de repositorios y despliegue en servicios cloud.

#### B. Software de Desarrollo y Herramientas
* **Entornos de Desarrollo:** Visual Studio Code con extensiones para PHP, JavaScript y Docker.
* **Control de Versiones:** Git (CLI) y GitHub como plataforma de alojamiento de código y control de cambios.
* **Herramientas de Base de Datos:** MongoDB Compass (interfaz gráfica para administración de colecciones e inspección de documentos) y MongoDB Shell (`mongosh`).
* **Gestor de Dependencias:** Composer para la integración de librerías oficiales de PHP.
* **Navegadores Web de Prueba:** Google Chrome, Mozilla Firefox y navegadores móviles integrados (Chrome Mobile, Safari iOS).

#### C. Infraestructura Cloud y Servicios en la Nube
* **Motor de Base de Datos:** **MongoDB Atlas** (Cluster M0 compartido en la nube, con cifrado TLS/SSL y alta disponibilidad 24/7).
* **Plataforma de Alojamiento Web (Hosting):** **Render.com** (Servicio Web basado en contenedores Docker ejecutando un entorno Linux con PHP CLI y extensiones compiladas).
* **Contenedorización:** **Docker Engine** para empaquetar el código, la configuración del servidor y las dependencias en una imagen reproducible y portátil.
* **Seguridad:** Sistema de escaneo de secretos de GitHub (*Secret Scanning*) y almacenamiento de credenciales mediante *Environment Variables*.

---

## 7. 💡 CONCLUSIÓN Y APRENDIZAJES CLAVE

El desarrollo de *ForoPrueba2002* representó un desafío técnico de gran valor educativo. A lo largo de estas semanas de trabajo se logró transformar una idea conceptual en una plataforma web totalmente funcional, pública y moderna en su funcionamiento interno, preservando una estética clásica retro.

Entre los principales aprendizajes consolidados se destacan:
1. La comprensión profunda de cómo opera el protocolo HTTP y la construcción manual de una **API REST en PHP sin dependencias de frameworks**, entendiendo la manipulación de cabeceras, rutas y formatos de datos JSON.
2. La aplicación práctica de **Bases de Datos NoSQL con MongoDB**, comprendiendo las ventajas de los documentos flexibles frente a las tablas relacionales tradicionales y la importancia del uso de patrones de diseño como el *Singleton*.
3. La resolución de problemas de ingeniería reales, tales como el diseño de un algoritmo de **purgado automático** para optimizar el almacenamiento gratuito y la adaptación de interfaces complejas a **dispositivos móviles**.
4. El dominio del flujo de trabajo moderno en la nube (**Docker, GitHub, CI/CD, Variables de Entorno y Hosting Cloud**), preparando las bases para futuros proyectos de software a escala profesional.

---
*Documento redactado y estructurado para su consulta, edición y presentación académica.*
