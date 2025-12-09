export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
}

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string; // Markdown
  coverImage: string;
  author: User;
  createdAt: number;
  updatedAt?: number;
  categoryId: number; // Links to Category.id
  tags: string[];
  views: number;
  isFeatured?: boolean;
  audioUrl?: string; // New field for sermon audio
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
