// lib/appwrite.tsx - Updated with proper avatar bucket configuration
import { Client, Databases, Account, ID, Query, Storage } from 'appwrite';

// Load configuration from environment variables
export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
  platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || 'com.ios.thirteen',
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '',
  groupsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID || '',
  groupMembersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GROUP_MEMBERS_COLLECTION_ID || '',
  calendarEntriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CALENDAR_ENTRIES_COLLECTION_ID || '',
  chatMessagesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CHAT_MESSAGES_COLLECTION_ID || '',
  avatarBucketId: process.env.EXPO_PUBLIC_APPWRITE_AVATAR_BUCKET_ID || '',
};

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

// Note: setPlatform was removed in newer Appwrite versions
// The platform is now set automatically based on the environment

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const generateId = () => ID.unique();
export { Query };

export default client;