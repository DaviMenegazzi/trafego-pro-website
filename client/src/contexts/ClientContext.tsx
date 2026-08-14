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

      // Busca clientes do Supabase (fonte primária) e do banco local em paralelo
      const [sbRes, localRes] = await Promise.allSettled([
        fetch("/api/metrics/clients", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);

      const sbClients: Client[] = sbRes.status === "fulfilled" && sbRes.value.configured && Array.isArray(sbRes.value.clients)
        ? sbRes.value.clients.map((c: any) => ({ id: c.id, name: c.name }))
        : [];
      const localClients: Client[] = localRes.status === "fulfilled" && Array.isArray(localRes.value)
        ? localRes.value
        : [];

      // Supabase primeiro, depois locais que ainda não existem pelo identificador.
      // Unidades podem compartilhar nomes parecidos, portanto nunca devem ser deduplicadas por nome.
      const seenIds = new Set(sbClients.map((c) => String(c.id)));
      const merged = [
        ...sbClients,
        ...localClients.filter((c) => !seenIds.has(String(c.id))),
      ];

      setClients(merged);
      setSelectedClientId((current) => {
        if (current && merged.some((client) => String(client.id) === String(current))) {
          return current;
        }
        return merged[0]?.id ?? null;
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
