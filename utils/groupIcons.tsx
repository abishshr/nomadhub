// utils/groupIcons.tsx
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function getGroupIcon(groupName: string, defaultIcon?: string) {
    const lowerName = groupName.toLowerCase();
    if (lowerName === 'nightlife') {
        return (
            <MaterialCommunityIcons
                name="weather-night"
                size={32}
                color="#007bff"
                style={{ marginBottom: 8 }}
            />
        );
    } else if (lowerName === 'foodies') {
        return (
            <MaterialCommunityIcons
                name="food-fork-drink"
                size={32}
                color="#007bff"
                style={{ marginBottom: 8 }}
            />
        );
    } else if (lowerName === 'general chat') {
        return (
            <Ionicons
                name="chatbubble-ellipses-outline"
                size={32}
                color="#007bff"
                style={{ marginBottom: 8 }}
            />
        );
    } else if (lowerName === 'events') {
        return (
            <Ionicons
                name="calendar-outline"
                size={32}
                color="#007bff"
                style={{ marginBottom: 8 }}
            />
        );
    }
    return (
        <Ionicons
            name={defaultIcon || 'people-circle'}
            size={32}
            color="#007bff"
            style={{ marginBottom: 8 }}
        />
    );
}
