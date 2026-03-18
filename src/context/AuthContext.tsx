import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryPartner } from '../types';
import { connectSocket, disconnectSocket } from '../hooks/socket';

interface AuthContextType {
  partner: DeliveryPartner | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, partner: DeliveryPartner) => Promise<void>;
  logout: () => Promise<void>;
  updatePartner: (updates: Partial<DeliveryPartner>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('dabba_token');
        const p = await AsyncStorage.getItem('dabba_partner');
        if (t && p) {
          const parsed = JSON.parse(p);
          if (parsed?._id) {
            setToken(t);
            setPartner(parsed);
            connectSocket(t);
          }
        }
      } catch (e) {
        console.error('Auth restore error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string, newPartner: DeliveryPartner) => {
    await AsyncStorage.setItem('dabba_token', newToken);
    await AsyncStorage.setItem('dabba_partner', JSON.stringify(newPartner));
    setToken(newToken);
    setPartner(newPartner);
    connectSocket(newToken);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['dabba_token', 'dabba_partner']);
    disconnectSocket();
    setToken(null);
    setPartner(null);
  }, []);

  const updatePartner = useCallback(async (updates: Partial<DeliveryPartner>) => {
    setPartner((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('dabba_partner', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAuthenticated = !!token && !!partner;

  return (
    <AuthContext.Provider value={{ partner, token, isAuthenticated, loading, login, logout, updatePartner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
