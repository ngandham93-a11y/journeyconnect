import { User } from "../types";
import { GOOGLE_SCRIPT_URL } from "../utils/constants";

const USER_KEY = 'journeyconnect_current_user';

export const login = async (phone: string, pin: string): Promise<User | null> => {
  
  // Fallback for dev/demo if URL isn't set
  if (GOOGLE_SCRIPT_URL.includes("INSERT_YOUR_ID")) {
      console.warn("Using insecure fallback login. Configure Google Script URL.");
      if (pin === '1234') {
          const u: User = { id: `local_${phone}`, name: 'Demo User', phoneNumber: phone, role: 'USER' };
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          return u;
      }
      return null;
  }

  try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', phone, pin })
      });
      const json = await response.json();
      
      if (json.success && json.user) {
          const user = json.user;
          const sessionUser: User = {
              id: `sheet_${user.phoneNumber}`,
              name: user.name,
              phoneNumber: user.phoneNumber,
              role: user.role
          };
          localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
          return sessionUser;
      }
  } catch (e) {
      console.error("Login Error", e);
  }

  return null;
};

export const logout = () => {
  localStorage.removeItem(USER_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    logout();
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'ADMIN';
};
