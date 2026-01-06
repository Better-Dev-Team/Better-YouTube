import { BrowserWindow } from 'electron';
import { BasePlugin } from '../Plugin';
import type { PluginMetadata } from '../Plugin';

/**
 * Volume Booster Plugin
 * Amplifies volume up to 10x using Web Audio API
 */
export class VolumeBooster extends BasePlugin {
  public metadata: PluginMetadata = {
    name: 'volume-booster',
    description: 'Boost volume up to 10x (1000%)',
    version: '1.0.0',
  };

  private getRendererScript(): string {
    const config = JSON.stringify(this.getConfig());
    return `
    (function() {
      'use strict';
      
      const config = ${config};
      if (!config.enabled) return;

      console.log('[VolumeBooster] Initializing...');

      let audioContext = null;
      let sourceNode = null;
      let gainNode = null;
      let isHooked = false;

      // Initialize Web Audio API
      function initAudio() {
        if (isHooked) return;
        
        const video = document.querySelector('video');
        if (!video) return;

        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;

          if (!audioContext) audioContext = new AudioContext();

          if (!video.__volumeBoosterAttached) {
             sourceNode = audioContext.createMediaElementSource(video);
             gainNode = audioContext.createGain();
             
             sourceNode.connect(gainNode);
             gainNode.connect(audioContext.destination);
             
             video.__volumeBoosterAttached = true;
             video.__gainNode = gainNode;
             isHooked = true;
          } else {
             gainNode = video.__gainNode;
             isHooked = true;
          }
        } catch (e) {
          console.error('[VolumeBooster] Error initializing audio:', e);
        }
      }

      function createVolumeBtn() {
        const btn = document.createElement('button');
        btn.id = 'volume-booster-btn';
        btn.className = 'nav-btn'; 
        btn.title = 'Volume Boost (Click to toggle, Scroll to adjust)';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
        
        btn.style.cssText = \`
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          padding: 0 10px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-app-region: no-drag;
          transition: color 0.2s;
          position: relative;
        \`;

        // Toggle on click
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVolumeDropdown(btn);
        });
        
        // Scroll to change volume
        btn.addEventListener('wheel', (e) => {
            e.preventDefault();
            adjustVolume(e.deltaY < 0 ? 0.1 : -0.1);
        }, { passive: false });

        btn.addEventListener('mouseenter', () => {
          btn.style.color = '#fff';
        });
        
        btn.addEventListener('mouseleave', () => {
           if (!document.getElementById('volume-booster-dropdown')) {
             btn.style.color = 'rgba(255, 255, 255, 0.7)';
           }
        });

        return btn;
      }

      function adjustVolume(delta) {
        if (!gainNode) return;
        
        let newVal = gainNode.gain.value + delta;
        // Clamp between 1 (100%) and 10 (1000%)
        if (newVal < 1) newVal = 1;
        if (newVal > 10) newVal = 10;
        
        gainNode.gain.value = newVal;
        
        // Update slider if open
        const slider = document.querySelector('#volume-booster-dropdown input[type="range"]');
        const label = document.querySelector('#volume-booster-dropdown span');
        
        if (slider) slider.value = newVal;
        if (label) label.textContent = Math.round(newVal * 100) + '%';
        
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (!isHooked) initAudio();
      }

      function toggleVolumeDropdown(parentItem) {
         const existing = document.getElementById('volume-booster-dropdown');
         if (existing) {
             existing.remove();
             parentItem.style.color = 'rgba(255, 255, 255, 0.7)';
             return;
         }

         parentItem.style.color = '#fff';
         
         const dropdown = document.createElement('div');
         dropdown.id = 'volume-booster-dropdown';
         dropdown.style.cssText = \`
            position: fixed;
            top: 38px;
            right: 120px;
            background: #212121;
            border: 1px solid #303030;
            border-radius: 8px;
            padding: 15px;
            min-width: 200px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            gap: 10px;
         \`;
         
         // Calculate position dynamically
         const rect = parentItem.getBoundingClientRect();
         dropdown.style.left = (rect.left - 100) + 'px'; 
         dropdown.style.top = (rect.bottom + 5) + 'px';
         dropdown.style.right = 'auto';

         const title = document.createElement('div');
         title.textContent = 'Volume Multiplier';
         title.style.fontSize = '12px';
         title.style.color = '#aaa';
         title.style.fontWeight = '600';
         title.style.textTransform = 'uppercase';
         title.style.letterSpacing = '0.5px';
         
         const sliderContainer = document.createElement('div');
         sliderContainer.style.display = 'flex';
         sliderContainer.style.alignItems = 'center';
         sliderContainer.style.gap = '10px';
         
         const slider = document.createElement('input');
         slider.type = 'range';
         slider.min = '1';
         slider.max = '10';
         slider.step = '0.1';
         slider.value = (gainNode && gainNode.gain.value) || '1';
         slider.style.width = '100%';
         slider.style.accentColor = '#a855f7'; 
         
         const label = document.createElement('span');
         label.textContent = Math.round(slider.value * 100) + '%';
         label.style.minWidth = '45px';
         label.style.textAlign = 'right';
         label.style.fontSize = '12px';
         label.style.fontVariantNumeric = 'tabular-nums';
         
         slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            if (gainNode) gainNode.gain.value = val;
            label.textContent = Math.round(val * 100) + '%';
            
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            if (!isHooked) initAudio();
         };
         
         sliderContainer.appendChild(slider);
         sliderContainer.appendChild(label);
         
         dropdown.appendChild(title);
         dropdown.appendChild(sliderContainer);
         
         // Scroll support on dropdown
         dropdown.addEventListener('wheel', (e) => {
            e.preventDefault();
            adjustVolume(e.deltaY < 0 ? 0.1 : -0.1);
         }, { passive: false });
         
         // Close on click outside
         const closeHandler = (e) => {
             if (!dropdown.contains(e.target) && e.target !== parentItem && !parentItem.contains(e.target)) {
                 dropdown.remove();
                 parentItem.style.color = 'rgba(255, 255, 255, 0.7)';
                 document.removeEventListener('click', closeHandler);
             }
         };
         
         // Delay adding click listener to avoid immediate close
         setTimeout(() => {
             document.addEventListener('click', closeHandler);
         }, 0);
         
         dropdown.addEventListener('click', (e) => e.stopPropagation());

         document.body.appendChild(dropdown);
      }

      const tryInject = () => {
        // Prevent duplicate injection
        const existingBtn = document.getElementById('volume-booster-btn');
        if (existingBtn) return true;
        
        // Also check if inside shadow root (Standard YouTube)
        const masthead = document.querySelector('ytd-masthead');
        if (masthead && masthead.shadowRoot && masthead.shadowRoot.getElementById('volume-booster-btn')) return true;
        
        // 1. Try standard lookup (YouTube Music or global)
        let settingsBtn = document.getElementById('better-youtube-settings-btn-v2') 
                          || document.querySelector('.window-section .settings-btn');
        
        // 2. Try Standard YouTube Shadow DOM
        if (!settingsBtn) {
            if (masthead && masthead.shadowRoot) {
                settingsBtn = masthead.shadowRoot.getElementById('better-youtube-settings-btn-v2') 
                             || masthead.shadowRoot.querySelector('.window-section .settings-btn');
            }
        }
        
        if (settingsBtn) {
            const container = settingsBtn.parentElement;
            if (container) {
                const btn = createVolumeBtn();
                container.insertBefore(btn, settingsBtn);
                console.log('[VolumeBooster] Injected successfully');
                return true;
            }
        }
        return false;
      };

      function injectIntoTitleBar() {
        if (tryInject()) return;
        
        // Observer for late injection
        const obs = new MutationObserver((mutations, observer) => {
            if (tryInject()) observer.disconnect();
        });
        obs.observe(document.body, { childList: true, subtree: true });
      }

      // Main loop
      const interval = setInterval(() => {
         tryInject();
      }, 1000);
      
      // Initial try
      injectIntoTitleBar();

    })();
    `;
  }

  public async onRendererLoaded(window: BrowserWindow): Promise<void> {
    if (!this.isEnabled()) return;
    await window.webContents.executeJavaScript(this.getRendererScript(), true);
  }
}
