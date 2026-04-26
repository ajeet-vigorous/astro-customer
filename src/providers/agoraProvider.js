// Agora provider adapter. Uses agora-rtc-sdk-ng.
// sdkConfig shape: { appId, channel, token, uid, scenario }

export async function createAgoraSession({ sdkConfig, localEl, remoteEl, isVideo }) {
  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  await client.join(sdkConfig.appId, sdkConfig.channel, sdkConfig.token, sdkConfig.uid || 0);

  const localAudio = await AgoraRTC.createMicrophoneAudioTrack();
  let localVideo = null;
  if (isVideo) {
    localVideo = await AgoraRTC.createCameraVideoTrack();
    if (localEl) localVideo.play(localEl);
  }
  await client.publish(isVideo ? [localAudio, localVideo] : [localAudio]);

  client.on('user-published', async (remoteUser, mediaType) => {
    try {
      await client.subscribe(remoteUser, mediaType);
      if (mediaType === 'video' && remoteEl && remoteUser.videoTrack) {
        remoteUser.videoTrack.play(remoteEl);
      }
      if (mediaType === 'audio' && remoteUser.audioTrack) {
        remoteUser.audioTrack.play();
      }
    } catch (e) { console.error('Agora subscribe failed:', e); }
  });

  return {
    provider: 'agora',
    async leave() {
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
  };
}
