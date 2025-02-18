// screens/GroupChatScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

type GroupChatRouteProp = RouteProp<
    { GroupChat: { groupId: string } },
    'GroupChat'
>;

type Message = {
    id: string;
    text: string;
    senderId: string;
    createdAt?: any;
};

export default function GroupChatScreen() {
    const route = useRoute<GroupChatRouteProp>();
    const { groupId } = route.params;

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');

    // Dummy user ID
    const dummyUserId = 'user123';

    useEffect(() => {
        const messagesRef = collection(db, 'chat', 'master', 'groups', groupId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Message[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(list);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching messages:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupId]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        try {
            const messagesRef = collection(db, 'chat', 'master', 'groups', groupId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage.trim(),
                senderId: dummyUserId,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const renderMessageItem = ({ item }: { item: Message }) => {
        const isMyMessage = item.senderId === dummyUserId;
        return (
            <View
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessage : styles.otherMessage
                ]}
            >
                <Text style={styles.messageText}>{item.text}</Text>
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <FlatList
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={{ padding: 10 }}
            />

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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    messageContainer: {
        marginVertical: 4,
        padding: 10,
        borderRadius: 8,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#007bff',
        alignSelf: 'flex-end',
    },
    otherMessage: {
        backgroundColor: '#e2e2e2',
        alignSelf: 'flex-start',
    },
    messageText: {
        color: '#fff', // for myMessage
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 0.5,
        borderTopColor: '#ccc',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 12,
        marginRight: 8,
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
    },
});
