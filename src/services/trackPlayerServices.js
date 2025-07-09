import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';

// Configuración del reproductor
const PLAYER_CONFIG = {
  maxCacheSize: 1024 * 10, // 10MB
  iosCategory: 'playback',
  iosMode: 'default',
  updateInterval: 1000, // 1 segundo
};

// Configuración de capacidades
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

// Datos de las pistas
const TRACK_DATA = [
  {
    id: '1',
    url: require('../../assets/fluidity-100-ig-edit-4558.mp3'),
    title: "Don't Give Up",
    artist: 'Andy & Lucas',
    duration: 60,
    artwork: require('../../assets/img/portada.jpg'),
  },
  {
    id: '2',
    url: require('../../assets/penguinmusic-modern-chillout-future-calm-12641.mp3'),
    title: 'Lost My Way',
    artist: 'David',
    duration: 66,
    artwork: require('../../assets/img/portada1.jpg'),
  },
  {
    id: '3',
    url: require('../../assets/powerful-beat-121791.mp3'),
    title: 'A Werewolf Boy',
    artist: 'Carole',
    duration: 73,
    artwork: require('../../assets/img/portada2.jpg'),
  },
  {
    id: '4',
    url: require('../../assets/FallOutBoy.mp3'),
    title: 'Fluidity',
    artist: 'tobylane',
    duration: 73,
    artwork: require('../../assets/img/portada.jpg'),
  },
];

let isPlayerInitialized = false;
let eventListenersRegistered = false;

/**
 * Configura el reproductor de música
 * @returns {Promise<boolean>} - true si la configuración fue exitosa
 */
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

/**
 * Añade las pistas a la cola de reproducción
 * @returns {Promise<boolean>} - true si las pistas se añadieron exitosamente
 */
export async function addTracks() {
  try {
    const currentQueue = await TrackPlayer.getQueue();
    
    // Evitar duplicar pistas
    if (currentQueue.length > 0) {
      console.log("Las pistas ya están en la cola.");
      return true;
    }

    await TrackPlayer.add(TRACK_DATA);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    
    console.log(`Se añadieron ${TRACK_DATA.length} pistas a la cola.`);
    return true;
  } catch (error) {
    console.error('Error añadiendo pistas:', error);
    return false;
  }
}

/**
 * Obtiene información de la pista actual
 * @returns {Promise<Object|null>} - Información de la pista o null
 */
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

/**
 * Controla la reproducción (play/pause)
 * @param {boolean} shouldPlay - true para reproducir, false para pausar
 * @returns {Promise<boolean>} - true si la operación fue exitosa
 */
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

/**
 * Salta a la siguiente pista
 * @returns {Promise<boolean>} - true si la operación fue exitosa
 */
export async function skipToNext() {
  try {
    await TrackPlayer.skipToNext();
    return true;
  } catch (error) {
    console.error('Error saltando a la siguiente pista:', error);
    return false;
  }
}

/**
 * Salta a la pista anterior
 * @returns {Promise<boolean>} - true si la operación fue exitosa
 */
export async function skipToPrevious() {
  try {
    await TrackPlayer.skipToPrevious();
    return true;
  } catch (error) {
    console.error('Error saltando a la pista anterior:', error);
    return false;
  }
}

/**
 * Registra los event listeners para el servicio de reproducción
 */
export function registerPlaybackService() {
  if (eventListenersRegistered) {
    console.log("Event listeners ya están registrados.");
    return;
  }

  // Eventos de control remoto
  TrackPlayer.addEventListener(Event.RemotePause, handleRemotePause);
  TrackPlayer.addEventListener(Event.RemotePlay, handleRemotePlay);
  TrackPlayer.addEventListener(Event.RemoteNext, handleRemoteNext);
  TrackPlayer.addEventListener(Event.RemotePrevious, handleRemotePrevious);
  TrackPlayer.addEventListener(Event.RemoteSeek, handleRemoteSeek);
  TrackPlayer.addEventListener(Event.RemoteStop, handleRemoteStop);

  // Eventos de reproducción
  TrackPlayer.addEventListener(Event.PlaybackError, handlePlaybackError);
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, handleQueueEnded);
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, handleTrackChanged);

  eventListenersRegistered = true;
  console.log("Event listeners registrados exitosamente.");
}

/**
 * Limpia los event listeners
 */
export function cleanupPlaybackService() {
  if (!eventListenersRegistered) return;

  TrackPlayer.removeEventListener(Event.RemotePause, handleRemotePause);
  TrackPlayer.removeEventListener(Event.RemotePlay, handleRemotePlay);
  TrackPlayer.removeEventListener(Event.RemoteNext, handleRemoteNext);
  TrackPlayer.removeEventListener(Event.RemotePrevious, handleRemotePrevious);
  TrackPlayer.removeEventListener(Event.RemoteSeek, handleRemoteSeek);
  TrackPlayer.removeEventListener(Event.RemoteStop, handleRemoteStop);
  TrackPlayer.removeEventListener(Event.PlaybackError, handlePlaybackError);
  TrackPlayer.removeEventListener(Event.PlaybackQueueEnded, handleQueueEnded);
  TrackPlayer.removeEventListener(Event.PlaybackTrackChanged, handleTrackChanged);

  eventListenersRegistered = false;
  console.log("Event listeners limpiados.");
}

// Manejadores de eventos
const handleRemotePause = () => {
  console.log('Control remoto: Pausa');
  TrackPlayer.pause();
};

const handleRemotePlay = () => {
  console.log('Control remoto: Reproducir');
  TrackPlayer.play();
};

const handleRemoteNext = () => {
  console.log('Control remoto: Siguiente');
  TrackPlayer.skipToNext();
};

const handleRemotePrevious = () => {
  console.log('Control remoto: Anterior');
  TrackPlayer.skipToPrevious();
};

const handleRemoteSeek = (event) => {
  console.log('Control remoto: Buscar posición:', event.position);
  TrackPlayer.seekTo(event.position);
};

const handleRemoteStop = () => {
  console.log('Control remoto: Detener');
  TrackPlayer.stop();
};

const handlePlaybackError = (event) => {
  console.error('Error de reproducción:', event);
  // Aquí podrías implementar lógica de recuperación
};

const handleQueueEnded = () => {
  console.log('Cola de reproducción terminada');
  // Aquí podrías implementar lógica para manejar el final de la cola
};

const handleTrackChanged = (event) => {
  console.log('Pista cambiada:', event);
  // Aquí podrías implementar lógica adicional cuando cambie la pista
};

// Función legacy para compatibilidad
export async function playbackService() {
  registerPlaybackService();
}