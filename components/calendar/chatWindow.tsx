import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, keyboardHeight]);

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || isLoading) return;
    
    onSendMessage(trimmedMessage);
    setNewMessage('');
  };

  const renderMessage = (message: ChatMessage) => {
    const isCurrentUser = message.userId === currentUserId;
    const time = message.timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <View key={message.id} style={[
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>{groupName} chat</Text>
      </View>
      
      {/* Messages - FIXED TO RESERVE SPACE FOR INPUT */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: keyboardHeight > 0 ? 20 : 20 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>No messages yet</Text>
            <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
          </View>
        ) : (
          messages.map(message => renderMessage(message))
        )}
      </ScrollView>
      
      {/* Input Field - ALWAYS VISIBLE AT BOTTOM */}
      <View style={[
        styles.inputContainer,
        Platform.OS === 'android' && keyboardHeight > 0 && {
          marginBottom: keyboardHeight - 20
        }
      ]}>
        <TextInput
          style={styles.messageInput}
          placeholder="Send a message"
          value={newMessage}
          onChangeText={setNewMessage}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
          editable={!isLoading}
          multiline={false}
          blurOnSubmit={false}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (newMessage.trim() === '' || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={newMessage.trim() === '' || isLoading}
        >
          <Text style={[
            styles.sendButtonText,
            (newMessage.trim() === '' || isLoading) && styles.sendButtonTextDisabled
          ]}>
            {isLoading ? '...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 10,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 5,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
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
    marginBottom: 3,
    fontWeight: '500',
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '100%',
  },
  currentUserBubble: {
    backgroundColor: '#4287f5',
  },
  otherUserBubble: {
    backgroundColor: '#f0f0f0',
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
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    minHeight: 60,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});

export default ChatWindow;