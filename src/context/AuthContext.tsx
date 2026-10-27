import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DemoUser, DEMO_USERS, getDemoUserById, findDemoUser } from '../data/demoUsers';
import { getActiveUserId, setActiveUserId, clearActiveUserId } from '../storage/db';

interface AuthContextType {
  currentUser: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  allUsers: DemoUser[];
  isFieldOfficer: boolean;
  isStateSupervisor: boolean;
  isNationalAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  switchUser: async () => {},
  allUsers: DEMO_USERS,
  isFieldOfficer: false,
  isStateSupervisor: false,
  isNationalAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from persistent storage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedId = await getActiveUserId();
        if (mounted) {
          if (storedId) {
            const user = getDemoUserById(storedId);
            setCurrentUser(user);
          } else {
            setCurrentUser(null);
          }
        }
      } catch (e) {
        console.warn('Failed to load active user from storage:', e);
        if (mounted) setCurrentUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = username.trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter your assigned Officer Username / Persona.' };
    }

    const user = findDemoUser(trimmed);
    if (!user) {
      return {
        success: false,
        error: `Officer ID "${trimmed}" not recognized. Standard test personas: u_field_01, u_field_02, u_field_03, u_vecdim_osun, u_uniosun_01.`,
      };
    }

    setCurrentUser(user);
    try {
      await setActiveUserId(user.id);
    } catch (e) {
      console.warn('Failed to persist active user session:', e);
    }
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    try {
      await clearActiveUserId();
    } catch (e) {
      console.warn('Failed to clear active user session:', e);
    }
  }, []);

  const switchUser = useCallback(async (userId: string) => {
    const user = getDemoUserById(userId);
    setCurrentUser(user);
    try {
      await setActiveUserId(userId);
    } catch (e) {
      console.warn('Failed to persist active user session:', e);
    }
  }, []);

  const isAuthenticated = currentUser !== null;
  const isFieldOfficer = currentUser?.role === 'field';
  const isStateSupervisor = currentUser?.role === 'vecdim';
  const isNationalAdmin = currentUser?.role === 'uniosun';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        login,
        logout,
        switchUser,
        allUsers: DEMO_USERS,
        isFieldOfficer,
        isStateSupervisor,
        isNationalAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
