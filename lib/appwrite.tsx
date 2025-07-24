// lib/appwrite.ts
import { Client, Databases, Account, ID, Query } from 'appwrite';

// Load configuration from environment variables
export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
  platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || 'com.yourapp.thirteen',
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '',
  groupsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID || '',
  groupMembersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GROUP_MEMBERS_COLLECTION_ID || '',
};

// Validate that all required environment variables are present
const validateConfig = () => {
  const requiredVars = [
    'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
    'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
    'EXPO_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID',
    'EXPO_PUBLIC_APPWRITE_GROUP_MEMBERS_COLLECTION_ID'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Validate config on import
validateConfig();

// Initialize Appwrite client
const client = new Client();

client.setEndpoint(appwriteConfig.endpoint);
client.setProject(appwriteConfig.projectId);

try {
  if (client.setPlatform && typeof client.setPlatform === 'function') {
    client.setPlatform(appwriteConfig.platform);
  }
} catch (error) {
    throw new Error('Error setting platform: ' + error);
}

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const generateId = () => ID.unique();
export { Query };

export default client;