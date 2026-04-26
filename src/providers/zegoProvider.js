// Zego provider adapter. Uses zego-express-engine-webrtc.
// sdkConfig shape: { appID, token, roomID, userID, userName, serverUrl, scenario }

export async function createZegoSession({ sdkConfig, localEl, remoteEl, isVideo }) {
  const mod = await import('zego-express-engine-webrtc');
  const ZegoExpressEngine = mod.ZegoExpressEngine || mod.default;
  if (!ZegoExpressEngine) throw new Error('Zego SDK not loaded');

  const zg = new ZegoExpressEngine(
    parseInt(sdkConfig.appID),
    sdkConfig.serverUrl || 'wss://webliveroom-api.zegocloud.com/ws'
  );

  await zg.loginRoom(sdkConfig.roomID, sdkConfig.token, {
    userID: String(sdkConfig.userID),
    userName: sdkConfig.userName || `user_${sdkConfig.userID}`,
  });

  const localStream = await zg.createStream({ camera: { audio: true, video: isVideo } });
  if (localEl) localEl.srcObject = localStream;
  const publishStreamId = `stream_${sdkConfig.userID}`;
  await zg.startPublishingStream(publishStreamId, localStream);

  const remoteStreams = new Map();

  zg.on('roomStreamUpdate', async (rid, updateType, streamList) => {
    if (updateType === 'ADD') {
      for (const s of streamList) {
        try {
          const remote = await zg.startPlayingStream(s.streamID);
          remoteStreams.set(s.streamID, remote);
          if (remoteEl) remoteEl.srcObject = remote;
        } catch (e) { console.error('Zego play remote failed:', e); }
      }
    } else if (updateType === 'DELETE') {
      for (const s of streamList) {
        try { zg.stopPlayingStream(s.streamID); } catch (e) {}
        remoteStreams.delete(s.streamID);
      }
    }
  });

  return {
    provider: 'zego',
    async leave() {
      try { await zg.stopPublishingStream(publishStreamId); } catch (e) {}
      try { zg.destroyStream(localStream); } catch (e) {}
      try { await zg.logoutRoom(sdkConfig.roomID); } catch (e) {}
      try { zg.destroyEngine(); } catch (e) {}
    },
    async toggleMic(enabled) {
      try { zg.mutePublishStreamAudio(localStream, !enabled); } catch (e) {}
    },
    async toggleCamera(enabled) {
      try { zg.mutePublishStreamVideo(localStream, !enabled); } catch (e) {}
    },
  };
}
