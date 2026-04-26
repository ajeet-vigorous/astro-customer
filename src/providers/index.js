// Dispatcher — given a backend token response, instantiate the correct provider adapter.
//
// Backend response contract (from /customer/call/token):
// {
//   provider: 'agora' | 'zego' | 'hms',
//   sdkConfig: { ...provider-specific fields... },
//   call_type, callId, token, appID, roomID, userID, channelName, serverUrl
// }
//
// Consumer contract (what the adapter instance exposes):
//   .provider            → the provider name
//   .leave()             → tear down session + release tracks
//   .toggleMic(bool)     → mute/unmute local audio
//   .toggleCamera(bool)  → mute/unmute local video

export async function createCallSession({ tokenResponse, localEl, remoteEl, isVideo }) {
  const provider = (tokenResponse?.provider || '').toLowerCase();
  const sdkConfig = tokenResponse?.sdkConfig;
  if (!sdkConfig) throw new Error('Backend did not return sdkConfig');

  switch (provider) {
    case 'agora': {
      const { createAgoraSession } = await import('./agoraProvider');
      return createAgoraSession({ sdkConfig, localEl, remoteEl, isVideo });
    }
    case 'zego': {
      const { createZegoSession } = await import('./zegoProvider');
      return createZegoSession({ sdkConfig, localEl, remoteEl, isVideo });
    }
    case 'hms': {
      const { createHmsSession } = await import('./hmsProvider');
      return createHmsSession({ sdkConfig, localEl, remoteEl, isVideo });
    }
    default:
      throw new Error(`Unsupported call provider: '${provider}'`);
  }
}
