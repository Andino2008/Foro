(function () {
    const DEV = {
        open: false,
        disablePopups: false,
        fpsEnabled: false,
        ramEnabled: false,
        fps: 0,
        ramMB: 0,
        ramDeltaMB: 0,
        frameCount: 0,
        lastFpsTime: performance.now(),
        lastMemory: null,
        rafId: null,
        ramRafId: null
    };

    function ensureUi() {
        if (document.getElementById('dev-console-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'dev-console-panel';
        panel.style.display = 'none';
        panel.style.position = 'fixed';
        panel.style.top = '12px';
        panel.style.left = '12px';
        panel.style.width = '360px';
        panel.style.maxHeight = '320px';
        panel.style.overflow = 'auto';
        panel.style.background = 'rgba(0,0,0,0.82)';
        panel.style.border = '1px solid #00ff00';
        panel.style.boxShadow = '0 0 10px rgba(0,255,0,0.35)';
        panel.style.color = '#00ff00';
        panel.style.fontFamily = 'Consolas, Monaco, monospace';
        panel.style.fontSize = '11px';
        panel.style.padding = '10px';
        panel.style.zIndex = '99999';
        panel.style.borderRadius = '4px';

        const title = document.createElement('div');
        title.textContent = '=== DEV CONSOLE ===';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';

        const help = document.createElement('pre');
        help.textContent = '[1] Toggle Popups\n[2] Toggle FPS Counter\n[3] Toggle RAM Monitor\nPresiona [|] para cerrar.';
        help.style.whiteSpace = 'pre-wrap';
        help.style.marginBottom = '8px';

        const input = document.createElement('input');
        input.id = 'dev-console-input';
        input.type = 'text';
        input.style.width = '100%';
        input.style.background = '#001100';
        input.style.border = '1px solid #00ff00';
        input.style.color = '#00ff00';
        input.style.padding = '4px';
        input.style.marginBottom = '8px';
        input.autocomplete = 'off';

        const log = document.createElement('div');
        log.id = 'dev-console-log';
        log.style.whiteSpace = 'pre-wrap';
        log.style.maxHeight = '180px';
        log.style.overflowY = 'auto';

        panel.appendChild(title);
        panel.appendChild(help);
        panel.appendChild(input);
        panel.appendChild(log);
        document.body.appendChild(panel);

        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                const value = input.value.trim();
                if (value) {
                    executeCommand(value);
                    input.value = '';
                }
            }
        });

        window.DEV_CONSOLE_LOG = function (msg) {
            const entries = document.getElementById('dev-console-log');
            if (entries) {
                entries.textContent += msg + '\n';
                entries.scrollTop = entries.scrollHeight;
            }
        };

        window.DEV_CONSOLE_PANEL = panel;
        window.DEV_CONSOLE_INPUT = input;

        window.DEV_CONSOLE_LOG('[DEV] Consola lista.');
    }

    function log(msg) {
        if (window.DEV_CONSOLE_LOG) {
            window.DEV_CONSOLE_LOG(msg);
        }
    }

    function setHudText() {
        const hud = document.getElementById('dev-console-hud');
        if (!hud) return;
        const ramText = DEV.ramEnabled && typeof performance.memory !== 'undefined'
            ? `${(DEV.ramMB || 0).toFixed(1)} MB (Heap Used)`
            : 'RAM: N/A';
        hud.textContent = `FPS: ${DEV.fps ? DEV.fps.toFixed(0) : '--'} | ${ramText}`;
    }

    function createHud() {
        if (document.getElementById('dev-console-hud')) return;
        const hud = document.createElement('div');
        hud.id = 'dev-console-hud';
        hud.style.position = 'fixed';
        hud.style.top = '12px';
        hud.style.right = '12px';
        hud.style.background = 'rgba(0,0,0,0.75)';
        hud.style.color = '#00ff00';
        hud.style.border = '1px solid #00ff00';
        hud.style.fontFamily = 'Consolas, Monaco, monospace';
        hud.style.fontSize = '11px';
        hud.style.padding = '6px 8px';
        hud.style.zIndex = '99998';
        hud.style.borderRadius = '4px';
        hud.style.display = 'none';
        document.body.appendChild(hud);
    }

    function toggleHud(forceVisible) {
        createHud();
        const hud = document.getElementById('dev-console-hud');
        if (!hud) return;
        const visible = typeof forceVisible === 'boolean' ? forceVisible : DEV.fpsEnabled || DEV.ramEnabled;
        hud.style.display = visible ? 'block' : 'none';
        setHudText();
    }

    function togglePopups() {
        DEV.disablePopups = !DEV.disablePopups;
        window.DEV_DISABLE_POPUPS = DEV.disablePopups;
        log(`[DEV] Popups/Alertas: ${DEV.disablePopups ? 'DESACTIVADOS' : 'ACTIVADOS'}`);
    }

    function toggleFpsCounter() {
        DEV.fpsEnabled = !DEV.fpsEnabled;
        if (DEV.fpsEnabled) {
            startFpsLoop();
        } else {
            cancelAnimationFrame(DEV.rafId);
            DEV.rafId = null;
            DEV.fps = 0;
        }
        toggleHud();
        log(`[DEV] FPS Counter: ${DEV.fpsEnabled ? 'TOGGLED ON' : 'TOGGLED OFF'}`);
    }

    function startFpsLoop() {
        DEV.frameCount = 0;
        DEV.lastFpsTime = performance.now();

        function animate(now) {
            if (!DEV.fpsEnabled) return;
            DEV.frameCount++;
            const delta = now - DEV.lastFpsTime;
            if (delta >= 500) {
                DEV.fps = (DEV.frameCount * 1000) / delta;
                DEV.frameCount = 0;
                DEV.lastFpsTime = now;
                setHudText();
            }
            DEV.rafId = requestAnimationFrame(animate);
        }

        DEV.rafId = requestAnimationFrame(animate);
    }

    function toggleRamMonitor() {
        if (typeof performance.memory === 'undefined') {
            log('[DEV] API performance.memory no soportada en este navegador');
            DEV.ramEnabled = false;
            toggleHud();
            return;
        }

        DEV.ramEnabled = !DEV.ramEnabled;
        if (DEV.ramEnabled) {
            startRamLoop();
        } else {
            cancelAnimationFrame(DEV.ramRafId);
            DEV.ramRafId = null;
            DEV.ramMB = 0;
            DEV.ramDeltaMB = 0;
        }
        toggleHud();
        log(`[DEV] RAM Monitor: ${DEV.ramEnabled ? 'TOGGLED ON' : 'TOGGLED OFF'}`);
    }

    function startRamLoop() {
        DEV.lastMemory = performance.memory.usedJSHeapSize;

        function sample() {
            if (!DEV.ramEnabled) return;
            const current = performance.memory.usedJSHeapSize;
            const currentMB = current / (1024 * 1024);
            const deltaMB = DEV.lastMemory !== null ? (current - DEV.lastMemory) / (1024 * 1024) : 0;
            DEV.ramMB = currentMB;
            DEV.ramDeltaMB = deltaMB;
            DEV.lastMemory = current;
            setHudText();
            DEV.ramRafId = requestAnimationFrame(sample);
        }

        DEV.ramRafId = requestAnimationFrame(sample);
    }

    function executeCommand(value) {
        const command = value.trim();
        if (!command) return;
        if (command === '1') {
            togglePopups();
        } else if (command === '2') {
            toggleFpsCounter();
        } else if (command === '3') {
            toggleRamMonitor();
        } else if (command === 'help') {
            log('=== DEV CONSOLE ===');
            log('[1] Toggle Popups');
            log('[2] Toggle FPS Counter');
            log('[3] Toggle RAM Monitor');
            log('Presiona [|] para cerrar.');
        } else {
            log('[DEV] Comando desconocido. Usa 1, 2, 3 o help.');
        }
    }

    function toggleDevConsole() {
        ensureUi();
        const panel = document.getElementById('dev-console-panel');
        const input = document.getElementById('dev-console-input');
        DEV.open = !DEV.open;
        panel.style.display = DEV.open ? 'block' : 'none';
        if (DEV.open) {
            input.focus();
            log('=== DEV CONSOLE ===');
            log('[1] Toggle Popups');
            log('[2] Toggle FPS Counter');
            log('[3] Toggle RAM Monitor');
            log('Presiona [|] para cerrar.');
        }
    }

    document.addEventListener('keydown', function (event) {
        const isPipe = event.key === '|' || event.keyCode === 220;
        if (isPipe) {
            event.preventDefault();
            toggleDevConsole();
            return;
        }

        if (!DEV.open) return;

        if (event.key === '1' || event.key === '2' || event.key === '3') {
            event.preventDefault();
            executeCommand(event.key);
        }
    });

    window.DEV_DISABLE_POPUPS = false;
    window.addEventListener('load', function () {
        ensureUi();
        createHud();
        setHudText();
    });

    window.devConsole = {
        toggle: toggleDevConsole,
        execute: executeCommand,
        state: DEV
    };
})();
