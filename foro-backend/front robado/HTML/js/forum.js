// Lógica de Frontend Vanilla JS para ForoPrueba2002

document.addEventListener("DOMContentLoaded", () => {
    // Initial route load
    loadUserNotifications();
    window.setInterval(loadUserNotifications, 5000);
    initializeInactivityAutoAdvance();
    handleRoute();
    window.addEventListener("hashchange", handleRoute);

    // Search button listener
    document.getElementById("btn-search").addEventListener("click", () => {
        const query = document.getElementById("search-input").value.trim();
        if (query) {
            window.location.hash = `search?q=${encodeURIComponent(query)}`;
        }
    });

    // Enter key on search input
    document.getElementById("search-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            document.getElementById("btn-search").click();
        }
    });

    // Pop-up molesto tras 5 segundos
    setTimeout(() => {
        if (!window.DEV_DISABLE_POPUPS) {
            showRetroPopup();
        }
    }, 5000);

    // O en el primer clic si aún no apareció
    document.body.addEventListener("click", () => {
        if (!window.popupTriggered && !window.DEV_DISABLE_POPUPS) {
            showRetroPopup();
        }
    }, { once: true });
});

function handleRoute() {
    /* 
     * Motor de enrutamiento Vanilla JS.
     * Lee el hash de la URL (#category/123) y carga la vista correspondiente
     * inyectando HTML crudo en main-content. No recarga la página.
     */
    const hash = window.location.hash.replace("#", "") || "home";
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");

    if (hash === "home") {
        breadcrumbExtra.innerHTML = "";
        loadForumHome();
    } else if (hash.startsWith("category/")) {
        const catId = hash.split("/")[1];
        loadCategoryView(catId);
    } else if (hash.startsWith("thread/")) {
        const parts = hash.split("/");
        const threadId = parts[1];
        const page = parts[2] ? parseInt(parts[2]) : 1;
        loadThreadView(threadId, page);
    } else if (hash.startsWith("search?q=")) {
        const query = decodeURIComponent(hash.split("search?q=")[1]);
        loadSearchView(query);
    } else if (hash === "tests") {
        loadTestPanelView();
    } else {
        loadForumHome();
    }
}

function updateSimControlPanel(timeline, stats) {
    if (timeline) {
        document.getElementById("sim-year").innerText = timeline.year;
        document.getElementById("sim-date").innerText = timeline.current_time;
    }
    if (stats) {
        document.getElementById("sim-threads").innerText = stats.total_threads;
        document.getElementById("sim-posts").innerText = stats.total_posts;
    }
}

function notifyDevLog(message) {
    if (typeof console !== 'undefined') {
        console.log(message);
    }
    if (window.DEV_CONSOLE_LOG) {
        window.DEV_CONSOLE_LOG(message);
    }
}

function initializeInactivityAutoAdvance() {
    window.AUTO_ADVANCE_INACTIVITY_MS = 45000;
    window.inactivityAutoAdvanceTimer = null;
    window.inactivityAutoAdvanceActive = true;

    const isTypingTarget = () => {
        const active = document.activeElement;
        if (!active) {
            return false;
        }
        const tag = active.tagName && active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
            return true;
        }
        return active.isContentEditable;
    };

    const resetTimer = () => {
        if (!window.inactivityAutoAdvanceActive) {
            return;
        }
        if (window.inactivityAutoAdvanceTimer) {
            clearTimeout(window.inactivityAutoAdvanceTimer);
        }
        window.inactivityAutoAdvanceTimer = setTimeout(() => {
            if (isTypingTarget()) {
                notifyDevLog('[AUTO-SIM] Inactividad descartada: el usuario está tipeando');
                resetTimer();
                return;
            }
            notifyDevLog('[AUTO-SIM] Avanzando +5 Ticks por inactividad');
            advanceSimulation(5);
            resetTimer();
        }, window.AUTO_ADVANCE_INACTIVITY_MS);
    };

    const activityEvents = ['keydown', 'click', 'mousemove', 'scroll', 'input'];
    activityEvents.forEach((eventName) => {
        document.addEventListener(eventName, resetTimer, { passive: true });
    });

    resetTimer();
    window.resetInactivityAutoAdvance = resetTimer;
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
        window.userNotificationCount = count;
    } catch (err) {
        console.error('No se pudieron cargar las notificaciones del usuario', err);
    }
}

function openProfileView() {
    const main = document.getElementById('main-content');
    const breadcrumbExtra = document.getElementById('breadcrumb-extra');
    breadcrumbExtra.innerHTML = ' &gt; Mi Perfil';

    main.innerHTML = `
        <div class="thread-header">
            <h2>🧑‍💻 Panel de Perfil</h2>
            <div class="sub-text">Datos del usuario humano y bandeja de respuestas automáticas.</div>
        </div>
        <div class="post-container" style="padding:12px; display:block;">
            <div style="font-weight:bold; margin-bottom:8px;">Cuenta</div>
            <div id="profile-account-meta">Cargando datos del perfil...</div>
        </div>
        <div class="post-container" style="padding:12px; display:block;">
            <div style="font-weight:bold; margin-bottom:8px;">Bandeja de Respuestas</div>
            <div id="profile-notifications-list">Cargando alertas...</div>
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
                    <div>Posts realizados: <strong>${user.post_count}</strong></div>
                `;
            }
        });

    fetch('/api/user/notifications')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('profile-notifications-list');
            if (!list) return;

            if (!data.notifications || data.notifications.length === 0) {
                list.innerHTML = '<div class="sub-text">No tienes respuestas de bots aún.</div>';
                return;
            }

            list.innerHTML = data.notifications.map(n => `
                <div class="notification-item" style="border:1px solid #A9B8C7; background:#F7FAFD; padding:8px; margin-bottom:8px;">
                    <div><strong>${escapeHtml(n.bot_name)}</strong> respondió en <strong>${escapeHtml(n.thread_title)}</strong></div>
                    <div class="sub-text">${escapeHtml(n.timestamp)} ${n.read ? '(leída)' : '(nueva)'}</div>
                    <div style="margin-top:4px;">${escapeHtml(n.snippet)}</div>
                    <button onclick="openNotificationThread('${n.thread_id}', '${n.post_id || ''}', ${n.page || 1}); return false;" style="margin-top:6px; font-size:10px; padding:3px 8px;">Ir al mensaje</button>
                </div>
            `).join('');

            fetch('/api/user/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_ids: data.notifications.map(n => n.id) })
            }).then(() => loadUserNotifications());
        })
        .catch(() => {
            const list = document.getElementById('profile-notifications-list');
            if (list) list.innerHTML = '<div style="color:red;">No se pudo cargar la bandeja.</div>';
        });
}

function openNotificationThread(threadId, postId, page = 1) {
    window.targetPostToHighlight = postId || '';
    window.location.hash = `thread/${threadId}/${page}`;
    setTimeout(() => {
        if (postId) {
            scrollToAndHighlightPost(postId);
        }
    }, 300);
}

async function advanceSimulation(ticks) {
    try {
        const res = await fetch(`/api/simulation/tick?n=${ticks}`, { method: "POST" });
        const data = await res.json();
        
        updateSimControlPanel(data.timeline, data.stats);
        
        // Reload current view to show new content
        handleRoute();
    } catch (err) {
        console.error("Error avanzando simulación:", err);
    }
}

// 1. Home View (Categories list)
async function loadForumHome() {
    const main = document.getElementById("main-content");
    main.innerHTML = "<p style='padding:15px;'>Cargando categorías...</p>";

    try {
        const res = await fetch("/api/forum");
        const forum = await res.json();

        updateSimControlPanel(forum.timeline, forum.stats);

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

        forum.categories.forEach((cat, index) => {
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
            
            <!-- Side Ad Banners (Web 2.0 Spam) -->
            <div class="side-ad-container">
                <div class="ad-box-300">
                    <div class="ad-fake-close" onclick="handleDeceptiveClose(event)">[X]</div>
                    <h3>🔥 CHICAS A 2KM EN TU AREA 🔥</h3>
                    <p style="font-size:10px; margin:4px 0;">¡Hay 3 usuarias conectadas buscando chat MSN ahora mismo!</p>
                    <button onclick="triggerFakeAdAction('MSN')" style="background:#FF0000; color:#FFF; font-weight:bold; padding:3px 8px; border:2px outset #FFF;">[ ABRIR CHAT MSN ]</button>
                </div>
                <div class="ad-box-300" style="background: linear-gradient(135deg, #00FF00, #FFFF00);">
                    <div class="ad-fake-close" onclick="handleDeceptiveClose(event)">[X]</div>
                    <h3>💾 DESCARGAR RAM GRATIS 4GB 💾</h3>
                    <p style="font-size:10px; margin:4px 0;">Aumenta la velocidad de tu PC un 400% sin comprar hardware.</p>
                    <button onclick="triggerFakeAdAction('RAM')" style="background:#000; color:#00FF00; font-weight:bold; padding:3px 8px; border:2px outset #FFF;">[ DESCARGAR RAM.EXE ]</button>
                </div>
            </div>

            <div style="background:#F4F7F9; border:1px solid #A9B8C7; padding:10px; font-size:10px; margin-top:10px;">
                <strong>Estadísticas de la Comunidad:</strong><br>
                Nuestros miembros han publicado un total de <strong>${forum.stats.total_posts}</strong> mensajes en <strong>${forum.stats.total_threads}</strong> hilos.<br>
                Tenemos un total de <strong>${forum.stats.total_users}</strong> usuarios registrados simulados.
            </div>
        `;

        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = "<p style='color:red;'>Error cargando el foro.</p>";
    }
}

// 2. Category View (Threads List)
async function loadCategoryView(catId) {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    main.innerHTML = "<p style='padding:15px;'>Cargando hilos...</p>";

    try {
        const res = await fetch(`/api/category/${catId}`);
        const category = await res.json();

        breadcrumbExtra.innerHTML = ` &gt; <a href="#category/${category.id}">${escapeHtml(category.name)}</a>`;

        let html = `
            <div class="thread-header">
                <h2>Categoría: ${escapeHtml(category.name)}</h2>
                <div class="sub-text">${escapeHtml(category.description)}</div>
            </div>

            <table class="forum-table">
                <thead>
                    <tr>
                        <th width="55%">Título del Hilo</th>
                        <th width="15%">Autor</th>
                        <th width="10%" style="text-align:center;">Respuestas</th>
                        <th width="20%">Último Mensaje</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (!category.threads || category.threads.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:20px;">No hay hilos en esta categoría todavía.</td></tr>`;
        } else {
            category.threads.forEach((t, index) => {
                const rowClass = index % 2 === 0 ? "row1" : "row2";
                html += `
                    <tr class="${rowClass}">
                        <td>
                            <a href="#thread/${t.id}" class="thread-title">${escapeHtml(t.title)}</a>
                            <div class="sub-text">Creado el ${t.created_at}</div>
                        </td>
                        <td class="sub-text"><strong>${escapeHtml(t.creator.username)}</strong></td>
                        <td style="text-align:center;">${t.reply_count}</td>
                        <td class="sub-text">${t.last_activity}</td>
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
        main.innerHTML = "<p style='color:red;'>Error cargando la categoría.</p>";
    }
}

// 3. Thread View (Posts Feed + Pagination + Quotes)
async function loadThreadView(threadId, page = 1) {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    main.innerHTML = "<p style='padding:15px;'>Cargando tema...</p>";

    try {
        const res = await fetch(`/api/thread/${threadId}?page=${page}&per_page=10`);
        const thread = await res.json();

        breadcrumbExtra.innerHTML = ` &gt; <a href="#thread/${thread.id}">${escapeHtml(thread.title)}</a>`;

        let html = `
            <div class="thread-header">
                <h2>${escapeHtml(thread.title)}</h2>
                <div class="sub-text">Iniciado por <strong>${escapeHtml(thread.creator.username)}</strong> el ${thread.created_at}</div>
            </div>
        `;

        // Render Pagination Top
        html += renderPagination(thread.id, thread.pagination);

        // Contenedor para los posts
        html += `<div id="thread-posts-container">`;

        // Render Posts
        if (thread.posts.length > 0) {
            window.lastThreadPostId = thread.posts[thread.posts.length - 1].id;
        }
        thread.posts.forEach(post => {
            html += generatePostHTML(post, thread);
        });

        html += `</div>`;


        // Render Pagination Bottom
        html += renderPagination(thread.id, thread.pagination);

        // Reply Form
        html += `
            <div class="post-container" style="background:#E0E5E9; border-top: 2px solid #5C7099; padding:15px; margin-top:20px;">
                <h3 style="margin-top:0;">Responder al Tema</h3>
                <textarea id="reply-text" style="width:100%; height:100px; font-family: 'Verdana', sans-serif; font-size:12px; margin-bottom:10px;"></textarea>
                <button onclick="submitReply('${thread.id}')" style="font-weight:bold; padding:5px 15px;">Enviar Respuesta</button>
                <div id="reply-status" style="display:inline-block; margin-left:10px; color:#555;"></div>
            </div>
        `;

        main.innerHTML = html;


        // Si venimos de un salto entre páginas a una cita
        if (window.targetPostToHighlight) {
            const targetId = window.targetPostToHighlight;
            window.targetPostToHighlight = null;
            setTimeout(() => {
                scrollToAndHighlightPost(targetId);
            }, 200);
        }
    } catch (err) {
        main.innerHTML = "<p style='color:red;'>Error cargando el hilo.</p>";
    }
}

function generatePostHTML(post, thread) {
    const author = post.author;
    let quoteSnippet = "";
    if (post.quoted_post) {
        const qp = post.quoted_post;
        quoteSnippet = `
            <blockquote class="quote">
                <div class="quote-header">
                    <span>Publicado originalmente por <strong>${escapeHtml(qp.author_username)}</strong>:</span>
                    <a href="#" onclick="jumpToQuotedPost('${thread.id}', '${qp.id}', ${qp.page}); return false;" class="quote-jump-link">[ Ver mensaje original ➔ ]</a>
                </div>
                <div class="quote-text">"${escapeHtml(qp.content)}"</div>
            </blockquote>
        `;
    }
    
    const signatureHtml = author.signature ? `<div class="post-signature">${escapeHtml(author.signature)}</div>` : "";

    return `
        <div class="post-container" id="post-${post.id}">
            <div class="user-sidebar">
                <div class="username">${escapeHtml(author.username)}</div>
                <div class="avatar">[AVATAR]</div>
                <div class="user-info">
                    Registrado: ${author.join_date}<br>
                    Posts: ${author.post_count}
                </div>
            </div>
            <div class="post-body">
                <div>
                    <div class="post-meta">
                        Publicado el ${post.timestamp}
                        <button onclick="prepareQuote('${author.id}', '${escapeHtml(author.username)}')" style="float:right; font-size:10px; cursor:pointer;">[ Citar ]</button>
                    </div>
                    ${quoteSnippet}
                    <div class="post-content">${escapeHtml(post.content)}</div>
                </div>
                ${signatureHtml}
            </div>
        </div>
    `;
}

let currentTargetBotId = null;

function prepareQuote(botId, botUsername) {
    currentTargetBotId = botId;
    const txt = document.getElementById("reply-text");
    if (txt) {
        txt.value = `[quote=${botUsername}]\n\n[/quote]\n` + txt.value;
        txt.focus();
        // Mover cursor dentro de las comillas
        txt.setSelectionRange(txt.value.indexOf(']') + 3, txt.value.indexOf(']') + 3);
    }
}

// 4. Search View
async function loadSearchView(query) {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    breadcrumbExtra.innerHTML = ` &gt; Búsqueda`;
    main.innerHTML = `<p style='padding:15px;'>Buscando "${escapeHtml(query)}"...</p>`;

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await res.json();

        let html = `
            <div class="thread-header">
                <h2>Resultados de búsqueda para: "${escapeHtml(query)}"</h2>
            </div>
        `;

        // Threads
        html += `<h4 style="margin:10px 0; color:#1E3B5E;">Hilos Encontrados (${results.threads.length})</h4>`;
        if (results.threads.length > 0) {
            html += `<table class="forum-table"><tbody>`;
            results.threads.forEach(t => {
                html += `<tr><td><a href="#thread/${t.id}" class="thread-title">${escapeHtml(t.title)}</a> <span class="sub-text">por ${t.creator.username}</span></td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<p class="sub-text" style="margin-bottom:15px;">No se encontraron hilos.</p>`;
        }

        // Posts
        html += `<h4 style="margin:10px 0; color:#1E3B5E;">Mensajes Encontrados (${results.posts.length})</h4>`;
        if (results.posts.length > 0) {
            results.posts.forEach(p => {
                html += `
                    <div style="background:#FFF; border:1px solid #CCC; padding:8px; margin-bottom:8px;">
                        <div class="sub-text">En el hilo: <a href="#thread/${p.thread_id}">${escapeHtml(p.thread_title)}</a> por <strong>${escapeHtml(p.author.username)}</strong> el ${p.timestamp}</div>
                        <div style="margin-top:5px;">${escapeHtml(p.content)}</div>
                    </div>
                `;
            });
        } else {
            html += `<p class="sub-text">No se encontraron mensajes.</p>`;
        }

        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = "<p style='color:red;'>Error realizando la búsqueda.</p>";
    }
}

function renderPagination(threadId, pagination) {
    if (!pagination || pagination.total_pages <= 1) return "";
    
    let html = `<div class="pagination"><span>Páginas (${pagination.total_pages}):</span>`;
    for (let i = 1; i <= pagination.total_pages; i++) {
        if (i === pagination.current_page) {
            html += `<span class="page-num current">${i}</span>`;
        } else {
            html += `<a href="#thread/${threadId}/${i}" class="page-num">${i}</a>`;
        }
    }
    html += `</div>`;
    return html;
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 5. Test & Benchmark Panel View
function loadTestPanelView() {
    const main = document.getElementById("main-content");
    const breadcrumbExtra = document.getElementById("breadcrumb-extra");
    breadcrumbExtra.innerHTML = ` &gt; Panel de Pruebas & Benchmark`;

    main.innerHTML = `
        <div class="thread-header">
            <h2>🧪 Panel de Control de Pruebas y Benchmark</h2>
            <div class="sub-text">Ejecuta las verificaciones del motor directamente desde el navegador sin usar PowerShell.</div>
        </div>

        <div style="background:#F4F7F9; border:1px solid #A9B8C7; padding:12px; margin-bottom:15px;">
            <div style="margin-bottom:10px; font-weight:bold;">Acciones Rápidas:</div>
            <button onclick="runSocialTestFromWeb()" style="padding:6px 12px; font-weight:bold; background:#2B4E73; color:#FFF; border:1px solid #142840; margin-right:8px;">
                ▶ Ejecutar Test Social (Fase 3)
            </button>
            <button onclick="runStressTestFromWeb()" style="padding:6px 12px; font-weight:bold; background:#8B0000; color:#FFF; border:1px solid #550000;">
                ⚡ Ejecutar Stress Test (250k Ticks)
            </button>
        </div>

        <div style="background:#000000; color:#00FF00; font-family:'Courier New', Courier, monospace; font-size:11px; padding:12px; border:2px solid #333; min-height:220px; max-height:450px; overflow-y:auto; white-space:pre-wrap;" id="terminal-output">--- Consola de Resultados ---
Haz clic en un botón superior para ejecutar los experimentos en el motor Python...</div>
    `;
}

async function runSocialTestFromWeb() {
    const term = document.getElementById("terminal-output");
    term.style.color = "#00FF00";
    term.innerText = "⏳ Ejecutando suite de 9 pruebas sociales de Fase 3 en motor Python...\nPor favor espera unos segundos...\n";
    try {
        const res = await fetch("/api/tests/social", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            term.innerText = data.output;
        } else {
            term.style.color = "#FF4444";
            term.innerText = "[ERROR FATAL]:\n" + (data.error || "Ocurrió un error inesperado") + "\n\nSalida parcial:\n" + data.output;
        }
    } catch (err) {
        term.style.color = "#FF4444";
        term.innerText = "[ERROR DE RED/SERVIDOR]: No se pudo contactar con el endpoint de prueba.\n" + err;
    }
}

async function runStressTestFromWeb() {
    const term = document.getElementById("terminal-output");
    term.style.color = "#FFFF00";
    term.innerText = "⚡ Ejecutando Stress Test masivo de 250.000 Ticks (Fase 3)...\nEsto puede demorar unos minutos. La página se actualizará automáticamente con la tabla final...\n";
    try {
        const res = await fetch("/api/tests/stress", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            term.style.color = "#00FF00";
            term.innerText = data.output;
        } else {
            term.style.color = "#FF4444";
            term.innerText = "[ERROR EN BENCHMARK]:\n" + (data.error || "Ocurrió un error inesperado") + "\n\nSalida parcial:\n" + data.output;
        }
    } catch (err) {
        term.style.color = "#FF4444";
        term.innerText = "[ERROR DE RED/SERVIDOR]: Timeout o conexión rechazada.\n" + err;
    }
}

// 6. Lógica de Pop-ups Spam Retro & Interacción Engañosa (Web 1.0 / 2.0)
window.popupCount = 0;
window.maxZIndex = 10000;

const POPUP_THEMES = [
    {
        key: "VIRUS",
        title: "⚠️ ¡ALERTA DE SEGURIDAD CRÍTICA WINDOWS 98!",
        blink: "🚨 ¡¡¡ATENCIÓN: SE DETECTARON 14 VIRUS Y TROYANOS!!! 🚨",
        body: "Su memoria RAM no es suficiente y su sistema puede colapsar en cualquier momento. Descargue <strong>SUPER-RAM-CLEANER-2003.EXE</strong> de inmediato.",
        btnOk: "¡DESCARGAR RAM GRATIS!",
        btnCancel: "CERRAR [X]"
    },
    {
        key: "IPOD",
        title: "🎁 ¡FELICITACIONES VISITANTE #1.000.000!",
        blink: "🎉 ¡¡¡GANASTE UN IPOD NANO 4GB EDICIÓN ESPECIAL!!! 🎉",
        body: "Tu dirección IP ha sido seleccionada aleatoriamente en nuestra base de datos. Haz clic abajo para recibirlo en tu domicilio gratis.",
        btnOk: "¡RECLAMAR IPOD AHORA!",
        btnCancel: "RECHAZAR PREMIO [X]"
    },
    {
        key: "MSN",
        title: "💬 MSN MESSENGER 6.2 - NUEVO ZUMBIDO",
        blink: "🔔 ¡¡¡'Laura_20' TE HA ENVIADO UN ZUMBIDO (BZZZZ!)!!! 🔔",
        body: "'Laura_20 (laura_hot_2003@hotmail.com)' quiere agregarte a su lista de contactos y enviarte una foto por Webcam.",
        btnOk: "¡ACEPTAR WEBCAM!",
        btnCancel: "IGNORAR [X]"
    },
    {
        key: "CASINO",
        title: "🎰 CASINO ROYAL 2003 - BONO GRATIS",
        blink: "💰 ¡¡¡$500 USD EN FICHAS DE POKER GRATIS!!! 💰",
        body: "Juega a la ruleta y al blackjack en vivo desde tu módem telefónico. Retiros instantáneos a tu cuenta bancaria.",
        btnOk: "¡JUGAR AHORA!",
        btnCancel: "CERRAR [X]"
    }
];

function makeDraggable(winEl) {
    const titleBar = winEl.querySelector('.win98-title-bar');
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    titleBar.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('win98-close-btn')) return;
        isDragging = true;
        offsetX = e.clientX - winEl.offsetLeft;
        offsetY = e.clientY - winEl.offsetTop;
        window.maxZIndex++;
        winEl.style.zIndex = window.maxZIndex;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            winEl.style.left = Math.max(0, e.clientX - offsetX) + 'px';
            winEl.style.top = Math.max(0, e.clientY - offsetY) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function showRetroPopup() {
    if (window.DEV_DISABLE_POPUPS) return;
    spawnRetroPopup(0);
    // Lanzar un segundo popup aleatorio tras 3 segundos
    setTimeout(() => {
        if (!window.DEV_DISABLE_POPUPS) {
            spawnRetroPopup();
        }
    }, 3000);
}

function spawnRetroPopup(themeIndex = null) {
    if (window.DEV_DISABLE_POPUPS) return;
    window.popupCount++;
    const id = "popup-win-" + window.popupCount;
    
    const theme = themeIndex !== null ? POPUP_THEMES[themeIndex] : POPUP_THEMES[Math.floor(Math.random() * POPUP_THEMES.length)];
    
    const win = document.createElement("div");
    win.id = id;
    win.className = "win98-window";
    
    // Posición aleatoria en pantalla
    const top = Math.floor(Math.random() * 45 + 10);
    const left = Math.floor(Math.random() * 45 + 10);
    win.style.top = top + "%";
    win.style.left = left + "%";
    window.maxZIndex++;
    win.style.zIndex = window.maxZIndex;

    win.innerHTML = `
        <div class="win98-title-bar">
            <span>${theme.title}</span>
            <button class="win98-close-btn" onclick="handlePopupDeceptiveClose('${id}', event)">X</button>
        </div>
        <div class="win98-content">
            <div class="blink-text">${theme.blink}</div>
            <p class="popup-body-text">${theme.body}</p>
            <div class="fake-buttons">
                <button onclick="handlePopupAction('${id}', '${theme.key}')">${theme.btnOk}</button>
                <button onclick="handlePopupDeceptiveClose('${id}', event)">${theme.btnCancel}</button>
            </div>
        </div>
    `;

    document.body.appendChild(win);
    makeDraggable(win);
}

function handlePopupDeceptiveClose(popupId, e) {
    if (e) e.stopPropagation();
    const win = document.getElementById(popupId);
    if (!win) return;

    // 50% de probabilidad de engaño (teletransporte + mensaje de error interno dentro del propio popup)
    if (Math.random() < 0.5) {
        const top = Math.floor(Math.random() * 50 + 5);
        const left = Math.floor(Math.random() * 50 + 5);
        win.style.top = top + "%";
        win.style.left = left + "%";
        window.maxZIndex++;
        win.style.zIndex = window.maxZIndex;

        const bodyEl = win.querySelector(".popup-body-text");
        if (bodyEl) {
            const fakeErrors = [
                "⚠️ <strong>¡ERROR 0x000000FF!</strong> No se puede cerrar esta advertencia sin antes completar el proceso de desinfección.",
                "🚫 <strong>¡ACCESO DENEGADO!</strong> El sistema detectó un intento de cierre sospechoso. Confirme su identidad para continuar.",
                "🚨 <strong>¡ADVERTENCIA DE SEGURIDAD!</strong> Tu dirección IP está siendo auditada. Presiona Aceptar para desbloquear el navegador."
            ];
            bodyEl.innerHTML = fakeErrors[Math.floor(Math.random() * fakeErrors.length)];
        }

        // 40% de probabilidad de spawnear otro popup aleatorio extra para caotizar la pantalla
        if (Math.random() < 0.4) {
            spawnRetroPopup();
        }
    } else {
        // 50% de probabilidad de que sí cierre la ventana
        win.remove();
    }
}

function handlePopupAction(popupId, themeKey) {
    const win = document.getElementById(popupId);
    if (!win) return;

    const bodyEl = win.querySelector(".popup-body-text");
    const titleEl = win.querySelector(".win98-title-bar span");

    if (themeKey === "VIRUS" || themeKey === "RAM") {
        if (titleEl) titleEl.innerText = "💾 DESCARGANDO RAM_SPEED_BOOSTER.EXE...";
        if (bodyEl) bodyEl.innerHTML = "⏳ <strong>Descargando archivo (1.2 MB)...</strong><br><progress value='75' max='100' style='width:100%; margin-top:6px;'></progress><br><small>Por favor espere mientras su PC se reinicia en modo seguro.</small>";
    } else if (themeKey === "IPOD") {
        if (titleEl) titleEl.innerText = "🎁 ¡PREMIO CONFIRMADO!";
        if (bodyEl) bodyEl.innerHTML = "🎉 <strong>¡Felicidades!</strong> Se ha reservado un iPod Nano 4GB (Plateado). Escriba su número de teléfono fijo simulado para completar la entrega.";
    } else if (themeKey === "MSN") {
        if (titleEl) titleEl.innerText = "💬 CONECTANDO CON WEBCAM...";
        if (bodyEl) bodyEl.innerHTML = "📹 <strong>'Laura_20' se ha conectado.</strong><br><div style='background:#000; color:#00FF00; padding:10px; margin-top:5px; text-align:center; font-family:monospace;'>[ TRANSMITIENDO WEBCAM 320x240 ]</div>";
    } else {
        if (titleEl) titleEl.innerText = "🎰 FICHAS ACREDITADAS";
        if (bodyEl) bodyEl.innerHTML = "💰 <strong>¡Se han acreditado $500 USD ficticios!</strong> Haga clic en Aceptar para ingresar al torneo de Poker online.";
    }

    const btnContainer = win.querySelector(".fake-buttons");
    if (btnContainer) {
        btnContainer.innerHTML = `<button onclick="document.getElementById('${popupId}').remove()">[ ACEPTAR Y CERRAR ]</button>`;
    }
}

function triggerFakeAdAction(type) {
    if (type === 'IPOD') spawnRetroPopup(1);
    else if (type === 'RAM') spawnRetroPopup(0);
    else if (type === 'MSN') spawnRetroPopup(2);
    else spawnRetroPopup();
}

// 7. Funciones de Salto Interactivo a Mensajes Citados
function jumpToQuotedPost(threadId, targetPostId, targetPage) {
    const currentHash = window.location.hash.replace("#", "");
    const parts = currentHash.split("/");
    const currentPage = (parts[0] === "thread" && parts[2]) ? parseInt(parts[2]) : 1;

    if (currentPage === targetPage) {
        scrollToAndHighlightPost(targetPostId);
    } else {
        window.targetPostToHighlight = targetPostId;
        window.location.hash = `thread/${threadId}/${targetPage}`;
    }
}

function scrollToAndHighlightPost(postId) {
    const postEl = document.getElementById("post-" + postId);
    if (postEl) {
        postEl.scrollIntoView({ behavior: "smooth", block: "center" });
        postEl.classList.remove("highlight-quote-target");
        // Forzar reflow para reiniciar la animación
        void postEl.offsetWidth;
        postEl.classList.add("highlight-quote-target");
    }
}

// Function to handle human replies
async function submitReply(threadId) {
    const textInput = document.getElementById("reply-text");
    const statusDiv = document.getElementById("reply-status");
    const text = textInput.value.trim();
    
    if (!text) {
        statusDiv.innerHTML = "<span style='color:red;'>Escribe algo primero.</span>";
        return;
    }
    
    statusDiv.innerHTML = "Enviando mensaje...";
    textInput.disabled = true;
    
    try {
        const res = await fetch(`/api/thread/${threadId}/reply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                content: text,
                target_bot_id: currentTargetBotId 
            })
        });
        
        if (res.ok) {
            statusDiv.innerHTML = "<span style='color:green;'>¡Mensaje enviado! Recargando...</span>";
            textInput.value = "";
            currentTargetBotId = null;
            // Recargar la vista del hilo para ver nuestro mensaje
            setTimeout(() => {
                loadThreadView(threadId, 9999); // ir a última página probable
            }, 500);
            
            // Refrescar para atrapar respuestas asíncronas de bots rápidos (Troll, Admin)
            const safeReload = async () => {
                if (window.location.hash.includes(threadId) && window.lastThreadPostId) {
                    try {
                        const updRes = await fetch(`/api/thread/${threadId}/updates?since=${window.lastThreadPostId}`);
                        if (updRes.ok) {
                            const data = await updRes.json();
                            if (data.posts && data.posts.length > 0) {
                                const container = document.getElementById("thread-posts-container");
                                if (container) {
                                    data.posts.forEach(p => {
                                        const tempDiv = document.createElement('div');
                                        tempDiv.innerHTML = generatePostHTML(p, {id: threadId});
                                        container.appendChild(tempDiv.firstElementChild);
                                        window.lastThreadPostId = p.id;
                                    });
                                }
                            }
                        }
                    } catch(e) {}
                }
            };
            
            if (window.reactionTimeout1) clearTimeout(window.reactionTimeout1);
            if (window.reactionTimeout2) clearTimeout(window.reactionTimeout2);
            if (window.reactionTimeout3) clearTimeout(window.reactionTimeout3);
            
            window.reactionTimeout1 = setTimeout(safeReload, 5000);
            window.reactionTimeout2 = setTimeout(safeReload, 11000);
            window.reactionTimeout3 = setTimeout(safeReload, 20000);
            
        } else {
            const data = await res.json();
            statusDiv.innerHTML = `<span style='color:red;'>Error: ${data.error || "Desconocido"}</span>`;
            textInput.disabled = false;
        }
    } catch (err) {
        statusDiv.innerHTML = `<span style='color:red;'>Error de red.</span>`;
        textInput.disabled = false;
    }
}
