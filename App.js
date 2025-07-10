import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  StatusBar,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import TrackPlayer, {
  useTrackPlayerEvents,
  usePlaybackState,
  useProgress,
  Event,
  State,
} from 'react-native-track-player';
import { setupPlayer, addTracks } from './src/services/trackPlayerServices';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';

const { height: screenHeight } = Dimensions.get('window');
const collapsedHeight = 150;
const expandedHeight = screenHeight;

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const isSetup = await setupPlayer();
        if (isSetup) {
          const queue = await TrackPlayer.getQueue();
          if (queue.length === 0) await addTracks();
        }
        setIsReady(true);
      } catch (err) {
        console.error('Error initializing player:', err);
        setError('Error al inicializar el reproductor');
        setIsReady(true);
      }
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="exclamation-triangle" size={50} color="#f74716" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => { setError(null); setIsReady(false); }}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#1C1C1E" barStyle="light-content" />
      <SafeAreaView style={styles.appContainer}>
        <Playlist />
      </SafeAreaView>
    </>
  );
}

function Playlist() {
  const [queue, setQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrackInfo, setCurrentTrackInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  const playerState = usePlaybackState();
  const progress = useProgress();
  
  // Animated value for the player's position
  const playerPosition = useRef(new Animated.Value(0)).current;
  
  // PanResponder for handling swipe gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderGrant: () => {
      playerPosition.setOffset(playerPosition._value);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Limit the movement to valid bounds
      const newValue = Math.max(
        Math.min(gestureState.dy, 0), 
        -(expandedHeight - collapsedHeight)
      );
      playerPosition.setValue(newValue);
    },
    onPanResponderRelease: (evt, gestureState) => {
      playerPosition.flattenOffset();
      
      const threshold = -screenHeight * 0.3;
      const shouldExpand = gestureState.dy < threshold || gestureState.vy < -0.5;
      
      const toValue = shouldExpand ? -(expandedHeight - collapsedHeight) : 0;
      
      Animated.spring(playerPosition, {
        toValue,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
      
      setIsPlayerExpanded(shouldExpand);
    },
  });

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const query = searchQuery.toLowerCase();
    return queue.filter(
      (track) =>
        track.title?.toLowerCase().includes(query) ||
        track.artist?.toLowerCase().includes(query)
    );
  }, [queue, searchQuery]);

  const loadPlaylist = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedQueue, currentIndex] = await Promise.all([
        TrackPlayer.getQueue(), 
        TrackPlayer.getCurrentTrack()
      ]);
      const trackInfo = currentIndex != null ? await TrackPlayer.getTrack(currentIndex) : null;
      setQueue(loadedQueue || []);
      setCurrentTrackInfo(trackInfo);
    } catch (error) {
      console.error('Error loading playlist:', error);
      Alert.alert('Error', 'No se pudo cargar la lista de reproducción');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadPlaylist(); 
  }, [loadPlaylist]);

  useTrackPlayerEvents([Event.PlaybackTrackChanged], async (event) => {
    if (event.nextTrack != null) {
      const track = await TrackPlayer.getTrack(event.nextTrack);
      setCurrentTrackInfo(track);
    }
  });

  const handleSearch = useCallback((text) => setSearchQuery(text), []);
  
  const togglePlayback = useCallback(async () => {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, []);
  
  const handleTrackSelect = useCallback(async (id) => {
    const index = queue.findIndex((track) => track.id === id);
    if (index !== -1) {
      await TrackPlayer.skip(index);
    }
  }, [queue]);

  const collapsePlayer = useCallback(() => {
    Animated.spring(playerPosition, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    setIsPlayerExpanded(false);
  }, [playerPosition]);

  const renderItem = useCallback(({ item }) => (
    <PlaylistItem 
      item={item} 
      isCurrent={currentTrackInfo?.id === item.id} 
      onPress={() => handleTrackSelect(item.id)} 
      isPlaying={playerState === State.Playing}
    />
  ), [currentTrackInfo?.id, handleTrackSelect, playerState]);

  const getItemLayout = useCallback((data, index) => ({
    length: 76, 
    offset: 76 * index, 
    index 
  }), []);

  if (isLoading) {
    return (
      <LinearGradient colors={['#363a42', '#091117']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Cargando música...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Calculate opacity for different elements based on player position
  const listOpacity = playerPosition.interpolate({
    inputRange: [-(expandedHeight - collapsedHeight) * 0.5, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const collapsedOpacity = playerPosition.interpolate({
    inputRange: [-150, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const expandedOpacity = playerPosition.interpolate({
    inputRange: [-(expandedHeight - collapsedHeight), -(expandedHeight - collapsedHeight) + 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient colors={['#363a42', '#091117']} style={styles.container}>
      <Header searchQuery={searchQuery} onSearch={handleSearch} />
      
      <Animated.View style={[styles.mainContentList, { opacity: listOpacity }]}>
        <FlatList 
          data={filteredQueue} 
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()} 
          showsVerticalScrollIndicator={false} 
          renderItem={renderItem} 
          ListEmptyComponent={<EmptyState searchQuery={searchQuery} />} 
          initialNumToRender={10} 
          getItemLayout={getItemLayout} 
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.bottomControls, 
          { 
            transform: [{ translateY: playerPosition }] 
          }
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[styles.expandedView, { opacity: expandedOpacity }]}>
          <ExpandedPlayer 
            track={currentTrackInfo} 
            progress={progress} 
            onCollapse={collapsePlayer} 
            togglePlayback={togglePlayback} 
            playerState={playerState} 
          />
        </Animated.View>
        
        <Animated.View style={[styles.collapsedView, { opacity: collapsedOpacity }]}>
          <NowPlayingCard track={currentTrackInfo} progress={progress} />
        </Animated.View>
        
        <TouchableOpacity 
          style={styles.playButtonLarge} 
          onPress={togglePlayback} 
          activeOpacity={0.8}
        >
          <Icon 
            name={playerState === State.Playing ? 'pause' : 'play'} 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Header = memo(({ searchQuery, onSearch }) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Mi Música</Text>
    <View style={styles.searchContainer}>
      <TextInput 
        value={searchQuery} 
        onChangeText={onSearch} 
        placeholder="Buscar música..." 
        placeholderTextColor="#999" 
        style={styles.searchInput} 
      />
      <Icon name="search" size={18} color="#999" style={styles.searchIcon} />
    </View>
  </View>
));

const NowPlayingCard = memo(({ track, progress }) => {
  if (!track) return null;
  return (
    <View style={styles.nowPlayingCard}>
      <View style={styles.nowPlayingAlbumImage}>
        <Image 
          source={track.artwork} 
          style={styles.nowPlayingAlbumArt} 
          resizeMode="cover" 
        />
      </View>
      <View style={styles.nowPlayingContent}>
        <Text style={styles.nowPlayingTitle} numberOfLines={1}>
          {track.title || 'Canción desconocida'}
        </Text>
        <Text style={styles.nowPlayingArtist} numberOfLines={1}>
          {track.artist || 'Artista desconocido'}
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(progress.position / progress.duration) * 100 || 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.timeText}>
            {formatTime(progress.position)} / {formatTime(progress.duration)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const PlaylistItem = memo(({ item, isCurrent, onPress, isPlaying }) => (
  <TouchableOpacity 
    style={isCurrent ? styles.playlistItemContainerActive : styles.playlistItemContainer} 
    activeOpacity={0.7} 
    onPress={() => onPress(item.id)}
  >
    <View style={styles.albumArt}>
      <Image 
        source={item.artwork} 
        style={styles.albumArtImage} 
        resizeMode="cover" 
      />
    </View>
    <View style={styles.trackInfo}>
      <Text style={styles.trackTitle} numberOfLines={1}>
        {item.title || 'Canción desconocida'}
      </Text>
      <Text style={styles.trackArtist} numberOfLines={1}>
        {item.artist || 'Artista desconocido'}
      </Text>
    </View>
    {isCurrent && (
      <View style={styles.currentTrackIndicator}>
        <AnimatedSoundWave isPlaying={isPlaying} />
      </View>
    )}
    {!isCurrent && (
      <View style={styles.currentTrackIndicator}>
        <Text style={styles.trackDuration}>{formatTime(item.duration)}</Text>
      </View>
    )}
  </TouchableOpacity>
));

const ExpandedPlayer = memo(({ track, progress, onCollapse, togglePlayback, playerState }) => {
  if (!track) return null;
  return (
    <SafeAreaView style={styles.expandedContainer}>
      <TouchableOpacity onPress={onCollapse} style={styles.collapseButton}>
        <Icon name="chevron-down" size={28} color="#9b9a97" />
      </TouchableOpacity>
      
      <View style={styles.expandedArtWrapper}>
        <Image 
          source={track.artwork} 
          style={styles.expandedAlbumArt} 
          resizeMode="cover" 
        />
      </View>
      
      <View style={styles.expandedTrackDetails}>
        <Text style={styles.expandedTitle} numberOfLines={2}>
          {track.title}
        </Text>
        <Text style={styles.expandedArtist}>
          {track.artist}
        </Text>
      </View>
      
      <View style={styles.expandedProgressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(progress.position / progress.duration) * 100 || 0}%` }
            ]} 
          />
        </View>
        <View style={styles.expandedTimeWrapper}>
          <Text style={styles.timeText}>{formatTime(progress.position)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
        </View>
      </View>
      
      <View style={styles.expandedControls}>
        <TouchableOpacity onPress={() => TrackPlayer.skipToPrevious()}>
          <Icon name="step-backward" size={32} color="#3e3f43" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.expandedPlayButton} onPress={togglePlayback}>
          <Icon 
            name={playerState === State.Playing ? 'pause' : 'play'} 
            size={38} 
            color="#FFF" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => TrackPlayer.skipToNext()}>
          <Icon name="step-forward" size={32} color="#3e3f43" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const AnimatedSoundWave = memo(({ isPlaying }) => {
  const bar1Height = useRef(new Animated.Value(12)).current;
  const bar2Height = useRef(new Animated.Value(20)).current;
  const bar3Height = useRef(new Animated.Value(16)).current;
  
  useEffect(() => {
    const createAnimation = (val, min, max) => 
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { 
            toValue: max, 
            duration: 300 + Math.random() * 200, 
            useNativeDriver: false 
          }),
          Animated.timing(val, { 
            toValue: min, 
            duration: 300 + Math.random() * 200, 
            useNativeDriver: false 
          }),
        ])
      );
      
    if (isPlaying) {
      const animations = [
        createAnimation(bar1Height, 8, 18),
        createAnimation(bar2Height, 12, 24),
        createAnimation(bar3Height, 10, 20)
      ];
      
      animations.forEach((anim, i) => 
        setTimeout(() => anim.start(), i * 100)
      );
      
      return () => animations.forEach(anim => anim.stop());
    } else {
      [bar1Height, bar2Height, bar3Height].forEach((bar, i) => 
        Animated.timing(bar, { 
          toValue: [12, 20, 16][i], 
          duration: 200, 
          useNativeDriver: false 
        }).start()
      );
    }
  }, [isPlaying, bar1Height, bar2Height, bar3Height]);
  
  return (
    <View style={styles.soundWave}>
      <Animated.View style={[styles.bar, { height: bar1Height }]} />
      <Animated.View style={[styles.bar, { height: bar2Height }]} />
      <Animated.View style={[styles.bar, { height: bar3Height }]} />
    </View>
  );
});

const EmptyState = memo(({ searchQuery }) => (
  <View style={styles.noResultsContainer}>
    <Icon name="music" size={50} color="#666" />
    <Text style={styles.noResultsText}>
      {searchQuery ? 'No se encontraron resultados' : 'No hay música disponible'}
    </Text>
    <Text style={styles.noResultsSubtext}>
      {searchQuery ? 'Intenta con otro término' : 'Agrega música a tu biblioteca'}
    </Text>
  </View>
));

const styles = StyleSheet.create({
  appContainer: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E' 
  },
  loadingText: { 
    color: '#FFD700', 
    marginTop: 10, 
    fontSize: 16 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    padding: 20 
  },
  errorText: { 
    color: '#f74716', 
    fontSize: 18, 
    textAlign: 'center', 
    marginVertical: 20 
  },
  retryButton: { 
    backgroundColor: '#f74716', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  retryButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  container: { 
    flex: 1, 
    overflow: 'hidden' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingTop: 20, 
    paddingBottom: 20 
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#2c2c2e66', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    minWidth: 200, 
    height: 44 
  },
  searchInput: { 
    flex: 1, 
    color: '#FFFFFF', 
    fontSize: 16, 
    paddingVertical: 0 
  },
  searchIcon: { 
    marginLeft: 10 
  },
  mainContentList: { 
    flex: 1, 
    paddingHorizontal: 10 
  },
  nowPlayingCard: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  nowPlayingContent: { 
    flex: 1, 
    paddingHorizontal: 15, 
    justifyContent: 'center' 
  },
  nowPlayingAlbumArt: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: '#595959', 
    borderRadius: 15 
  },
  nowPlayingTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#3e3f43', 
    marginBottom: 4 
  },
  nowPlayingArtist: { 
    fontSize: 14, 
    color: '#9b9a97', 
    marginBottom: 8 
  },
  progressContainer: { 
    alignItems: 'center' 
  },
  progressBar: { 
    height: 4, 
    backgroundColor: '#e0e0e0', 
    borderRadius: 2, 
    width: '100%', 
    marginBottom: 4 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#f74716', 
    borderRadius: 2 
  },
  timeText: { 
    fontSize: 12, 
    color: '#9b9a97' 
  },
  noResultsContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  noResultsText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#666', 
    marginTop: 20 
  },
  noResultsSubtext: { 
    fontSize: 14, 
    color: '#999', 
    marginTop: 8 
  },
  playlistItemContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 10, 
    padding: 10 
  },
  playlistItemContainerActive: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#00000030', 
    borderRadius: 10, 
    padding: 10 
  },
  albumArt: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    overflow: 'hidden', 
    marginRight: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4.65, 
    elevation: 8 
  },
  trackInfo: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  trackTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#bfc2c1' 
  },
  trackArtist: { 
    fontSize: 14, 
    color: '#626c74' 
  },
  trackDuration: { 
    fontSize: 12, 
    color: '#626c74' 
  },
  currentTrackIndicator: { 
    marginLeft: 12, 
    minWidth: 40, 
    alignItems: 'center' 
  },
  soundWave: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  bar: { 
    width: 3, 
    backgroundColor: '#f74716', 
    marginHorizontal: 1, 
    borderRadius: 2 
  },
  albumArtImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 23 
  },
  nowPlayingAlbumImage: { 
    width: 70, 
    height: 70, 
    shadowColor: '#202020', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4.65, 
    elevation: 8 
  },
  bottomControls: {
    position: 'absolute',
    paddingHorizontal: 30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: '#fff',
    height: expandedHeight,
    bottom: -(expandedHeight - collapsedHeight),
    left: 0,
    right: 0,
    zIndex: 100,
  },
  playButtonLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f74716',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f74716',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    position: 'absolute',
    right: 30,
    top: -30,
    zIndex: 101,
  },
  collapsedView: {
    height: collapsedHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  expandedContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  collapseButton: {
    padding: 10,
    marginBottom: 10,
  },
  expandedArtWrapper: {
    width: '85%',
    aspectRatio: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    marginBottom: 40,
  },
  expandedAlbumArt: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  expandedTrackDetails: {
    alignItems: 'center',
    marginBottom: 30,
  },
  expandedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3e3f43',
    textAlign: 'center',
  },
  expandedArtist: {
    fontSize: 18,
    color: '#9b9a97',
    marginTop: 8,
  },
  expandedProgressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  expandedTimeWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  expandedControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '80%',
  },
  expandedPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f74716',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f74716',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
});

export default memo(App);