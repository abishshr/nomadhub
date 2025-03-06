// screens/GroupChatScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import LoadingScreen from "./LoadingScreen";

type RouteParams = {
    groupId: string;
};

type Message = {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
    createdAt?: any; // Firestore timestamp
};

export default function GroupChatScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { groupId } = route.params as RouteParams;

    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [groupName, setGroupName] = useState<string>('');
    const [userName, setUserName] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        // Fetch group name
        const groupDocRef = doc(db, 'chat', 'master', 'groups', groupId);
        getDoc(groupDocRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setGroupName(data.name || '');
                }
            })
            .catch((err) => {
                console.error('Error fetching group doc:', err);
            });

        // Fetch current user's name
        if (currentUser) {
            const userRef = doc(db, 'users', currentUser.uid);
            getDoc(userRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        setUserName(data.name || null);
                    }
                })
                .catch((err) => {
                    console.error('Error fetching user doc:', err);
                });
        }

        // Listen for messages
        const messagesRef = collection(db, 'chat', 'master', 'groups', groupId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list: Message[] = [];
                snapshot.forEach((docSnap) => {
                    list.push({ id: docSnap.id, ...docSnap.data() } as Message);
                });
                setMessages(list);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching messages:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [groupId, currentUser]);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !currentUser || !userName) return;
        try {
            const messagesRef = collection(db, 'chat', 'master', 'groups', groupId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage.trim(),
                senderId: currentUser.uid,
                senderName: userName,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const formatTime = (timestamp: any): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessageItem = ({ item }: { item: Message }) => {
        const isMyMessage = item.senderId === currentUser?.uid;
        const timeString = item.createdAt ? formatTime(item.createdAt) : '';

        return (
            <View
                style={[
                    styles.bubbleContainer,
                    isMyMessage ? styles.myBubble : styles.otherBubble,
                ]}
            >
                {!isMyMessage && item.senderName && (
                    <Text style={styles.senderName}>{item.senderName}</Text>
                )}
                <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                    {item.text}
                </Text>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{timeString}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{groupName || 'Chat'}</Text>
            </View>

            {/* Chat Area */}
            <View style={styles.chatArea}>
                <FlatList
                    data={messages}
                    renderItem={renderMessageItem}
                    keyExtractor={(item) => item.id}
                    inverted
                    contentContainerStyle={{ padding: 10 }}
                />
            </View>

            {/* Message Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 8, fontSize: 16, color: '#007bff' },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: { marginRight: 10, padding: 6 },
    backButtonText: { fontSize: 20, color: '#007bff' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
    chatArea: { flex: 1, backgroundColor: '#fff' },
    bubbleContainer: {
        marginVertical: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    myBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#007bff',
        marginRight: 5,
    },
    otherBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#f1f1f1',
        marginLeft: 5,
    },
    senderName: { fontWeight: 'bold', color: '#333', marginBottom: 2 },
    messageText: { fontSize: 16 },
    myMessageText: { color: '#fff' },
    otherMessageText: { color: '#333' },
    timeContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    timeText: { fontSize: 12, color: '#ccc' },
    inputContainer: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    input: {
        flex: 1,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    sendButton: {
        backgroundColor: '#007bff',
        borderRadius: 25,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
