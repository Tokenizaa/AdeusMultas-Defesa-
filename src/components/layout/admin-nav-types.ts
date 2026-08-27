export interface AdminNavItem {
  label: string;
  path: string;
  icon: any;
  badge?: number | null;
  highlight?: boolean;
  exact?: boolean;
}

export interface AdminNavSubGroup {
  title: string;
  items: AdminNavItem[];
}

export interface AdminNavGroup {
  title: string;
  items?: AdminNavItem[];
  children?: AdminNavSubGroup[];
}