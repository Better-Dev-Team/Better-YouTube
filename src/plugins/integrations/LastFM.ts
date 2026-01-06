import { BrowserWindow } from 'electron';
import { BasePlugin } from '../Plugin';
import type { PluginMetadata } from '../Plugin';

/**
 * Last.fm Scrobbler Plugin
 * Scrobbles YouTube videos to Last.fm
 */
export class LastFM extends BasePlugin {
  public metadata: PluginMetadata = {
    name: 'lastfm',
    description: 'Scrobble YouTube videos to Last.fm',
    version: '1.0.0',
  };

  private getRendererScript(): string {
    const config = JSON.stringify(this.getConfig());
    return `
    (function() {
      'use strict';
      
      const config = ${config};
      if (!config.enabled || !config.apiKey || !config.apiSecret) return;
      
      let currentVideo = null;
      let scrobbled = false;
      let startTime = null;
      
      // Last.fm API methods
      async function scrobble(artist, track, timestamp) {
        try {
          // Last.fm scrobbling requires authentication
          // This is a simplified version - full implementation would need OAuth
          const response = await fetch('https://ws.audioscrobbler.com/2.0/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              method: 'track.scrobble',
              api_key: config.apiKey,
              sk: config.sessionKey, // Would need OAuth flow
              artist: artist,
              track: track,
              timestamp: timestamp.toString(),
              format: 'json'
            })
          });
          
          const data = await response.json();
          if (data.error) {
            console.error('Last.fm scrobble error:', data.message);
          } else {
            console.log('Last.fm: Scrobbled', track, 'by', artist);
          }
        } catch (error) {
          console.error('Last.fm: Error scrobbling', error);
        }
      }
      
      async function updateNowPlaying(artist, track) {
        try {
          const response = await fetch('https://ws.audioscrobbler.com/2.0/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              method: 'track.updateNowPlaying',
              api_key: config.apiKey,
              sk: config.sessionKey,
              artist: artist,
              track: track,
              format: 'json'
            })
          });
        } catch (error) {
          console.error('Last.fm: Error updating now playing', error);
        }
      }
      
      // Extract artist and track from video title
      function parseVideoTitle(title) {
        // Common patterns: "Artist - Track", "Track (feat. Artist)", etc.
        const patterns = [
          /^(.+?)\\s*-\\s*(.+)$/,  // "Artist - Track"
          /^(.+?)\\s*\\((.+?)\\)$/, // "Track (Artist)"
        ];
        
        for (const pattern of patterns) {
          const match = title.match(pattern);
          if (match) {
            return { artist: match[1].trim(), track: match[2].trim() };
          }
        }
        
        // Default: use channel name as artist, title as track
        const channelName = document.querySelector('#owner-sub-count, #channel-name')?.textContent || 'Unknown Artist';
        return { artist: channelName, track: title };
      }
      
      // Watch for video changes with debouncing
      let checkVideoTimeout: any = null;
      const checkVideo = () => {
        if (checkVideoTimeout) return;
        checkVideoTimeout = setTimeout(() => {
          checkVideoTimeout = null;
          const video = document.querySelector('video');
          const titleElement = document.querySelector('h1.ytd-watch-metadata, h1.ytd-video-primary-info-renderer');
          
          if (video && titleElement) {
            const title = titleElement.textContent || '';
            const videoId = new URLSearchParams(window.location.search).get('v');
            
            if (videoId !== currentVideo?.id) {
              currentVideo = { id: videoId, title };
              scrobbled = false;
              startTime = null;
              
              const { artist, track } = parseVideoTitle(title);
              updateNowPlaying(artist, track);
            }
            
            // Scrobble after 50% or 4 minutes (Last.fm requirement)
            if (!scrobbled && video.currentTime > 0) {
              if (!startTime) startTime = Date.now();
              
              const duration = video.duration || 0;
              const scrobbleThreshold = Math.max(duration * 0.5, 240); // 50% or 4 minutes
              
              if (video.currentTime >= scrobbleThreshold) {
                const { artist, track } = parseVideoTitle(title);
                scrobble(artist, track, Math.floor(startTime / 1000));
                scrobbled = true;
              }
            }
          }
        }, 1000); // Check every second, not on every DOM mutation
      };
      
      function watchVideo() {
        if (!document.body || !(document.body instanceof Node)) {
          setTimeout(watchVideo, 500);
          return;
        }
        
        try {
          // Only observe video info area
          const videoInfo = document.querySelector('ytd-watch-flexy, ytd-video-primary-info-renderer');
          const target = videoInfo || document.body;
          
          const observer = new MutationObserver(checkVideo);
          observer.observe(target, {
            childList: true,
            subtree: videoInfo ? true : false
          });
          
          // Also check periodically (less frequent than DOM mutations)
          setInterval(checkVideo, 2000);
        } catch (error) {
          console.error('Last.fm: Observer error', error);
        }
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(watchVideo, 100);
        });
      } else {
        setTimeout(watchVideo, 100);
      }
    })();
    `;
  }

  public async onRendererLoaded(window: BrowserWindow): Promise<void> {
    if (!this.isEnabled()) return;

    const config = this.getConfig();
    if (!config.apiKey || !config.apiSecret) {
      console.warn('Last.fm: API key or secret not configured');
      return;
    }

    await this.injectRendererScript(window, this.getRendererScript());
  }

  public getConfig() {
    return {
      apiKey: '',
      apiSecret: '',
      sessionKey: '', // Would be obtained through OAuth
      ...super.getConfig(),
    };
  }
}

