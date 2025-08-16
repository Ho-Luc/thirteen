// Alternative approach: Use inverted FlatList which naturally shows latest messages at bottom
// This reverses the data and displays it inverted, which often works better for chat

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  messages = [],
  currentUserId,
  onSendMessage,
  isLoading = false,
  groupName = 'Group',
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const textInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  
  const { height: screenHeight } = Dimensions.get('window');
  const expandedHeight = Math.floor(screenHeight * 0.5);

  // Reverse messages for inverted display
  const reversedMessages = [...messages].reverse();

  // Native keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const expandChat = useCallback(() => {
    setIsExpanded(true);
    setInputFocused(true);
  }, []);

  const collapseChat = useCallback(() => {
    setIsExpanded(false);
    setInputFocused(false);
    setNewMessage('');
    textInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const handleCancel = useCallback(() => {
    setNewMessage('');
    setInputFocused(false);
    collapseChat();
  }, [collapseChat]);

  const handleInputFocus = useCallback(() => {
    setInputFocused(true);
    expandChat();
  }, [expandChat]);

  const handleInputBlur = useCallback(() => {
    setInputFocused(false);
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isLoading) return;
    
    setNewMessage('');
    onSendMessage(trimmedMessage);
  }, [newMessage, isLoading, onSendMessage]);

  const renderMessage = useCallback(({ item: message }: { item: ChatMessage }) => {
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
  }, [currentUserId]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyChat}>
      <Text style={styles.emptyChatText}>No messages yet</Text>
      <Text style={styles.emptyChatSubtext}>Start the conversation</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* Expanded Chat Modal */}
      <Modal
        visible={isExpanded}
        transparent={false}
        animationType="slide"
        onRequestClose={handleCancel}
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView 
          style={styles.fullScreenModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[
            styles.expandedChatContainer,
            { paddingTop: insets.top }
          ]}>
            <View style={styles.expandedChatHeader}>
              <Text style={styles.expandedChatTitle}>{groupName} Chat</Text>
            </View>
            
            <View style={styles.expandedMessagesContainer}>
              <FlatList
                ref={flatListRef}
                data={reversedMessages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  styles.messagesContent,
                  (reversedMessages?.length === 0) && styles.emptyContentContainer
                ]}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                inverted={true} // This makes latest messages appear at bottom naturally
              />
            </View>
            
            <View style={styles.modalInputContainer}>
              <View style={[
                styles.inputRow, 
                { paddingBottom: Math.max(insets.bottom, 12) }
              ]}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TextInput
                  ref={textInputRef}
                  style={[styles.messageInput, styles.modalMessageInput]}
                  placeholder="Send a message"
                  placeholderTextColor="#999"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  autoFocus={true}
                  blurOnSubmit={false}
                  multiline={true}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    newMessage.trim() === '' && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={newMessage.trim() === ''}
                >
                  <Text style={[
                    styles.sendButtonText,
                    newMessage.trim() === '' && styles.sendButtonTextDisabled
                  ]}>
                    Send
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Normal Chat Header - Always visible */}
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>{groupName} chat</Text>
      </View>
      
      {/* Normal Messages Container - Always visible */}
      <View style={styles.messagesContainer}>
        <FlatList
          data={reversedMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesContent,
            styles.normalMessagesContent,
            (reversedMessages?.length === 0) && styles.emptyContentContainer
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          inverted={true} // This ensures latest messages appear at bottom
        />
      </View>
      
      {/* Chat Input Bar - Always visible */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[
          styles.inputContainer,
          Platform.OS === 'android' && { marginBottom: keyboardHeight }
        ]}>
          <View style={[
            styles.inputRow, 
            { paddingBottom: Math.max(insets.bottom, 12) }
          ]}>
            <TextInput
              style={styles.messageInput}
              placeholder="Send a message"
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              editable={!isExpanded}
              multiline={true}
              maxLength={1000}
              textAlignVertical="top"
            />
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                newMessage.trim() === '' && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={newMessage.trim() === ''}
            >
              <Text style={[
                styles.sendButtonText,
                newMessage.trim() === '' && styles.sendButtonTextDisabled
              ]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Full Screen Modal Style
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Expanded Chat Styles
  expandedChatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  expandedChatHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#4287f5',
    borderBottomWidth: 1,
    borderBottomColor: '#3a75d4',
  },
  expandedChatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  expandedMessagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginBottom: 80,
  },
  
  // Modal Input Styles
  modalInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 80,
  },
  cancelButtonText: {
    color: '#4287f5',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalMessageInput: {
    borderColor: '#4287f5',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  
  // Normal Chat Styles
  chatHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  normalMessagesContent: {
    paddingBottom: 120,
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
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#999',
  },
  
  // Message Styles
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
  
  // Input Container Styles
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
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
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    ...Platform.select({
      ios: {
        paddingTop: 10,
      },
      android: {
        paddingTop: 8,
      },
    }),
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4287f5',
    borderRadius: 22,
    minHeight: 40,
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
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});

export default ChatWindow;