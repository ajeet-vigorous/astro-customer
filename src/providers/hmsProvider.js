// 100ms (HMS) provider adapter. Uses @100mslive/hms-video-store.
// sdkConfig shape: { authToken, roomId, userId, userName, role, apiUrl, scenario }

export async function createHmsSession({ sdkConfig, localEl, remoteEl, isVideo }) {
  const store = await import('@100mslive/hms-video-store');
  const { HMSReactiveStore, selectPeers, selectLocalPeer } = store;

  const hms = new HMSReactiveStore();
  hms.triggerOnSubscribe();
  const actions = hms.getActions();
  const hmsStore = hms.getStore();

  await actions.join({
    userName: sdkConfig.userName || `user_${sdkConfig.userId}`,
    authToken: sdkConfig.authToken,
    settings: {
      isAudioMuted: false,
      isVideoMuted: !isVideo,
    },
    metaData: JSON.stringify({ userId: sdkConfig.userId }),
  });

  // Attach local video once peer is registered
  const attachLocalVideo = () => {
    try {
      const local = hmsStore.getState(selectLocalPeer);
      if (local?.videoTrack && localEl) {
        actions.attachVideo(local.videoTrack, localEl);
      }
    } catch (e) { console.error('HMS attach local failed:', e); }
  };

  // Attach/detach remote peers video when the peer list changes
  const remoteUnsub = hmsStore.subscribe((peers) => {
    if (!peers) return;
    attachLocalVideo();
    const remote = peers.find(p => !p.isLocal);
    if (remote?.videoTrack && remoteEl) {
      try { actions.attachVideo(remote.videoTrack, remoteEl); } catch (e) {}
    }
  }, selectPeers);

  // Initial attach attempt (peer may already be present)
  setTimeout(attachLocalVideo, 500);

  return {
    provider: 'hms',
    async leave() {
      try { remoteUnsub && remoteUnsub(); } catch (e) {}
      try { await actions.leave(); } catch (e) {}
    },
    async toggleMic(enabled) {
      try { await actions.setLocalAudioEnabled(enabled); } catch (e) {}
    },
    async toggleCamera(enabled) {
      try { await actions.setLocalVideoEnabled(enabled); } catch (e) {}
    },
  };
}
