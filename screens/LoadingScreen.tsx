// LoadingScreen.tsx (or include this snippet in your App.tsx loading state)
import React, { useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoadingScreen() {
    const scaleValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 1.2,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [scaleValue]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.loaderContainer}>
                <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                    <MaterialCommunityIcons name="dog" size={64} color="#007bff" />
                </Animated.View>
                {/*<Text style={styles.loadingText}>Loading data...</Text>*/}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        color: '#007bff',
    },
});
