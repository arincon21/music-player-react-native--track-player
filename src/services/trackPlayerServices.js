import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';
import RNFS from 'react-native-fs';

const PLAYER_CONFIG = {
  maxCacheSize: 1024 * 10, // 10MB
  iosCategory: 'playback',
  iosMode: 'default',
  updateInterval: 1000, // 1 segundo
};

const CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.Stop,
];

const COMPACT_CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
];

/**
 * Escanea varias carpetas en busca de archivos .mp3
 * @returns {Promise<Array>} Lista de pistas
 */
async function getAllMp3Tracks() {
  const foldersToScan = [
    `${RNFS.ExternalStorageDirectoryPath}/Download`,
    `${RNFS.ExternalStorageDirectoryPath}/Music`,
    `${RNFS.ExternalStorageDirectoryPath}/Documents`,
  ];

  let allMp3Files = [];

  for (const path of foldersToScan) {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) continue;

      const files = await RNFS.readDir(path);
      const mp3Files = files.filter(file => file.isFile() && file.name.toLowerCase().endsWith('.mp3'));

      allMp3Files = allMp3Files.concat(mp3Files);
    } catch (error) {
      console.warn(`Error accediendo a ${path}:`, error);
    }
  }

  return allMp3Files.map((file, index) => ({
    id: `${index}`,
    url: `file://${file.path}`,
    title: decodeURIComponent(file.name.replace('.mp3', '')),
    artist: 'Desconocido',
    duration: 0,
    artwork: require('../../assets/img/portada.jpg'), // Puedes personalizar esto
  }));
}

let isPlayerInitialized = false;
let eventListenersRegistered = false;

export async function setupPlayer() {
  try {
    const isAlreadySetup = await TrackPlayer.isServiceRunning();

    if (isAlreadySetup && isPlayerInitialized) {
      console.log("TrackPlayer ya está inicializado.");
      return true;
    }

    if (!isAlreadySetup) {
      await TrackPlayer.setupPlayer({
        maxCacheSize: PLAYER_CONFIG.maxCacheSize,
        iosCategory: PLAYER_CONFIG.iosCategory,
        iosMode: PLAYER_CONFIG.iosMode,
      });
    }

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: CAPABILITIES,
      compactCapabilities: COMPACT_CAPABILITIES,
      progressUpdateEventInterval: PLAYER_CONFIG.updateInterval,
      notificationCapabilities: CAPABILITIES.filter(cap => 
        cap !== Capability.Stop && cap !== Capability.SeekTo
      ),
    });

    isPlayerInitialized = true;
    console.log("TrackPlayer configurado exitosamente.");
    return true;
  } catch (error) {
    console.error('Error configurando el reproductor:', error);
    isPlayerInitialized = false;
    return false;
  }
}

export async function addTracks() {
  try {
    const currentQueue = await TrackPlayer.getQueue();
    if (currentQueue.length > 0) {
      console.log("Las pistas ya están en la cola.");
      return true;
    }

    const dynamicTracks = await getAllMp3Tracks();

    if (dynamicTracks.length === 0) {
      console.warn('No se encontraron archivos MP3 en las carpetas comunes.');
      return false;
    }

    await TrackPlayer.add(dynamicTracks);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);

    console.log(`Se añadieron ${dynamicTracks.length} pistas a la cola.`);
    return true;
  } catch (error) {
    console.error('Error añadiendo pistas:', error);
    return false;
  }
}

export async function getCurrentTrackInfo() {
  try {
    const currentIndex = await TrackPlayer.getCurrentTrack();
    if (currentIndex === null) return null;
    return await TrackPlayer.getTrack(currentIndex);
  } catch (error) {
    console.error('Error obteniendo información de la pista actual:', error);
    return null;
  }
}

export async function togglePlayback(shouldPlay) {
  try {
    if (shouldPlay) {
      await TrackPlayer.play();
    } else {
      await TrackPlayer.pause();
    }
    return true;
  } catch (error) {
    console.error('Error controlando la reproducción:', error);
    return false;
  }
}

export async function skipToNext() {
  try {
    await TrackPlayer.skipToNext();
    return true;
  } catch (error) {
    console.error('Error saltando a la siguiente pista:', error);
    return false;
  }
}

export async function skipToPrevious() {
  try {
    await TrackPlayer.skipToPrevious();
    return true;
  } catch (error) {
    console.error('Error saltando a la pista anterior:', error);
    return false;
  }
}

export function registerPlaybackService() {
  if (eventListenersRegistered) return;

  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.PlaybackError, (event) => console.error('Error de reproducción:', event));
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => console.log('Cola de reproducción terminada'));
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (event) => console.log('Pista cambiada:', event));

  eventListenersRegistered = true;
  console.log("Event listeners registrados exitosamente.");
}

export function cleanupPlaybackService() {
  if (!eventListenersRegistered) return;

  // No es necesario quitar los listeners si ya está detenido, pero puedes hacerlo si deseas
  eventListenersRegistered = false;
  console.log("Event listeners limpiados.");
}

export async function playbackService() {
  registerPlaybackService();
}
