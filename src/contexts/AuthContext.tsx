import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, collection, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  teamMember: any | null;
  teamMembers: any[];
  loading: boolean;
  settings: any | null;
  logout: () => Promise<void>;
  loginAsTeamMember: (member: any) => void;
  clearTeamMember: () => void;
  refreshSettings: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teamMember, setTeamMember] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const applySettings = useCallback((data: any) => {
    if (data.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', data.primaryColor);
      const hex = data.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        document.documentElement.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
      }
    }

    if (data.tabTitle || data.appName) {
      document.title = data.tabTitle || data.appName;
    }

    if (data.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.faviconUrl;
    }

    // Apply global theme
    if (data.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const refreshSettings = useCallback(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'app_config'), (doc) => {
      let data: any = {
        appName: 'Meu Cronograma',
        primaryColor: '#3b82f6',
      };

      if (doc.exists()) {
        data = { ...data, ...doc.data() };
      }

      setSettings(data);
      applySettings(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching settings:", err);
      const data = {
        appName: 'Meu Cronograma',
        primaryColor: '#3b82f6',
      };
      setSettings(data);
      applySettings(data);
      setLoading(false);
    });
    return unsubscribeSettings;
  }, [applySettings]);

  useEffect(() => {
    const savedMember = localStorage.getItem('team_member_session');
    if (savedMember) {
      try {
        setTeamMember(JSON.parse(savedMember));
      } catch (e) {
        localStorage.removeItem('team_member_session');
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    const unsubscribeSettings = refreshSettings();

    // Fetch team members once and listen for changes
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot: QuerySnapshot<DocumentData>) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setTeamMembers(members);
    }, (err: Error) => {
      console.error("Error fetching users:", err);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
      unsubscribeUsers();
    };
  }, [refreshSettings]);

  const logout = async () => {
    await signOut(auth);
    setTeamMember(null);
    localStorage.removeItem('team_member_session');
  };

  const loginAsTeamMember = (member: any) => {
    setTeamMember(member);
    localStorage.setItem('team_member_session', JSON.stringify(member));
  };

  const clearTeamMember = () => {
    setTeamMember(null);
    localStorage.removeItem('team_member_session');
  };

  return (
    <AuthContext.Provider value={{ user, teamMember, teamMembers, loading, settings, logout, loginAsTeamMember, clearTeamMember, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
