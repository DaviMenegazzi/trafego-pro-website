import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Client = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  status?: string;
  plan?: string;
  budget?: number;
  monthlyBudget?: number;
  contact?: string;
  phone?: string;
  email?: string;
  lpUrl?: string;
  notes?: string;
  startDate?: string;
  createdAt?: string;
};

type ClientContextType = {
  clients: Client[];
  selectedClientId: string | null;
  selectedClient: Client | null;
  setSelectedClientId: (id: string | null) => void;
  loading: boolean;
  refetch: () => void;
};

const ClientContext = createContext<ClientContextType>({
  clients: [],
  selectedClientId: null,
  selectedClient: null,
  setSelectedClientId: () => {},
  loading: false,
  refetch: () => {},
});

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("tp_token");
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setClients(data);
      // Auto-select first client if none selected
      if (!selectedClientId && data.length > 0) {
        setSelectedClientId(data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  return (
    <ClientContext.Provider
      value={{ clients, selectedClientId, selectedClient, setSelectedClientId, loading, refetch: fetchClients }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  return useContext(ClientContext);
}
