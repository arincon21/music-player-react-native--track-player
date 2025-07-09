import React, { useEffect, useState, useCallback } from 'react';
import Slider from '@react-native-community/slider';
import { View, StyleSheet, Text } from 'react-native';
import { useProgress } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';

const ProgressSlider = React.memo(() => {
    const { position, duration } = useProgress(200);
    const [sliderValue, setSliderValue] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    useEffect(() => {
        if (!isSeeking) {
            setSliderValue(position);
        }
    }, [position, isSeeking]);

    const handleSlidingStart = useCallback(() => {
        setIsSeeking(true);
    }, []);

    const handleValueChange = useCallback((value) => {
        setSliderValue(value);
    }, []);

    const handleSlidingComplete = useCallback(async (value) => {
        try {
            await TrackPlayer.seekTo(value);
        } catch (error) {
            console.error('Error seeking:', error);
        } finally {
            setIsSeeking(false);
        }
    }, []);

    const safeDuration = duration || 1;
    const safeSliderValue = Math.min(sliderValue, safeDuration);

    return (
        <View style={styles.container}>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={safeDuration}
                value={safeSliderValue}
                minimumTrackTintColor="#f1c54a"
                maximumTrackTintColor="rgba(241, 197, 74, 0.3)"
                thumbTintColor="#f1c54a"
                onSlidingStart={handleSlidingStart}
                onValueChange={handleValueChange}
                onSlidingComplete={handleSlidingComplete}
                disabled={safeDuration <= 1}
            />
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(safeSliderValue)}</Text>
                <Text style={styles.timeText}>{formatTime(safeDuration)}</Text>
            </View>
        </View>
    );
});

const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 15,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingHorizontal: 5,
    },
    timeText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
    },
});

ProgressSlider.displayName = 'ProgressSlider';

export default ProgressSlider;