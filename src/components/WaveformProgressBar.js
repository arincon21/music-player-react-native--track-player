import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';
import TrackPlayer, {
    useProgress,
    useTrackPlayerEvents,
    Event,
} from 'react-native-track-player';

const NUM_BARS = 50;

const generateWaveform = () => {
    return Array.from({ length: NUM_BARS }, () => Math.random() * 0.8 + 0.2); // escala entre 0.2 y 1
};

const formatTime = (sec) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VerticalWaveformProgress = () => {
    const { position, duration } = useProgress(200);
    const [barScales, setBarScales] = useState(generateWaveform());

    // Regenerar forma de onda cuando cambia la canción
    useTrackPlayerEvents([Event.PlaybackTrackChanged], () => {
        setBarScales(generateWaveform());
    });

    const handleSeek = useCallback(
        async (evt) => {
            if (!duration) return;
            const { locationY, height } = evt.nativeEvent;
            const ratio = locationY / height;
            const newPosition = ratio * duration;
            await TrackPlayer.seekTo(newPosition);
        },
        [duration]
    );

    const totalBars = barScales.length;
    const progressIndex = duration
        ? Math.floor((position / duration) * totalBars)
        : 0;

    return (
        <TouchableWithoutFeedback onPress={handleSeek}>
            <View style={styles.container}>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
                <View style={styles.waveform}>
                    {barScales.map((scale, index) => {
                        const reversedIndex = totalBars - 1 - index; // invertir la dirección del progreso
                        const isPassed = reversedIndex <= progressIndex;
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.bar,
                                    {
                                        transform: [{ scaleX: scale }],
                                        backgroundColor: isPassed ? '#f1c54a' : 'rgba(200,200,200,0.3)',
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 6,
    },
    waveform: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    bar: {
        flex: 1,
        width: '80%', // puedes ajustar el ancho deseado aquí
        marginVertical: 1,
        borderRadius: 2,
        alignSelf: 'flex-start',
    },
    timeText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 4,
    },
});

export default VerticalWaveformProgress;
