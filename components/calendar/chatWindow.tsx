import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  groupName?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  isLoading = false,
  groupName = 'Group',
}) => {
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  
  // Animated keyboard height
  const keyboardHeight = useSharedValue(0);

  // Professional keyboard handler with validation
  useKeyboardHandler({
    onStart: (e) => {
      'worklet';
      // Validate keyboard height to prevent NaN/invalid values
      const height = typeof e.height === 'number' && !isNaN(e.height) && e.height >= 0 
        ? e.height 
        : 0;
      
      keyboardHeight.value = withSpring(height, {
        damping: 16,
        stiffness: 150,
        mass: 1,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 2,
      });
    },
    onEnd: (e) => {
      'worklet';
      // Validate keyboard height to prevent NaN/invalid values
      const height = typeof e.height === 'number' && !isNaN(e.height) && e.height >= 0 
        ? e.height 
        : 0;
      
      keyboardHeight.value = withSpring(height, {
        damping: 16,
        stiffness: 150,
        mass: 1,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 2,
      });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || isLoading) return;
    
    onSendMessage(trimmedMessage);
    setNewMessage('');
  };

  const renderMessage = ({ item: message }: { item: ChatMessage }) => {
    const isCurrentUser = message.userId === currentUserId;
    const time = message.timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
      ]}>
        {!isCurrentUser && (
          <Text style={styles.messageSender}>
            {message.userName} {time}
          </Text>
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
          ]}>
            {message.message}
          </Text>
        </View>
        {isCurrentUser && (
          <Text style={styles.messageTime}>{time}</Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyChat}>
      <Text style={styles.emptyChatText}>No messages yet</Text>
      <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
    </View>
  );

  // Animated style for input container with validation
  const animatedInputStyle = useAnimatedStyle(() => {
    // Ensure we have a valid number for transform
    const translateY = typeof keyboardHeight.value === 'number' && !isNaN(keyboardHeight.value) 
      ? -keyboardHeight.value 
      : 0;
    
    return {
      transform: [{ translateY }],
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>{groupName} chat</Text>
      </View>
      
      {/* Messages List */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContentContainer
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
      </View>
      
      {/* Animated Input Container */}
      <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom || 0, 20) }]}>
          <TextInput
            style={styles.messageInput}
            placeholder="Send a message"
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            editable={!isLoading}
            multiline={true}
            maxLength={1000}
            textAlignVertical="center"
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (newMessage.trim() === '' || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={newMessage.trim() === '' || isLoading}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.sendButtonText,
              (newMessage.trim() === '' || isLoading) && styles.sendButtonTextDisabled
            ]}>
              {isLoading ? '⏳' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  currentUserMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherUserMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: '#4287f5',
    borderBottomRightRadius: 6,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserMessageText: {
    color: '#fff',
  },
  otherUserMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    maxHeight: 100,
    minHeight: 44,
    textAlignVertical: 'top',
    ...Platform.select({
      ios: {
        paddingTop: 12,
      },
      android: {
        paddingTop: 8,
      },
    }),
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4287f5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4287f5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});

export default ChatWindow;