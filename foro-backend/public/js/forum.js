// public/js/forum.js
// ==============================================================================
// 🌐 CONTROLADOR DEL FRONTEND (SPA - SINGLE PAGE APPLICATION)
// ==============================================================================
// Este archivo maneja toda la interacción en el navegador sin recargar la página:
// 1. Escucha cambios en la URL con '#...' (hash routing).
// 2. Hace peticiones asíncronas con 'fetch()' a la API de PHP.
// 3. Dibuja dinámicamente las vistas (categorías, hilos, respuestas y efectos visuales).

document.addEventListener("DOMContentLoaded", () => {
    // 1. Al cargar la página por primera vez, leemos la ruta actual y cargamos la vista
    handleRoute();

    // 2. Escuchamos el evento 'hashchange': cada vez que cambia el '#...' en la URL
    // (ej: cuando hacés clic en una categoría o hilo), se ejecuta handleRoute sin recargar la web.
    window.addEventListener("hashchange", handleRoute);

    // 3. Configuración del buscador de la cabecera
    const btnSearch = document.getElementById("btn-search");
    if (btnSearch) {
        btnSearch.addEventListener("click", () => {
            const query = document.getElementById("search-input").value.trim();
            if (query) {
                // Redirige internamente a '#search?q=...'
                window.location.hash = `search?q=${encodeURIComponent(query)}`;
            }
        });
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                document.getElementById("btn-search").click();
            }
        });
    }

    // 4. Cargamos el panel de notificaciones del usuario
    loadUserNotifications();
});

/**
 * 🧭 ENRUTADOR DEL CLIENTE (Router en JavaScript)
 * Lee el '#...' de la URL y decide qué función invocar para dibujar la pantalla.
 */
function handleRoute() {
    const hash = window.location.hash.replace("#", "") || "home";
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");

    if (hash === "home" || hash === "") {
        if (breadcrumbExtra) breadcrumbExtra.innerHTML = "";
        loadForumHome();
    } else if (hash.startsWith("category/")) {
        // Ejemplo: '#category/general' -> catId = 'general'
        const catId = hash.split("/")[1];
        loadCategoryView(catId);
    } else if (hash.startsWith("thread/")) {
        // Ejemplo: '#thread/6aa714...' -> threadId = '6aa714...'
        const parts = hash.split("/");
        const threadId = parts[1];
        const page = parts[2] ? parseInt(parts[2]) : 1;
        loadThreadView(threadId, page);
    } else if (hash.startsWith("search?q=")) {
        const query = decodeURIComponent(hash.split("search?q=")[1]);
        loadSearchView(query);
    } else {
        loadForumHome();
    }
}

/**
 * 🏠 1. VISTA DE INICIO: Lista de Categorías y Estadísticas Generales
 * Pide datos a 'GET /api/forum' y dibuja la tabla principal.
 */
async function loadForumHome() {
    const main = document.getElementById("main-content");
    if (!main) return;
    main.innerHTML = "<p style='padding:15px;'>Cargando categorías desde MongoDB...</p>";

    try {
        // Petición a PHP
        const res = await fetch("/api/forum");
        const forum = await res.json();

        let html = `
            <table class="forum-table">
                <thead>
                    <tr>
                        <th width="60%">Categoría</th>
                        <th width="15%" style="text-align:center;">Hilos</th>
                        <th width="25%">Última Actividad</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Recorremos las categorías que nos devolvió PHP
        (forum.categories || []).forEach((cat, index) => {
            const rowClass = index % 2 === 0 ? "row1" : "row2";
            html += `
                <tr class="${rowClass}">
                    <td>
                        <a href="#category/${cat.id}" class="cat-title">${escapeHtml(cat.name)}</a>
                        <div class="sub-text">${escapeHtml(cat.description)}</div>
                    </td>
                    <td style="text-align:center;"><strong>${cat.thread_count}</strong></td>
                    <td class="sub-text">${cat.last_activity || "Sin actividad"}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>

            <div style="background:#F4F7F9; border:1px solid #A9B8C7; padding:10px; font-size:11px; margin-top:15px;">
                <strong>Estadísticas de la Comunidad:</strong><br>
                Nuestros miembros han publicado un total de <strong>${forum.stats?.total_posts || 0}</strong> mensajes en <strong>${forum.stats?.total_threads || 0}</strong> hilos.<br>
                Regla de purgado: <strong>Límite inicial de 300 msgs (ampliable hasta 3 veces por votación comunitaria)</strong>
            </div>
        `;

        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = "<p style='color:red; padding:15px;'>Error conectando con la API de PHP / MongoDB.</p>";
    }
}

/**
 * 📋 2. VISTA DE CATEGORÍA: Lista de Hilos de una categoría
 * Pide datos a 'GET /api/category/{id}' y permite abrir el formulario para crear un nuevo hilo.
 */
async function loadCategoryView(catId) {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    if (!main) return;
    main.innerHTML = "<p style='padding:15px;'>Cargando hilos...</p>";

    try {
        const res = await fetch(`/api/category/${catId}`);
        const category = await res.json();

        // Actualizamos la ruta en la barra de navegación (Breadcrumb)
        if (breadcrumbExtra) {
            breadcrumbExtra.innerHTML = ` &gt; <a href="#category/${category.id}">${escapeHtml(category.name)}</a>`;
        }

        let html = `
            <div class="thread-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h2>Categoría: ${escapeHtml(category.name)}</h2>
                    <div class="sub-text">${escapeHtml(category.description)}</div>
                </div>
                <button onclick="toggleNewThreadForm()" style="font-weight:bold; padding:6px 14px; cursor:pointer; background:#2B4E73; color:#FFF; border:1px solid #142840;">
                    ✍️ [ + Crear Nuevo Hilo ]
                </button>
            </div>

            <!-- Formulario oculto para crear nuevo tema (se despliega con el botón) -->
            <div id="new-thread-box" style="display:none; background:#E0E5E9; border:2px solid #5C7099; padding:15px; margin-bottom:15px;">
                <h3 style="margin-top:0;">📝 Publicar un nuevo Hilo</h3>
                <p>
                    <label><strong>Tu Nombre / Nick:</strong></label><br>
                    <input type="text" id="new-thread-author" placeholder="Ej: Enzo" style="width:250px;">
                </p>
                <p>
                    <label><strong>Título del Tema:</strong></label><br>
                    <input type="text" id="new-thread-title" placeholder="Escribe un título claro..." style="width:100%;">
                </p>
                <p>
                    <label><strong>Mensaje Inicial:</strong></label><br>
                    <textarea id="new-thread-content" rows="4" style="width:100%;" placeholder="Escribe el contenido de tu post..."></textarea>
                </p>
                <button onclick="submitNewThread('${catId}')" style="font-weight:bold; padding:6px 15px; background:#2B4E73; color:#FFF; cursor:pointer;">Publicar Hilo 🚀</button>
                <button onclick="toggleNewThreadForm()" style="padding:6px 12px; margin-left:10px; cursor:pointer;">Cancelar</button>
                <div id="new-thread-status" style="margin-top:8px;"></div>
            </div>

            <table class="forum-table">
                <thead>
                    <tr>
                        <th width="50%">Título del Hilo</th>
                        <th width="15%">Autor</th>
                        <th width="15%" style="text-align:center;">Mensajes / Límite</th>
                        <th width="20%">Último Mensaje</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (!category.threads || category.threads.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:25px;">No hay hilos en esta categoría todavía. ¡Sé el primero en crear uno!</td></tr>`;
        } else {
            category.threads.forEach((t, index) => {
                const rowClass = index % 2 === 0 ? "row1" : "row2";
                const autor = t.creator ? (t.creator.username || 'Anónimo') : (t.autor || 'Anónimo');
                const totalMsgs = (t.reply_count || 0) + 1;
                const limit = t.limite_mensajes || 300;
                const ext = t.extensiones_usadas || 0;

                html += `
                    <tr class="${rowClass}">
                        <td>
                            <a href="#thread/${t.id}" class="thread-title">${escapeHtml(t.title || t.titulo)}</a>
                            <div class="sub-text">Creado el ${t.created_at || t.fecha}</div>
                        </td>
                        <td class="sub-text"><strong>${escapeHtml(autor)}</strong></td>
                        <td style="text-align:center;">
                            <strong>${totalMsgs}</strong> / ${limit}
                            <div style="font-size:10px; color:#666;">(Ext: ${ext}/3)</div>
                        </td>
                        <td class="sub-text">${t.last_activity || t.fecha || 'Reciente'}</td>
                    </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
        `;

        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = "<p style='color:red; padding:15px;'>Error cargando la categoría.</p>";
    }
}

/**
 * Muestra u oculta la cajita del formulario de nuevo hilo
 */
function toggleNewThreadForm() {
    const box = document.getElementById("new-thread-box");
    if (box) {
        box.style.display = (box.style.display === "none") ? "block" : "none";
    }
}

/**
 * Envía la petición para guardar un nuevo hilo en MongoDB (POST /api/threads)
 */
async function submitNewThread(catId) {
    const title = document.getElementById("new-thread-title").value.trim();
    const content = document.getElementById("new-thread-content").value.trim();
    const author = document.getElementById("new-thread-author").value.trim() || "Anónimo";
    const status = document.getElementById("new-thread-status");

    if (!title || !content) {
        status.innerHTML = "<span style='color:red;'>El título y el mensaje son obligatorios.</span>";
        return;
    }

    status.innerHTML = "Guardando en MongoDB...";

    try {
        const res = await fetch("/api/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title,
                content: content,
                category_id: catId,
                author: author
            })
        });

        const data = await res.json();
        if (data.status) {
            status.innerHTML = "<span style='color:green;'>¡Hilo publicado con éxito!</span>";
            setTimeout(() => {
                // Redirigimos al hilo recién creado
                window.location.hash = `thread/${data.id}`;
            }, 600);
        } else {
            status.innerHTML = `<span style='color:red;'>Error: ${data.error || 'No se pudo guardar'}</span>`;
        }
    } catch (err) {
        status.innerHTML = "<span style='color:red;'>Error de conexión con el servidor.</span>";
    }
}

/**
 * 💬 3. VISTA DE HILO INDIVIDUAL
 * Dibuja la columna lateral izquierda de votación (supervivencia), el post original (OP)
 * y las respuestas indentadas más compactas con el formulario al final.
 */
async function loadThreadView(threadId, page = 1) {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    if (!main) return;
    main.innerHTML = "<p style='padding:15px;'>Cargando tema...</p>";

    try {
        const res = await fetch(`/api/thread/${threadId}?page=${page}&per_page=10`);
        const thread = await res.json();

        if (breadcrumbExtra) {
            breadcrumbExtra.innerHTML = ` &gt; <a href="#thread/${thread.id}">${escapeHtml(thread.title || thread.titulo)}</a>`;
        }

        const creatorName = thread.creator?.username || thread.autor || "Anónimo";
        const totalMsgs = thread.total_mensajes || (thread.posts ? thread.posts.length : 1);
        const limit = thread.limite_mensajes || 300;
        const ext = thread.extensiones_usadas || 0;
        const votes = thread.votos_extension || 0;
        const canExtend = ext < 3;

        let html = `
            <div class="thread-header">
                <h2>${escapeHtml(thread.title || thread.titulo)}</h2>
                <div class="sub-text">Iniciado por <strong>${escapeHtml(creatorName)}</strong> el ${thread.created_at || thread.fecha}</div>
            </div>

            <!-- CONTENEDOR DE DOS COLUMNAS -->
            <div class="thread-view-grid">
                
                <!-- COLUMNA 1 (IZQUIERDA): Panel de Votación y Supervivencia -->
                <aside class="thread-vote-sidebar">
                    <div class="sidebar-title">⚡ Votación para mantener el hilo:</div>
                    
                    <div class="stat-row">
                        Mensajes Actuales:<br>
                        <span class="stat-value" style="font-size:13px; color:#F59E0B;">${totalMsgs} / ${limit}</span>
                    </div>

                    <div class="stat-row">
                        Extensiones Usadas:<br>
                        <span class="stat-value">${ext} / 3</span>
                    </div>

                    <div class="stat-row">
                        Votos para Salvarlo:<br>
                        <span class="stat-value">${votes} / 3</span>
                    </div>

                    ${canExtend ? `
                        <button onclick="votarExtension('${thread.id}')" class="vote-btn">
                            🗳️ VOTAR EXTENSIÓN (+100)
                        </button>
                    ` : `
                        <div style="color:#FF8888; font-size:9px; margin-top:8px; text-align:center; font-weight:bold; border:1px dashed #FF4444; padding:5px;">
                            ⚠️ Límite de extensiones alcanzado. El hilo morirá al llegar a ${limit} msgs.
                        </div>
                    `}
                    <div id="extender-status" style="margin-top:8px; font-size:10px; color:#58A6FF;"></div>
                </aside>

                <!-- COLUMNA 2 (DERECHA): Flujo de Posts del Hilo -->
                <div class="thread-main-flow">
                    <div id="thread-posts-container">
        `;

        // Renderizamos los posts: el post 0 es el OP grande, el resto son respuestas hijas
        (thread.posts || []).forEach((post, index) => {
            const isOp = (index === 0);
            html += generatePostHTML(post, thread, isOp);
        });

        html += `
                    </div>

                    <!-- Formulario de Respuesta (alineado a la derecha con las respuestas) -->
                    <div class="reply-form-box">
                        <h3 style="margin-top:0; font-size:12px; color:#1E3B5E;">💬 Responder al Tema</h3>
                        <p>
                            <input type="text" id="reply-author" placeholder="Tu Nombre / Nick" style="width:200px; margin-bottom:8px; font-size:11px;">
                        </p>
                        <textarea id="reply-text" style="width:100%; height:75px; font-family: 'Verdana', sans-serif; font-size:11px; margin-bottom:10px;" placeholder="Escribe tu respuesta..."></textarea>
                        <button onclick="submitReply('${thread.id}')" style="font-weight:bold; padding:6px 18px; background:#2B4E73; color:#FFF; cursor:pointer; border:1px solid #142840;">Enviar Respuesta</button>
                        <div id="reply-status" style="display:inline-block; margin-left:10px; color:#555;"></div>
                    </div>
                </div>
            </div>
        `;

        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = "<p style='color:red; padding:15px;'>Error cargando el hilo o el hilo ya fue eliminado por límite de mensajes.</p>";
    }
}

/**
 * 🗳️ Función para votar la extensión del hilo (+100 mensajes)
 * Al llegar al 3er voto, dispara confeti y muestra el mensaje con fade-in / fade-out.
 */
async function votarExtension(threadId) {
    const statusDiv = document.getElementById("extender-status");
    if (statusDiv) statusDiv.innerHTML = "<span style='color:#A0AEC0; font-size:10px;'>Registrando voto...</span>";

    try {
        const res = await fetch(`/api/thread/${threadId}/extender`, { method: "POST" });
        const data = await res.json();

        if (data.status) {
            if (data.extendido) {
                // 🎉 ¡Extensión aprobada! Lanzamos la fiesta de confeti y el toast animado
                triggerConfetti();
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="toast-extendido">🎉 Extendido, de nada gordito</div>`;
                }
            } else {
                if (statusDiv) {
                    statusDiv.innerHTML = `<div style="color:#58A6FF; font-size:10px; margin-top:6px;">👍 Voto registrado: <strong>${data.votos_actuales}/3</strong></div>`;
                }
            }

            // Recargamos silenciosamente los datos para refrescar contadores en la columna izquierda
            setTimeout(() => {
                loadThreadView(threadId);
            }, 1200);
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = `<div style="color:#FF6666; font-size:10px; margin-top:6px;">${data.error || "No se pudo votar"}</div>`;
            }
        }
    } catch (e) {
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="color:#FF6666; font-size:10px; margin-top:6px;">Error de red al votar</div>`;
        }
    }
}

/**
 * 🎊 Generador nativo de partículas de confeti en pantalla
 */
function triggerConfetti() {
    const colors = ['#FF0055', '#00FF99', '#FFFF00', '#00FFFF', '#FF9900', '#FF00FF', '#FFFFFF', '#3B82F6'];
    for (let i = 0; i < 45; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-piece';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = (window.innerWidth / 2 + (Math.random() * 260 - 130)) + 'px';
        conf.style.top = (window.innerHeight / 3 + (Math.random() * 60 - 30)) + 'px';
        conf.style.setProperty('--tx', (Math.random() * 500 - 250) + 'px');
        conf.style.setProperty('--ty', (Math.random() * 350 + 100) + 'px');
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 2200);
    }
}

/**
 * 🖼️ Genera el bloque HTML de un mensaje individual:
 * Si isOp === true: usa la clase '.op-post' (grande y destacado arriba).
 * Si isOp === false: usa la clase '.reply-post' (compacto e indentado a la derecha).
 */
function generatePostHTML(post, thread, isOp = false) {
    const author = post.author || {};
    const authorName = author.username || post.autor || 'Anónimo';
    const rank = author.rank || (isOp ? 'Creador del Tema' : 'Miembro');
    const content = post.content || post.comentario || '';
    const date = post.timestamp || post.fecha || '';

    const containerClass = isOp ? 'op-post' : 'reply-post';

    return `
        <div class="${containerClass}" id="post-${post.id}">
            <div class="user-sidebar">
                <div class="username">${escapeHtml(authorName)}</div>
                <div class="avatar">[AVATAR]</div>
                <div class="user-info">
                    Rango: ${escapeHtml(rank)}<br>
                    Fecha: ${escapeHtml(author.join_date || '2026')}
                </div>
            </div>
            <div class="post-body">
                <div class="post-meta">
                    Publicado el ${date} ${isOp ? '<span style="color:#003399; font-weight:bold; float:right;">[POST ORIGINAL - OP]</span>' : ''}
                </div>
                <div class="post-content">${escapeHtml(content)}</div>
            </div>
        </div>
    `;
}

/**
 * ✍️ 4. Enviar Respuesta a un Hilo (POST /api/thread/{id}/reply)
 * Detecta si al responder se activó el purgado automático de MongoDB.
 */
async function submitReply(threadId) {
    const textInput = document.getElementById("reply-text");
    const authorInput = document.getElementById("reply-author");
    const statusDiv = document.getElementById("reply-status");
    const text = textInput.value.trim();
    const author = authorInput ? authorInput.value.trim() || "Anónimo" : "Anónimo";

    if (!text) {
        statusDiv.innerHTML = "<span style='color:red;'>Escribe algo primero.</span>";
        return;
    }

    statusDiv.innerHTML = "Enviando mensaje a MongoDB...";
    textInput.disabled = true;

    try {
        const res = await fetch(`/api/thread/${threadId}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                content: text,
                author: author
            })
        });

        const data = await res.json();

        if (res.ok) {
            // Si el hilo fue purgado porque llegó al límite máximo:
            if (data.hilo_borrado) {
                alert("🗑️ " + data.mensaje);
                window.location.hash = "home";
                return;
            }

            statusDiv.innerHTML = "<span style='color:green;'>¡Mensaje guardado!</span>";
            textInput.value = "";
            textInput.disabled = false;
            setTimeout(() => {
                loadThreadView(threadId);
            }, 400);
        } else {
            statusDiv.innerHTML = `<span style='color:red;'>Error: ${data.error || "Desconocido"}</span>`;
            textInput.disabled = false;
        }
    } catch (err) {
        statusDiv.innerHTML = "<span style='color:red;'>Error de red.</span>";
        textInput.disabled = false;
    }
}

/**
 * 🧑‍💻 5. Perfil de Usuario
 */
function openProfileView() {
    const main = document.getElementById('main-content');
    const breadcrumbExtra = document.getElementById('breadcrumb-extra');
    if (!main) return;
    if (breadcrumbExtra) breadcrumbExtra.innerHTML = ' &gt; Mi Perfil';

    main.innerHTML = `
        <div class="thread-header">
            <h2>🧑‍💻 Panel de Perfil</h2>
            <div class="sub-text">Datos del usuario y estadísticas del foro.</div>
        </div>
        <div class="post-container" style="padding:15px; display:block;">
            <div style="font-weight:bold; margin-bottom:8px;">Mi Cuenta</div>
            <div id="profile-account-meta">Cargando datos del perfil...</div>
        </div>
    `;

    fetch('/api/user/me')
        .then(res => res.json())
        .then(user => {
            const meta = document.getElementById('profile-account-meta');
            if (meta) {
                meta.innerHTML = `
                    <div>Nick: <strong>${escapeHtml(user.username)}</strong></div>
                    <div>Rango: <strong>${escapeHtml(user.rank || 'Usuario')}</strong></div>
                    <div>Fecha de Ingreso: <strong>${escapeHtml(user.join_date)}</strong></div>
                    <div>Total de Posts en el foro: <strong>${user.post_count}</strong></div>
                `;
            }
        });
}

/**
 * 🔍 6. Buscador
 */
async function loadSearchView(query) {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    if (!main) return;
    if (breadcrumbExtra) breadcrumbExtra.innerHTML = ` &gt; Búsqueda`;
    main.innerHTML = `<p style='padding:15px;'>Buscando "${escapeHtml(query)}"...</p>`;

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await res.json();

        let html = `
            <div class="thread-header">
                <h2>Resultados de búsqueda para: "${escapeHtml(query)}"</h2>
            </div>
            <h4 style="margin:10px 0; color:#1E3B5E;">Hilos Encontrados (${(results.threads || []).length})</h4>
        `;

        if (results.threads && results.threads.length > 0) {
            html += `<table class="forum-table"><tbody>`;
            results.threads.forEach(t => {
                html += `<tr><td><a href="#thread/${t.id}" class="thread-title">${escapeHtml(t.title || t.titulo)}</a></td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<p class="sub-text" style="margin-bottom:15px;">No se encontraron hilos con esa palabra.</p>`;
        }

        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = "<p style='color:red;'>Error realizando la búsqueda.</p>";
    }
}

async function loadUserNotifications() {
    try {
        const res = await fetch('/api/user/notifications');
        const data = await res.json();
        const count = data.unread_count || 0;
        const link = document.getElementById('profile-notification-link');
        if (link) {
            link.innerHTML = `[ Panel de Usuario (${count}) ]`;
        }
    } catch (e) {}
}

/**
 * Helper de seguridad contra ataques XSS: limpia caracteres especiales de HTML
 */
function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
