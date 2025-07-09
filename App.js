import React, { useEffect, useState, useCallback, memo } from 'react';
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
  StatusBar
} from 'react-native';
import TrackPlayer, {
  useTrackPlayerEvents,
  usePlaybackState,
  Event,
  State,
} from 'react-native-track-player';
import { setupPlayer, addTracks } from './src/services/trackPlayerServices';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import ProgressSlider from './src/components/ProgressSlider';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const isSetup = await setupPlayer();
      const queue = await TrackPlayer.getQueue();
      if (isSetup && queue.length === 0) await addTracks();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
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
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrackInfo, setCurrentTrackInfo] = useState(null);

  const playerState = usePlaybackState();

  const loadPlaylist = useCallback(async () => {
    try {
      const [loadedQueue, currentIndex] = await Promise.all([
        TrackPlayer.getQueue(),
        TrackPlayer.getCurrentTrack(),
      ]);
      const trackInfo =
        currentIndex !== null ? await TrackPlayer.getTrack(currentIndex) : null;
      setQueue(loadedQueue);
      setFilteredQueue(loadedQueue);
      setCurrentTrackInfo(trackInfo);
    } catch (e) {
      console.error('Error loading playlist', e);
    }
  }, []);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  useTrackPlayerEvents([Event.PlaybackTrackChanged], async () => {
    const index = await TrackPlayer.getCurrentTrack();
    if (index !== null) {
      const track = await TrackPlayer.getTrack(index);
      setCurrentTrackInfo(track);
    }
  });

  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (!text.trim()) return setFilteredQueue(queue);
    const query = text.toLowerCase();
    setFilteredQueue(
      queue.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query)
      )
    );
  }, [queue]);

  const togglePlayback = useCallback(async () => {
    try {
      if (playerState === State.Playing) await TrackPlayer.pause();
      else await TrackPlayer.play();
    } catch (e) {
      console.error(e);
    }
  }, [playerState]);

  const handleTrackSelect = useCallback(
    async (id) => {
      const index = queue.findIndex((t) => t.id === id);
      if (index !== -1) await TrackPlayer.skip(index);
    },
    [queue]
  );

  return (
    <View style={styles.container}>
      <View style={{ backgroundColor: '#1C1C1E', height: 420, marginBottom: 70, borderBottomLeftRadius: 60, position: 'relative' }}>
        <Header searchQuery={searchQuery} onSearch={handleSearch} />
        <Sidebar
          label="Informacion General"
          dark={true}
        />
        <View style={styles.mainContent}>
          <NowPlayingCard
            track={currentTrackInfo}
          />
        </View>
      </View>
      <LinearGradient
        colors={['#e8e8e8', '#ffffff']}
        start={{ x: 0.50, y: 1.00 }}
        end={{ x: 0.50, y: 0.60 }}
        style={{ flex: 1, borderBottomLeftRadius: 60, position: 'relative' }}
      >
        <Sidebar
          label="Lista de Reproducción"
          dark={false}
        />
        <View style={styles.mainContentList}>
          <FlatList
            data={filteredQueue}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PlaylistItem
                item={item}
                isCurrent={currentTrackInfo?.id === item.id}
                onPress={() => handleTrackSelect(item.id)}
              />
            )}
            ListEmptyComponent={<EmptyState />}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={21}
            getItemLayout={(_, i) => ({
              length: 76,
              offset: 76 * i,
              index: i,
            })}
          />
        </View>
      </LinearGradient>
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.playButtonLarge} onPress={togglePlayback}>
          <Icon name={playerState === State.Playing ? 'pause' : 'play'} size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <ProgressSlider />
        </View>
      </View>
    </View>
  );
}

// COMPONENTES INTERNO-OPTIMIZADOS

const Header = memo(({ searchQuery, onSearch }) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Music</Text>
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

const Sidebar = memo(({ label, dark = true }) => (
  <View style={styles.sidebar}>
    <Text
      style={dark ? styles.sidebarItemActive : styles.sidebarItem}
    >
      --- {label} ---
    </Text>
  </View>
));

const NowPlayingCard = memo(({ track }) => {
  if (!track) return null;

  return (
    <View style={styles.nowPlayingCard}>
      <LinearGradient
        colors={['#eecf62', '#f1c54a', '#efbe49']}
        style={styles.nowPlayingGradient}
      >
        <View style={styles.nowPlayingContent}>
          <View style={styles.nowPlayingAlbumArt}>
            <Image source={track.artwork} style={styles.nowPlayingAlbumImage} resizeMode="cover" />
          </View>
          <Text style={styles.nowPlayingTitle}>{track.title}</Text>
          <Text style={styles.nowPlayingArtist}>{track.artist}</Text>
        </View>
      </LinearGradient>
    </View>
  );
});


const PlaylistItem = memo(({ item, isCurrent, onPress }) => (
  <TouchableOpacity
    style={isCurrent ? styles.playlistItemContainerActive : styles.playlistItemContainer}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={styles.albumArt}>
      <Image source={item.artwork} style={styles.albumArtImage} resizeMode="cover" />
    </View>
    <View style={styles.trackInfo}>
      <Text style={styles.trackTitle}>{item.title}</Text>
      <Text style={styles.trackArtist}>{item.artist}</Text>
    </View>
    {isCurrent && (
      <View style={styles.currentTrackIndicator}>
        <View style={styles.soundWave}>
          <View style={[styles.bar, styles.bar1]} />
          <View style={[styles.bar, styles.bar2]} />
          <View style={[styles.bar, styles.bar3]} />
        </View>
      </View>
    )}
  </TouchableOpacity>
));


const Controls = memo(({ onPrev, onPlayPause, onNext, onShuffle, isPlaying }) => (
  <View style={styles.bottomNav}>
    <TouchableOpacity onPress={onPrev} style={styles.navItem}>
      <Icon name="arrow-left" size={28} color="#FFF" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onPlayPause} style={styles.navItem}>
      <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#FFF" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onNext} style={styles.navItem}>
      <Icon name="arrow-right" size={28} color="#FFF" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onShuffle} style={styles.navItem}>
      <Icon name="random" size={28} color="#FFF" />
    </TouchableOpacity>
  </View>
));

const EmptyState = () => (
  <View style={styles.noResultsContainer}>
    <Icon name="music" size={50} color="#666" />
    <Text style={styles.noResultsText}>No se encontró música</Text>
    <Text style={styles.noResultsSubtext}>Intenta con otro término</Text>
  </View>
);


const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    minWidth: 230,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
  },
  searchIcon: {
    marginLeft: 10,
  },
  sidebar: {
    position: 'absolute',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    height: '100%',
  },
  sidebarItem: {
    color: '#393939',
    fontSize: 16,
    transform: [{ rotate: '-90deg' }],
    textAlign: 'center',
    width: 300,
  },
  sidebarItemActive: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
    textAlign: 'center',
    width: 300,
  },
  mainContent: {
    flex: 1,
    marginLeft: 80,
    paddingHorizontal: 20,
  },
  mainContentList: {
    flex: 1,
    marginLeft: 80,
    paddingHorizontal: 20,
  },
  nowPlayingCard: {
    height: 370,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    marginTop: 20,
    marginRight: 10,
    shadowColor: '#f1c54a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  nowPlayingGradient: {
    flex: 1,
    position: 'relative',
  },
  nowPlayingContent: {
    alignItems: 'flex-end',
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  nowPlayingAlbumArt: {
    width: 160,
    height: 160,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  nowPlayingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  nowPlayingArtist: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    textAlign: 'left',
    width: '100%',
  },
  // Nuevos estilos para el progress bar en NowPlayingCard
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playButtonLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1c54a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  playlistSection: {
    flex: 1,
  },
  playlistList: {
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  playlistItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 10,
    padding: 10,
  },
  playlistItemContainerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#00000008',
    borderRadius: 10,
    padding: 10,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6f7177',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#babcc2',
  },
  currentTrackIndicator: {
    marginLeft: 12,
  },
  soundWave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 3,
    backgroundColor: '#FFD700',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  bar1: {
    height: 12,
  },
  bar2: {
    height: 20,
  },
  bar3: {
    height: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  navItem: {
    padding: 12,
  },
  navItemActive: {
    padding: 12,
  },
  miniControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(44, 44, 46, 0.9)',
    borderRadius: 12,
    padding: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressContainer: {
    flex: 1,
  },
  albumArtImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  nowPlayingAlbumImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bottomControls: {
    height: 100,
    flexDirection: "row",
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#fff',
  },
  playButtonLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1c54a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#f1c54a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    height: 60,
  },
});

export default App;