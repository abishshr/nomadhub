// screens/GroupsListScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import {
    collection,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConfig';

type Group = {
    id: string;
    name: string;
    city?: string;
    createdAt?: any; // Firestore timestamp
};

export default function GroupsListScreen() {
    const navigation = useNavigation();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const groupsRef = collection(db, 'chat', 'master', 'groups');
        const q = query(groupsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Group[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Group);
            });
            setGroups(list);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching groups:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateGroup = () => {
        navigation.navigate('CreateGroup' as never);
    };

    const handlePressGroup = (groupId: string) => {
        navigation.navigate('GroupChat' as never, { groupId } as never);
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Loading groups...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                <Text style={styles.createButtonText}>+ Create Group</Text>
            </TouchableOpacity>

            {groups.length === 0 ? (
                <Text style={styles.noGroupsText}>No groups found. Create one!</Text>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.groupItem}
                            onPress={() => handlePressGroup(item.id)}
                        >
                            <Text style={styles.groupName}>{item.name}</Text>
                            {item.city && <Text style={styles.cityName}>City: {item.city}</Text>}
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    createButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-end',
        marginBottom: 16,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    noGroupsText: {
        textAlign: 'center',
        color: '#555',
        marginTop: 20,
    },
    groupItem: {
        padding: 14,
        backgroundColor: '#f9f9f9',
        marginBottom: 10,
        borderRadius: 8,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    cityName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
});
