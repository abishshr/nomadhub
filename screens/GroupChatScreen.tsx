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
    ActivityIndicator
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
    getDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';

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

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [userName, setUserName] = useState<string | null>(null);

    // NEW: store groupName in state
    const [groupName, setGroupName] = useState<string>('');

    useEffect(() => {
        // 1) Fetch group doc to get the group name
        const groupDocRef = doc(db, 'chat', 'master', 'groups', groupId);
        getDoc(groupDocRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                // assume doc has field "name"
                setGroupName(data.name || '');
            }
        }).catch((err) => {
            console.error('Error fetching group doc:', err);
        });

        // 2) Fetch current user’s name from /users/{uid}
        if (currentUser) {
            const uid = currentUser.uid;
            const userRef = doc(db, 'users', uid);
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

        // 3) Listen for messages in this group
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

    // Custom back button
    const handleGoBack = () => {
        navigation.goBack();
    };

    // Send message with senderName
    const handleSend = async () => {
        if (!newMessage.trim() || !currentUser || !userName) return;
        try {
            const uid = currentUser.uid;
            const messagesRef = collection(db, 'chat', 'master', 'groups', groupId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage.trim(),
                senderId: uid,
                senderName: userName,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Format the timestamp as "HH:MM"
    function formatTime(timestamp: any): string {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Render each message bubble
    const renderMessageItem = ({ item }: { item: Message }) => {
        const isMyMessage = item.senderId === currentUser?.uid;
        const timeString = item.createdAt ? formatTime(item.createdAt) : '';

        return (
            <View style={[styles.bubbleContainer, isMyMessage ? styles.myBubble : styles.otherBubble]}>
                {/* Show senderName if not my message */}
                {!isMyMessage && item.senderName && (
                    <Text style={styles.senderName}>{item.senderName}</Text>
                )}

                <Text style={styles.messageText}>{item.text}</Text>

                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{timeString}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Loading messages...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Custom header row with group name */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                {/* Display groupName from the doc */}
                <Text style={styles.headerTitle}>
                    {groupName || 'Chat'}
                </Text>
            </View>

            <View style={styles.chatArea}>
                <FlatList
                    data={messages}
                    renderItem={renderMessageItem}
                    keyExtractor={(item) => item.id}
                    inverted
                    contentContainerStyle={{ padding: 10 }}
                />
            </View>

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
    safeArea: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 10,
        padding: 6,
    },
    backButtonText: {
        fontSize: 20,
        color: '#007bff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    chatArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    bubbleContainer: {
        marginVertical: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
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
    senderName: {
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 16,
        color: '#fff', // for myBubble, but you can conditionally style if you want black text
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 2,
    },
    timeText: {
        fontSize: 12,
        color: '#ccc',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    input: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 12,
        marginRight: 8,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    sendButton: {
        backgroundColor: '#007bff',
        borderRadius: 20,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
