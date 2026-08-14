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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("tp_selected_client_id"),
  );
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("tp_token");
      if (!token) { setLoading(false); return; }

      const response = await fetch("/api/metrics/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("tp_token");
        localStorage.removeItem("tp_user");
        localStorage.removeItem("tp_selected_client_id");
        window.location.href = "/login?session=renovada";
        return;
      }
      if (!response.ok) throw new Error("Não foi possível carregar as unidades do Supabase");
      const payload = await response.json();
      const supabaseClients: Client[] = payload.configured && Array.isArray(payload.clients)
        ? payload.clients.map((client: { id: string; name: string }) => ({ id: client.id, name: client.name }))
        : [];

      setClients(supabaseClients);
      setSelectedClientId((current) => {
        if (current && supabaseClients.some((client) => String(client.id) === String(current))) {
          return current;
        }
        return supabaseClients[0]?.id ?? null;
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem("tp_selected_client_id", selectedClientId);
    } else {
      localStorage.removeItem("tp_selected_client_id");
    }
  }, [selectedClientId]);

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
