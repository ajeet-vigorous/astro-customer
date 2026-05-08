// Agora provider adapter. Uses agora-rtc-sdk-ng.
// sdkConfig shape: { appId, channel, token, uid, scenario }

export async function createAgoraSession({ sdkConfig, localEl, remoteEl, isVideo, onStats, onAudioBlocked }) {
  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  // Official Agora pattern for mobile-browser autoplay block.
  // SDK's IRemoteAudioTrack.play() returns void (NOT a Promise) — try/catching the
  // call won't catch autoplay rejections. Instead Agora exposes a global callback
  // AgoraRTC.onAutoplayFailed that fires once when any track's autoplay is blocked.
  // After the user makes ANY gesture on the page (e.g. tapping our overlay), the
  // SDK auto-resumes all blocked audio internally — no need to call play() again.
  if (typeof onAudioBlocked === 'function') {
    AgoraRTC.onAutoplayFailed = () => {
      console.warn('[agora] autoplay blocked — surfacing overlay for user gesture');
      // Pass a no-op retry — SDK handles resume internally on next user interaction
      onAudioBlocked(() => {});
    };
  }

  // CRITICAL: Register `user-published` listener BEFORE join() and publish().
  // If we register after, we miss publish events from peers who joined first
  // (race condition causes one-way audio: we hear them but they don't hear us,
  // depending on join order).
  client.on('user-published', async (remoteUser, mediaType) => {
    try {
      await client.subscribe(remoteUser, mediaType);
      if (mediaType === 'video' && remoteEl && remoteUser.videoTrack) {
        remoteUser.videoTrack.play(remoteEl);
      }
      if (mediaType === 'audio' && remoteUser.audioTrack) {
        // Agora's IRemoteAudioTrack.play() returns void — autoplay-block reporting
        // happens via the global AgoraRTC.onAutoplayFailed callback (wired above).
        remoteUser.audioTrack.play();
      }
    } catch (e) { console.error('Agora subscribe failed:', e); }
  });

  await client.join(sdkConfig.appId, sdkConfig.channel, sdkConfig.token, sdkConfig.uid || 0);

  // Network quality samples — Agora fires every ~2s. uplink/downlink: 1=excellent..6=down.
  // We report the worse of the two as the call's effective quality.
  let statsInterval = null;
  if (typeof onStats === 'function') {
    client.on('network-quality', (q) => {
      const worst = Math.max(q.uplinkNetworkQuality || 0, q.downlinkNetworkQuality || 0);
      if (worst > 0) onStats({ eventType: 'network_quality', value: worst });
    });
    // Sample bitrate + packet-loss every 10s via getRTCStats
    statsInterval = setInterval(() => {
      try {
        const s = client.getRTCStats();
        if (s) {
          const bitrate = Math.round(((s.RecvBitrate || 0) + (s.SendBitrate || 0)) / 1000);
          if (bitrate > 0) onStats({ eventType: 'bitrate_kbps', value: bitrate });
        }
      } catch (_) {}
    }, 10000);
  }

  // ── Noise cancellation: 2-layer stack ──────────────────────────────────────
  // Layer 1 (always): browser-level 3A — AEC (echo), AGC (gain), ANS (noise).
  //   Free, built into WebRTC, supported on every browser. ~95% quality boost
  //   over mic-raw input.
  // Layer 2 (if loadable): Agora AI Denoiser extension — deep-learning model
  //   that removes keyboard/fan/traffic noise. Ships as separate npm + 5.7 MB
  //   WASM (served from /public/agora-ai-denoiser/). Falls back to Layer 1 if
  //   load/init fails (older browsers, missing WASM, plan restrictions).
  let denoiser = null;
  let denoiserProcessor = null;
  try {
    const { AIDenoiserExtension } = await import('agora-extension-ai-denoiser');
    const ext = new AIDenoiserExtension({ assetsPath: '/agora-ai-denoiser' });
    if (ext.checkCompatibility()) {
      AgoraRTC.registerExtensions([ext]);
      denoiser = ext;
    } else {
      console.warn('[agora] AINS not compatible with this browser — using browser 3A only');
    }
  } catch (e) {
    console.warn('[agora] AINS extension load failed, using browser 3A only:', e?.message);
  }

  const localAudio = await AgoraRTC.createMicrophoneAudioTrack({
    AEC: true,
    AGC: true,
    ANS: true,
    encoderConfig: 'speech_standard',
  });

  // If AINS loaded, pipe local audio through the denoiser before publishing
  if (denoiser) {
    try {
      denoiserProcessor = denoiser.createProcessor();
      localAudio.pipe(denoiserProcessor).pipe(localAudio.processorDestination);
      await denoiserProcessor.enable();
      console.log('[agora] AI Noise Suppression active (AINS)');
    } catch (e) {
      console.warn('[agora] AINS processor setup failed, falling back to 3A only:', e?.message);
      denoiserProcessor = null;
    }
  }

  let localVideo = null;
  if (isVideo) {
    localVideo = await AgoraRTC.createCameraVideoTrack();
    if (localEl) localVideo.play(localEl);
  }
  await client.publish(isVideo ? [localAudio, localVideo] : [localAudio]);

  return {
    provider: 'agora',
    async leave() {
      if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
      if (denoiserProcessor) {
        try { await denoiserProcessor.disable(); } catch (_) {}
        try { await denoiserProcessor.destroy(); } catch (_) {}
        denoiserProcessor = null;
      }
      try { localAudio?.stop(); localAudio?.close(); } catch (e) {}
      try { localVideo?.stop(); localVideo?.close(); } catch (e) {}
      try { await client.leave(); } catch (e) {}
    },
    async toggleMic(enabled) {
      try { await localAudio?.setEnabled(enabled); } catch (e) {}
    },
    async toggleCamera(enabled) {
      try { await localVideo?.setEnabled(enabled); } catch (e) {}
    },
    // Renew RTC token mid-call without disconnecting (for long sessions >1hr)
    async renewToken(newToken) {
      try { await client.renewToken(newToken); } catch (e) { console.error('Agora renewToken failed:', e); throw e; }
    },
  };
}
