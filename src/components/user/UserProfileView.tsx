import React from 'react';
import { UserSettingsView } from './UserSettingsView';

export interface UserProfileViewProps {
  onNavigate?: (view: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = (props) => {
  return <UserSettingsView {...props} />;
};

export default UserProfileView;
