import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppUser, UserRole } from '../types/app';
import { getItem, setItem, generateId, seedDefaultUsers, KEYS } from '../utils/storage';

interface UserContextType {
  currentUser: AppUser | null;
  users: AppUser[];
  login: (userId: string) => void;
  logout: () => void;
  addUser: (data: Omit<AppUser, 'id'>) => AppUser;
  updateUser: (id: string, data: Partial<AppUser>) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const seeded = seedDefaultUsers();
    setUsers(seeded);
    const saved = getItem<AppUser | null>(KEYS.CURRENT_USER, null);
    if (saved) {
      const found = seeded.find(u => u.id === saved.id);
      setCurrentUser(found ?? null);
    }
  }, []);

  const login = (userId: string) => {
    const user = users.find(u => u.id === userId) ?? null;
    setCurrentUser(user);
    setItem(KEYS.CURRENT_USER, user);
  };

  const logout = () => {
    setCurrentUser(null);
    setItem(KEYS.CURRENT_USER, null);
  };

  const addUser = (data: Omit<AppUser, 'id'>): AppUser => {
    const user: AppUser = { ...data, id: generateId() };
    const next = [...users, user];
    setUsers(next);
    setItem(KEYS.USERS, next);
    return user;
  };

  const updateUser = (id: string, data: Partial<AppUser>) => {
    const next = users.map(u => u.id === id ? { ...u, ...data } : u);
    setUsers(next);
    setItem(KEYS.USERS, next);
    if (currentUser?.id === id) {
      const updated = next.find(u => u.id === id) ?? null;
      setCurrentUser(updated);
      setItem(KEYS.CURRENT_USER, updated);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, users, login, logout, addUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be inside UserProvider');
  return ctx;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  junior:    'Junior Engineer',
  senior:    'Senior Engineer',
  principal: 'Principal / Director',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  junior:    'bg-slate-100 text-slate-700',
  senior:    'bg-blue-100 text-blue-700',
  principal: 'bg-violet-100 text-violet-700',
};
