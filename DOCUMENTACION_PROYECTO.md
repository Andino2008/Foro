# 📋 DOCUMENTACIÓN TÉCNICA Y GESTIÓN DE PROYECTO
## Proyecto: **ForoPrueba2002 - Plataforma Comunitaria Retro con Persistencia NoSQL y Supervivencia Gamificada**

---

### 📌 FICHA TÉCNICA DEL PROYECTO
* **Nombre del Sistema:** ForoPrueba2002 (Mini 4chan / vBulletin Engine)
* **Área / Especialidad:** Programación Web, Arquitectura de Software y Bases de Datos
* **Estado Actual:** Versión 1.0 - Desplegada en Producción y Operativa en la Nube
* **Repositorio de Código:** `https://github.com/Andino2008/Foro`
* **Acceso Público en la Nube:** Desplegado mediante contenedores Docker en Render y base de datos distribuida en MongoDB Atlas.

#### 👥 Equipo de Desarrollo y Roles:
* 👑 **Líder del Proyecto:** Enzo
* ⚙️ **Desarrollador Backend:** Enzo
* 🌐 **Desarrolladores Frontend:** Iván y Enzo
* 🎨 **Desarrollador de HUD (Interfaz / UI / Estilos Retro):** Ignacio
* 🔍 **Testeador Principal (QA / Control de Calidad):** Ortiz

---

## 1. 🎯 OBJETIVO

### 1.1 Objetivo General
Diseñar, programar e implementar en equipo una plataforma web integral de foro comunitario e interactivo con estética clásica de los años 2000 (estilo *vBulletin* y *phpBB*), sustentada sobre una arquitectura desacoplada de alto rendimiento compuesta por un **Backend en PHP nativo (API REST)** y una base de datos **NoSQL orientada a documentos (MongoDB Atlas)**, con despliegue en la nube, compatibilidad móvil total y un sistema innovador de ciclo de vida de mensajes para optimización de almacenamiento.

### 1.2 Objetivos Específicos
1. **Desarrollar una API REST robusta en PHP nativo (Backend - Enzo):** Construir un enrutador central (*Single Entry Point*) que procese solicitudes asíncronas bajo el estándar HTTP, manejando respuestas estructuradas en formato JSON, control de cabeceras CORS y códigos de estado HTTP estandarizados sin depender de frameworks externos.
2. **Implementar Persistencia NoSQL con MongoDB (Backend - Enzo):** Diseñar un modelo de datos documental no relacional eficiente para las colecciones de hilos y respuestas, aplicando consultas optimizadas, inserciones atómicas, ordenamiento temporal e indexación por identificadores `ObjectId`.
3. **Mecánica de Supervivencia y Auto-Purgado (*Bump Limit Gamificado* - Backend/Frontend):** Desarrollar un algoritmo automatizado que controle el ciclo de vida de los temas. Cada hilo cuenta con un límite inicial de mensajes (300 msgs) que puede ser ampliado por la comunidad mediante votación colectiva (+100 msgs, hasta 3 veces). Al agotarse las extensiones y alcanzarse el tope máximo, el sistema ejecuta un purgado atómico (`deleteOne` y `deleteMany`) para evitar la saturación de espacio.
4. **Diseñar el HUD y Maquetación Retro (HUD/UI - Ignacio):** Crear la identidad visual inspirada en el año 2002 con paleta retro, fuentes clásicas, ventanas temáticas, cursores SVG pixelados de Windows 98 y diseño adaptable mediante CSS3 para computadoras y celulares.
5. **Construir una Interfaz SPA Responsive (Frontend - Iván y Enzo):** Desarrollar el frontend interactivo en JavaScript Vanilla asíncrono (`fetch`), con un sistema de enrutamiento por hash (`#category/...`, `#thread/...`, `#profile`, `#search`), garantizando fluidez sin recargas de página.
6. **Privacidad y Perfiles Descentralizados (Frontend - Iván y Enzo):** Implementar una gestión de identidad local por dispositivo mediante `localStorage`, permitiendo que cada usuario defina su propio alias y rango sin necesidad de contraseñas complejas, pre-llenando automáticamente sus datos en los formularios.
7. **Testing, Control de Calidad y Pruebas de Campo (QA - Ortiz):** Ejecutar pruebas continuas de usabilidad, validación de formularios, detección de errores en dispositivos móviles y verificación de integridad de datos en la nube.
8. **Despliegue Continuo (CI/CD) y Seguridad (DevOps - Enzo):** Contenedorizar la aplicación utilizando **Docker**, configurar la integración automática con **GitHub** hacia **Render.com** y proteger las credenciales de acceso a la base de datos mediante variables de entorno seguras (`MONGODB_URI`).

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
|   [ Frontend SPA: HTML5 + CSS Retro (Ignacio) + JS (Iván/Enzo) ]        |
|         │                                                               |
|         │ (Llamadas asíncronas con fetch API)                           |
|         ▼                                                               |
|   [ Backend API REST: PHP 8.2+ en Contenedor Docker (Enzo) ]            |
|         │                                                               |
|         │ (Driver Oficial MongoDB PHP / Protocolo Seguro TLS)           |
|         ▼                                                               |
|   [ Base de Datos NoSQL: MongoDB Atlas Cluster M0 (Nube) ]             |
|         ├── Colección 'hilos' (Temas principales y límites)            |
|         └── Colección 'respuestas' (Comentarios vinculados)            |
|                                                                         |
|   [ Control de Calidad & Pruebas en Vivo: Ortiz ]                       |
+-------------------------------------------------------------------------+
```

### 2.2 Componentes Técnicos Principales

#### A. Backend & Enrutador REST (`public/index.php`) — *Responsable: Enzo*
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

#### B. Capa de Datos NoSQL (`config/database.php`) — *Responsable: Enzo*
* **Patrón de Diseño Singleton:** Garantiza la apertura de una única instancia de conexión hacia el cluster de MongoDB Atlas, reutilizándola en cada petición para no agotar la memoria ni las conexiones del servidor.
* **Colecciones Documentales:**
  * `hilos`: Almacena el `titulo`, `contenido`, `autor`, `category_id`, `fecha`, `limite_mensajes`, `extensiones_usadas` y `votos_extension`.
  * `respuestas`: Almacena el `comentario`, `autor`, `fecha` y `id_hilo` (como referencia `ObjectId` al tema padre).

#### C. Lógica de Supervivencia y Auto-Purgado — *Responsables: Enzo, Iván e Ignacio*
* **Control de Capacidad:** Los servicios gratuitos de almacenamiento en la nube poseen límites de cuota fija. Para resolver este desafío técnico sin intervención manual de administradores, el equipo ideó un sistema de reciclaje dinámico:
  1. Cada hilo nuevo nace con un límite máximo de **300 mensajes**.
  2. En la vista del hilo, se presenta un panel lateral de votación. Al reunir **3 votos de usuarios distintos**, el límite se incrementa en **+100 mensajes** (hasta un tope de 3 extensiones = 600 mensajes totales).
  3. Si un hilo alcanza su límite definitivo y ya consumió sus 3 extensiones, al recibir el siguiente mensaje se ejecutan las operaciones de borrado atómico en MongoDB:
     ```php
     $coleccionHilos->deleteOne(['_id' => new ObjectId($threadId)]);
     $coleccionRespuestas->deleteMany(['id_hilo' => new ObjectId($threadId)]);
     ```
  4. La interfaz visual (diseñada por Ignacio) retroalimenta el evento con efectos visuales dinámicos de confeti y alertas toast no invasivas.

#### D. Diseño del HUD y Estilos Retro (`classic.css`) — *Responsable: Ignacio*
* **Estética Retro 2002:** Paleta de colores inspirada en foros clásicos (*vBulletin/phpBB*), tablas con cabeceras degradadas azuladas, marcos biselados, tipografía Verdana clásica y cursores SVG pixelados al estilo Windows 98.
* **Maquetación Adaptable (Responsive):** Reglas CSS completas (`@media (max-width: 768px)`) que reorganizan la barra lateral de votación, apilan los formularios y adaptan la navegación táctil para celulares.

#### E. Frontend SPA y Lógica de Cliente (`forum.js`) — *Responsables: Iván y Enzo*
* **Enrutamiento por Hash:** Navegación instantánea entre categorías, hilos y búsquedas (`#home`, `#category/...`, `#thread/...`, `#profile`) mediante JavaScript asíncrono con `fetch`.
* **Gestión de Identidad Local (`localStorage`):** Cada dispositivo genera y almacena un perfil propio (ej: `Anon_7392`), permitiendo a los usuarios editar su nick y rango desde "Mi Perfil", con autorelleno automático en los formularios de publicación.

#### F. Control de Calidad y Testing Móvil — *Responsable: Ortiz*
* Verificación de consistencia visual en navegadores de escritorio y smartphones reales (Android / iOS).
* Pruebas de estrés enviando múltiples respuestas consecutivas para validar el comportamiento del auto-purgado en MongoDB.
* Reporte y seguimiento de errores de interfaz y usabilidad.

---

## 3. 📅 CRONOGRAMA DE TRABAJO (5 SEMANAS TOTALES)

El proyecto demandó **tres semanas de trabajo intensivo en equipo**, donde cada integrante asumió responsabilidades clave para superar dificultades técnicas de backend, base de datos, maquetación y control de calidad, con una proyección de **dos semanas adicionales** para pruebas finales y exposición.

```
LÍNEA DE TIEMPO DEL PROYECTO (5 SEMANAS TOTALES)
[Semana 1] ───► [Semana 2] ───► [Semana 3] ───► [Semana 4] ───► [Semana 5]
  Análisis &      Backend &       Frontend,       Pruebas Beta    Optimización
 Arquitectura    Persistencia     HUD & Cloud     & Moderación    & Presentación
 (COMPLETADO)    (COMPLETADO)     (COMPLETADO)    (EN CURSO)      (A FUTURO)
```

### 3.1 Etapa Ejecutada (Semanas 1 a 3 - Desarrollo Completo)

#### 🔹 Semana 1: Planificación, Arquitectura y Conexión de Datos
* **Coordinación y Requerimientos (Líder: Enzo):** Definición de la arquitectura desacoplada y distribución de tareas en el equipo.
* **Modelado de Datos NoSQL (Enzo):** Diseño de la estructura documental en MongoDB (`hilos` y `respuestas`), relaciones por `ObjectId` y campos de conteo.
* **Prototipado del HUD (Ignacio):** Bocetos iniciales de la estética retro de los 2000s y esquema de tablas para la interfaz.
* **Configuración del Entorno (Enzo e Iván):** Instalación de PHP 8.2+, Composer, driver oficial de MongoDB y resolución de problemas de extensiones en Windows mediante configuración de `php.ini`.
* **Testing Inicial (Ortiz):** Verificación de lectura y escritura local en MongoDB Community Server.

#### 🔹 Semana 2: Desarrollo del Backend REST y Lógica de Negocio
* **Router REST & Endpoints (Enzo):** Programación del enrutador central en `public/index.php` con manejo de métodos HTTP (`GET`, `POST`) y codificación JSON.
* **Algoritmo de Supervivencia (Enzo e Iván):** Implementación de la lógica de votación comunitaria (+100 msgs) y purgado automático en MongoDB (`deleteOne` y `deleteMany`).
* **Maquetación Base de la Interfaz (Ignacio):** Construcción de los estilos en `classic.css`, diseño de tablas, banners temáticos y cursores SVG.
* **Buscador por Palabras Clave (Enzo):** Creación del endpoint de búsqueda con expresiones regulares (*Regex*).
* **Pruebas de Backend (Ortiz):** Validación de endpoints con herramientas de prueba y control de respuestas de error.

#### 🔹 Semana 3: Frontend SPA, Responsividad Móvil, Despliegue Cloud y Seguridad
* **Desarrollo del Frontend SPA (Iván y Enzo):** Implementación de `public/js/forum.js` con Hash Routing y consumo asíncrono vía `fetch`.
* **Adaptabilidad Móvil del HUD (Ignacio y Ortiz):** Ajuste de media queries para transformar la grilla de dos columnas en una sola columna táctil para celulares.
* **Sistema de Perfiles Independientes (Iván y Enzo):** Desarrollo del módulo `localStorage` para almacenamiento de identidad por dispositivo y autorelleno de autor.
* **Despliegue Cloud & DevOps (Enzo):** Creación del `Dockerfile`, integración continua (CI/CD) con GitHub y despliegue en **Render.com** conectado a **MongoDB Atlas**.
* **Auditoría de Seguridad (Enzo):** Detección y corrección de credenciales mediante variables de entorno del sistema (`MONGODB_URI`), configuración de `.gitignore` y sanitización contra inyecciones XSS.
* **Pruebas Integrales de Campo (Ortiz):** Pruebas de usabilidad en celulares reales de distintos integrantes, detectando y validando la corrección de errores de identidad y visualización.

---

### 3.2 Etapa Futura Proyectada (Semanas 4 y 5 - Cierre y Evaluación)

#### 🔹 Semana 4: Pruebas Masivas, Beta Testing y Moderación
* **Pruebas de Estrés con Usuarios Reales (Ortiz y Equipo):** Distribución del enlace público entre compañeros de clase para evaluar la concurrencia en Render y MongoDB Atlas.
* **Mejoras Visuales y HUD (Ignacio):** Pulido de microinteracciones, avisos visuales adicionales y compatibilidad cross-browser.
* **Módulo de Moderación Básica (Enzo e Iván):** Incorporación de filtrado básico de palabras en el backend para resguardar las normas de convivencia escolar.

#### 🔹 Semana 5: Optimización Final, Documentación y Presentación
* **Optimización de Índices (Enzo):** Creación de índices compuestos en MongoDB (`category_id`, `fecha`) para acelerar búsquedas y consultas.
* **Armado de la Presentación (Todo el Equipo):** Elaboración de diapositivas técnicas, diagramas de arquitectura y preparación de la demostración en vivo.
* **Defensa del Proyecto:** Exposición formal del sistema frente al cuerpo docente evaluador.

---

## 4. 🏢 CLIENTE (COMITENTE)

### 4.1 Definición del Cliente
* **Entidad Solicitante:** Institución Educativa / Departamento de Informática y Programación.
* **Equipo Evaluador:** Profesores y directivos del área técnica a cargo de evaluar las competencias del grupo en programación backend, bases de datos NoSQL, diseño de interfaces y despliegue de infraestructura.

### 4.2 Necesidades y Requerimientos del Cliente
* Demostrar la capacidad de construir una solución de software funcional e interactiva desde los cimientos (*from scratch*), trabajando en equipo y aplicando buenas prácticas de desarrollo.
* Integrar conceptos fundamentales: arquitectura en capas (Backend / Frontend / Base de Datos), consumo de APIs mediante JSON y control de versiones con Git.
* Justificar el uso de bases de datos NoSQL y resolver problemas del mundo real, como la optimización de cuotas de almacenamiento en la nube.

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

### 6.1 Recursos Humanos (Equipo de Proyecto)

* 👑 **Enzo (Líder de Proyecto & Desarrollador Backend):**
  * Coordinación general del proyecto y planificación de requerimientos.
  * Arquitectura del backend en PHP nativo (API REST) y conexión Singleton a MongoDB Atlas.
  * Lógica de supervivencia y algoritmo de auto-purgado (`deleteOne` / `deleteMany`).
  * Contenedorización con Docker, integración con GitHub y despliegue en Render.com.
  * Co-desarrollo de la lógica SPA en JavaScript y seguridad de variables de entorno.

* 🌐 **Iván (Desarrollador Frontend):**
  * Desarrollo de la lógica del cliente en JavaScript Vanilla (`public/js/forum.js`).
  * Implementación del enrutamiento por hash (`#home`, `#category/...`, `#thread/...`, `#profile`).
  * Integración de llamadas asíncronas con `fetch` hacia los endpoints de la API de PHP.
  * Implementación del sistema de perfiles descentralizados y persistencia en `localStorage`.

* 🎨 **Ignacio (Desarrollador de HUD & UI):**
  * Diseño de la interfaz de usuario (HUD) y maquetación visual completa en `classic.css`.
  * Creación de la identidad visual retro inspirada en los foros de 2002 (*vBulletin/phpBB*).
  * Diseño e integración de cursores SVG pixelados temáticos de Windows 98.
  * Maquetación responsive adaptable para dispositivos móviles y tablets mediante media queries.

* 🔍 **Ortiz (Testeador Principal / QA):**
  * Planificación y ejecución de pruebas de estrés y validación funcional del sistema.
  * Control de calidad en dispositivos móviles reales (Android / iOS), evaluando legibilidad y respuesta táctil.
  * Detección y reporte de fallos de interfaz, usabilidad y persistencia de perfiles.
  * Validación del flujo de auto-purgado y votaciones comunitarias en tiempo real.

* 🎓 **Equipo Docente / Asesor Técnico:**
  * Supervisión pedagógica, definición de pautas de evaluación y validación de requerimientos académicos.

---

### 6.2 Recursos Materiales, Tecnológicos y de Infraestructura

#### A. Hardware y Equipamiento
* Computadoras personales de desarrollo (Procesadores x64, 8GB+ RAM, SO Windows 10/11).
* Dispositivos móviles inteligentes (Android / iOS) utilizados por el equipo de QA para pruebas de campo.
* Conexión a internet de banda ancha para sincronización de repositorios y despliegue en servicios cloud.

#### B. Software de Desarrollo y Herramientas
* **Entornos de Desarrollo:** Visual Studio Code con extensiones para PHP, JavaScript y Docker.
* **Control de Versiones:** Git (CLI) y GitHub como plataforma de alojamiento de código, trabajo colaborativo y control de cambios.
* **Herramientas de Base de Datos:** MongoDB Compass (interfaz gráfica para administración de colecciones e inspección de documentos) y MongoDB Shell (`mongosh`).
* **Gestor de Dependencias:** Composer para la integración de librerías oficiales de PHP.
* **Navegadores Web de Prueba:** Google Chrome, Mozilla Firefox, Safari iOS y Chrome Mobile.

#### C. Infraestructura Cloud y Servicios en la Nube
* **Motor de Base de Datos:** **MongoDB Atlas** (Cluster M0 compartido en la nube, con cifrado TLS/SSL y alta disponibilidad 24/7).
* **Plataforma de Alojamiento Web (Hosting):** **Render.com** (Servicio Web basado en contenedores Docker ejecutando un entorno Linux con PHP CLI y extensiones compiladas).
* **Contenedorización:** **Docker Engine** para empaquetar el código, la configuración del servidor y las dependencias en una imagen reproducible y portátil.
* **Seguridad:** Sistema de escaneo de secretos de GitHub (*Secret Scanning*) y almacenamiento de credenciales mediante *Environment Variables*.

---

## 7. 💡 CONCLUSIÓN Y APRENDIZAJES CLAVE

El desarrollo de *ForoPrueba2002* representó un desafío técnico de gran valor formativo para todo el equipo. A lo largo de estas semanas de trabajo colaborativo se logró transformar una idea conceptual en una plataforma web totalmente funcional, pública y moderna en su funcionamiento interno, preservando una estética clásica retro.

Entre los principales aprendizajes consolidados se destacan:
1. El valor del **trabajo en equipo y la división de roles** (Backend, Frontend, HUD y Testing), permitiendo abordar un proyecto complejo de forma ordenada y eficiente.
2. La comprensión profunda de cómo opera el protocolo HTTP y la construcción manual de una **API REST en PHP sin dependencias de frameworks**, entendiendo la manipulación de cabeceras, rutas y formatos de datos JSON.
3. La aplicación práctica de **Bases de Datos NoSQL con MongoDB**, comprendiendo las ventajas de los documentos flexibles frente a las tablas relacionales tradicionales y la importancia del uso de patrones de diseño como el *Singleton*.
4. La resolución de problemas de ingeniería reales, tales como el diseño de un algoritmo de **purgado automático** para optimizar el almacenamiento gratuito y la adaptación de interfaces complejas a **dispositivos móviles**.
5. El dominio del flujo de trabajo moderno en la nube (**Docker, GitHub, CI/CD, Variables de Entorno y Hosting Cloud**), preparando al equipo para futuros desafíos en el desarrollo de software profesional.

---
*Documento redactado y estructurado para su consulta, edición y presentación académica.*
