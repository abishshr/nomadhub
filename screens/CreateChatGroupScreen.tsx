// screens/CreateGroupScreen.tsx
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

export default function CreateChatGroupScreen() {
    const navigation = useNavigation();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please provide a group name.');
            return;
        }
        try {
            const groupsRef = collection(db, 'chat', 'master', 'groups');
            await addDoc(groupsRef, {
                name: groupName.trim(),
                description: groupDescription.trim(),
                creatorId: currentUser?.uid,
                createdAt: serverTimestamp(),
            });
            Alert.alert('Success', 'Group created successfully.');
            navigation.goBack();
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Could not create group.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.header}>Create New Group</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Group Name"
                    value={groupName}
                    onChangeText={setGroupName}
                />
                <TextInput
                    style={[styles.input, { height: 100 }]}
                    placeholder="Group Description (optional)"
                    value={groupDescription}
                    onChangeText={setGroupDescription}
                    multiline
                />
                <TouchableOpacity style={styles.submitButton} onPress={handleCreateGroup}>
                    <Text style={styles.submitButtonText}>Create Group</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { padding: 16, backgroundColor: '#fff', flexGrow: 1 },
    backButton: { marginBottom: 16 },
    backButtonText: { fontSize: 16, color: '#007bff', fontFamily: 'sans-serif' },
    header: { fontSize: 24, fontWeight: '700', marginBottom: 20, fontFamily: 'sans-serif', color: '#333' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontFamily: 'sans-serif',
    },
    submitButton: {
        backgroundColor: '#28a745',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'sans-serif' },
});
