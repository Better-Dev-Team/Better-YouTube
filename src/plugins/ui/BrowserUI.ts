import { BasePlugin } from '../Plugin';
import type { PluginMetadata } from '../Plugin';
import { BrowserWindow } from 'electron';

/**
 * BrowserUI Plugin
 * Adds browser-like navigation controls (back, forward, refresh) to the YouTube interface
 */
export class BrowserUI extends BasePlugin {
    public metadata: PluginMetadata = {
        name: 'browser-ui',
        description: 'Adds browser navigation controls (back, forward, refresh) to YouTube',
        version: '1.0.0',
    };

    private getRendererScript(): string {
        const config = JSON.stringify(this.getConfig());
        return `
      (function() {
        console.log('[BrowserUI RENDERER] ========== SCRIPT STARTED (Direct Integration V2) ==========');
        const config = ${config};
        const isEnabled = config.enabled !== false;
        
        if (!isEnabled) return;

        // --- CSS Styles ---
        function injectStyles() {
            if (document.getElementById('browser-ui-integrated-style')) return;
            
            const style = document.createElement('style');
            style.id = 'browser-ui-integrated-style';
            style.textContent = \`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');

                /* --- Draggable Headers --- */
                ytmusic-nav-bar, #masthead-container, ytd-masthead {
                    -webkit-app-region: drag !important;
                }

                /* --- No-Drag Elements --- */
                ytmusic-nav-bar .left-content,
                ytmusic-nav-bar .center-content,
                ytmusic-nav-bar .right-content,
                ytmusic-search-box,
                ytmusic-settings-button,
                /* Standard YT */
                #masthead #start,
                #masthead #center,
                #masthead #end,
                #search-form,
                .nav-section,
                .window-section,
                .nav-btn,
                .window-btn,
                input,
                button,
                a {
                    -webkit-app-region: no-drag !important;
                }

                /* --- Nav Section (Left) --- */
                .nav-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-right: 16px; 
                }

                /* --- Window Section (Right) --- */
                .window-section {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-left: 16px; 
                    padding-left: 12px;
                    border-left: 1px solid rgba(255, 255, 255, 0.1); 
                }

                /* --- Buttons Shared Styles --- */
                .nav-btn, .window-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    border-radius: 4px;
                    font-family: 'Inter', sans-serif;
                    padding: 0;
                    outline: none;
                }

                .nav-btn:hover, .window-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                /* Buttons Sizing */
                .nav-btn { width: 32px; height: 32px; }
                .nav-btn svg { width: 20px; height: 20px; stroke-width: 2; }
                .window-btn { width: 40px; height: 32px; }
                .window-btn svg { width: 16px; height: 16px; }

                /* Specific Button Colors */
                .settings-btn { color: #d4a5ff !important; margin-right: 8px; }
                .settings-btn:hover { background: rgba(138, 43, 226, 0.15) !important; color: #fff !important; }
                .window-btn.close-btn:hover { background: #e81123 !important; color: white !important; }
                
                /* Hide Voice Search & Cast - AGGRESSIVE */
                #voice-search-button, 
                ytd-voice-search-renderer,
                ytmusic-voice-search-renderer,
                ytmusic-cast-button-renderer, 
                .ytd-cast-button-renderer { 
                    display: none !important; 
                    width: 0 !important;
                    height: 0 !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    position: absolute !important;
                }
                
                /* Hide NATIVE Settings Button (User Request) */
                ytmusic-settings-button {
                    display: none !important;
                }

                /* --- YouTube Main Specifics --- */
                #masthead #end {
                    min-width: unset !important;
                    overflow: visible !important;
                }
            \`;
            document.head.appendChild(style);
        }

        // --- Injection Logic ---
        function injectButtons() {
            let leftContainer = null;
            let rightContainer = null;
            let isStandardYouTube = false;
            
            // 1. YouTube Music
            try {
                const musicNavBar = document.querySelector('ytmusic-nav-bar');
                if (musicNavBar) {
                    leftContainer = musicNavBar.querySelector('.left-content');
                    rightContainer = musicNavBar.querySelector('.right-content');
                }
            } catch(e) {}
            
            // 2. Standard YouTube (Shadow DOM)
            if (!leftContainer) {
                try {
                    const masthead = document.querySelector('ytd-masthead');
                    if (masthead) {
                        if (masthead.shadowRoot) {
                            leftContainer = masthead.shadowRoot.querySelector('#start');
                            rightContainer = masthead.shadowRoot.querySelector('#end');
                        }
                        if (!leftContainer) leftContainer = masthead.querySelector('#start');
                        if (!rightContainer) rightContainer = masthead.querySelector('#end');
                        
                        if (leftContainer && rightContainer) isStandardYouTube = true;
                    }
                } catch(e) {}
            }

            if (!leftContainer || !rightContainer) return;

            // 3. Inject Navigation (Left)
            const existingNav = leftContainer.querySelector && leftContainer.querySelector('.nav-section');
            if (!existingNav) {
                const navSection = document.createElement('div');
                navSection.className = 'nav-section';
                if (isStandardYouTube) {
                    navSection.style.marginRight = '8px'; 
                    navSection.style.position = 'relative';
                    navSection.style.zIndex = '1000';
                }
                
                const backBtn = createBtn('back', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>', () => {
                     if (window.electronAPI?.navigate) window.electronAPI.navigate('back'); else window.history.back();
                });
                const fwdBtn = createBtn('forward', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>', () => {
                     if (window.electronAPI?.navigate) window.electronAPI.navigate('forward'); else window.history.forward();
                });
                const refreshBtn = createBtn('refresh', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 4v5h-5"/></svg>', () => {
                     if (window.electronAPI?.navigate) window.electronAPI.navigate('refresh'); else window.location.reload();
                });

                navSection.appendChild(backBtn);
                navSection.appendChild(fwdBtn);
                navSection.appendChild(refreshBtn);

                leftContainer.insertBefore(navSection, leftContainer.firstChild);
            }

            // 4. Inject Window Controls (Right)
            const existingWin = rightContainer.querySelector && rightContainer.querySelector('.window-section');
            if (!existingWin) {
                const windowSection = document.createElement('div');
                windowSection.className = 'window-section';

                // Settings
                const settingsBtn = createBtn('settings', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>', () => {
                     window.electronAPI?.openSettings?.().catch(() => {});
                });
                settingsBtn.classList.add('settings-btn');
                settingsBtn.id = 'better-youtube-settings-btn-v2';

                // Min/Max/Close
                const minBtn = createBtn('minimize', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>', () => window.electronAPI?.windowAction?.('minimize'));
                const maxBtn = createBtn('maximize', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>', () => window.electronAPI?.windowAction?.('maximize'));
                const closeBtn = createBtn('close', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>', () => window.electronAPI?.windowAction?.('close'));
                closeBtn.classList.add('close-btn');

                windowSection.appendChild(settingsBtn);
                windowSection.appendChild(minBtn);
                windowSection.appendChild(maxBtn);
                windowSection.appendChild(closeBtn);

                rightContainer.appendChild(windowSection);
            }
        }

        // Helper
        function createBtn(title, svg, onClick) {
            const btn = document.createElement('button');
            btn.className = title === 'minimize' || title === 'maximize' || title === 'close' ? 'window-btn' : 'nav-btn';
            btn.innerHTML = svg;
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onClick(); };
            return btn;
        }

        function init() {
            injectStyles();
            injectButtons();
        }

        // Run
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
        
        // Resilience
        setInterval(init, 1000); // Check every second
        const obs = new MutationObserver(init);
        obs.observe(document.body, { childList: true, subtree: true });

        console.log('[BrowserUI RENDERER] ✅ Direct Integration V2 Configured');

      }) ();
    `;
    }

    public async onRendererLoaded(window: BrowserWindow): Promise<void> {
        if (!this.isEnabled()) return;
        const script = this.getRendererScript();
        await window.webContents.executeJavaScript(script, true);

        // Inject again on page load events to be safe
        window.webContents.on('did-navigate-in-page', () => {
            window.webContents.executeJavaScript(script, true).catch(() => { });
        });
    }
}
