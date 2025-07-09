import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const MusicPlayerCard = ({
    albumArt,
    songTitle,
    artistName,
}) => {
    return (
        <View style={styles.container}>

            {/* Contenido principal */}
            <LinearGradient
                colors={['#ffffff', '#dbdbdb']}
                style={styles.cardContainer}
            >

                    {/* Imagen del álbum */}
                    <View style={styles.albumArtContainer}>
                        <Image
                            source={{ uri: albumArt }}
                            style={styles.albumArt}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Información de la canción */}
                    <View style={styles.songInfo}>
                        <Text style={styles.songTitle}>{songTitle}</Text>
                        <Text style={styles.artistName}>{artistName}</Text>
                    </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: width,
        alignSelf: 'center',
        position: 'absolute',
        top: 0,
        zIndex: 1000,
    },

    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    albumArtContainer: {
        width: 55,
        height: 55,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
        backgroundColor: '#383838', // Fondo para el caso de que la imagen falle
    },
    albumArt: {
        width: '100%',
        height: '100%',
    },
    songInfo: {
        flex: 1,
    },
    songTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3436',
        marginBottom: 2,
    },
    artistName: {
        fontSize: 12,
        color: '#636e72',
        fontWeight: '400',
    },
});

export default MusicPlayerCard;