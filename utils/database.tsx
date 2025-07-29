// utils/database.tsx - Fixed version without circular imports

/**
 * Database document base interface with Appwrite system fields
 */
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

/**
 * Groups Collection Schema
 */
export interface GroupDocument {
  name: string;        // required
  shareKey: string;    // required
  createdBy: string;   // required
}

/**
 * Full Group with Appwrite system fields
 */
export interface GroupRecord extends GroupDocument, AppwriteDocument {}

/**
 * Group Members Collection Schema
 */
export interface GroupMemberDocument {
  userId: string;      // required
  groupId: string;     // required  
  joinedAt: string;    // required (Datetime as ISO string)
  userName: string;    // required
  avatarUrl?: string;  // optional
}

/**
 * Full Group Member with Appwrite system fields
 */
export interface GroupMemberRecord extends GroupMemberDocument, AppwriteDocument {}

/**
 * Chat Messages Collection Schema
 */
export interface ChatMessageDocument {
  groupId: string;     // required
  userId: string;      // required
  userName: string;    // required
  message: string;     // required
  timestamp: string;   // required (Datetime as ISO string)
}

/**
 * Full Chat Message with Appwrite system fields
 */
export interface ChatMessageRecord extends ChatMessageDocument, AppwriteDocument {}

/**
 * Calendar Entries Collection Schema
 */
export interface CalendarEntryDocument {
  userId: string;      // required
  groupId: string;     // required
  date: string;        // required (YYYY-MM-DD format)
  completed: boolean;  // required
}

/**
 * Full Calendar Entry with Appwrite system fields
 */
export interface CalendarEntryRecord extends CalendarEntryDocument, AppwriteDocument {}

/**
 * Application-level interfaces (transformed from database)
 */
export interface Group {
  id: string;
  name: string;
  shareKey: string;
  createdAt: Date;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  userName: string;
  avatarUrl?: string;
  joinedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export interface CalendarEntry {
  id: string;
  userId: string;
  groupId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  createdAt: Date;
}

/**
 * Document creation payloads (what we send to Appwrite)
 */
export interface CreateGroupPayload {
  name: string;
  shareKey: string;
  createdBy: string;
}

export interface CreateGroupMemberPayload {
  userId: string;
  groupId: string;
  joinedAt: string;
  userName: string;
  avatarUrl?: string | null;
}

export interface CreateChatMessagePayload {
  groupId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export interface CreateCalendarEntryPayload {
  userId: string;
  groupId: string;
  date: string;
  completed: boolean;
}