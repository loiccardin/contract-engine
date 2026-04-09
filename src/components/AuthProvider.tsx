"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import ReLoginModal from "./ReLoginModal";

interface PendingRequest {
  resolve: (value: Response) => void;
  url: string;
  init?: RequestInit;
}

interface AuthContextType {
  apiCall: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({ apiCall: fetch });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const pendingRef = useRef<PendingRequest | null>(null);

  const apiCall = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const res = await fetch(url, init);

    // If 401 and it's an API call (not auth endpoint), show re-login modal
    if (res.status === 401 && !url.startsWith("/api/auth/")) {
      return new Promise<Response>((resolve) => {
        pendingRef.current = { resolve, url, init };
        setShowModal(true);
      });
    }

    return res;
  }, []);

  async function handleReLoginSuccess() {
    setShowModal(false);

    // Retry the pending request
    if (pendingRef.current) {
      const { resolve, url, init } = pendingRef.current;
      pendingRef.current = null;
      const retryRes = await fetch(url, init);
      resolve(retryRes);
    }
  }

  return (
    <AuthContext.Provider value={{ apiCall }}>
      {children}
      {showModal && <ReLoginModal onSuccess={handleReLoginSuccess} />}
    </AuthContext.Provider>
  );
}
