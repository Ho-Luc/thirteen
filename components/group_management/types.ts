export interface Group {
  id: string;
  name: string;
  shareKey: string;
  createdAt: Date;
}

export interface GroupItemProps {
  group: Group;
  onPress: (group: Group) => void;
}

export interface CreateGroupFormProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: (name: string) => void;
}

export interface ShareKeyModalProps {
  visible: boolean;
  shareKey: string;
  onClose: () => void;
  onCopyKey: () => void;
}

export interface SettingsModalProps {
  visible: boolean;
  groups: Group[];
  onClose: () => void;
  onDeleteGroup: (group: Group) => void;
}

export interface DeleteConfirmationModalProps {
  visible: boolean;
  groupName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface GroupListProps {
  groups: Group[];
  onGroupPress: (group: Group) => void;
}

export interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoinGroup: (shareKey: string) => void;
  isLoading?: boolean;
}

export interface JoinGroupButtonProps {
  onPress: () => void;
  disabled?: boolean;
}