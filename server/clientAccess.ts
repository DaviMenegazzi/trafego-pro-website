export type ClientAccessRow = {
  id: string;
  user_id: string;
  client_id: string;
  granted_by: string;
  created_at: string;
};

export type AccessClient = {
  id: string;
  name: string;
  client_group: string | null;
};

export type EnrichedClientAccess = {
  id: string;
  client_id: string;
  client_name: string | null;
  client_group: string | null;
  granted_by: string;
  created_at: string;
};

/** Retorna IDs únicos de unidades concedidas por meio de user_client_access. */
export function uniqueGrantedClientIds(accessRows: Pick<ClientAccessRow, "client_id">[]): string[] {
  return Array.from(new Set(accessRows.map((row) => String(row.client_id)).filter(Boolean)));
}

/** Agrupa acessos por usuário e anexa os metadados da unidade exibidos na dashboard. */
export function groupClientAccessByUser(
  accessRows: ClientAccessRow[],
  clients: AccessClient[],
): Record<string, EnrichedClientAccess[]> {
  const clientById = new Map(clients.map((client) => [String(client.id), client]));
  const accessByUser: Record<string, EnrichedClientAccess[]> = {};

  for (const access of accessRows) {
    const client = clientById.get(String(access.client_id));
    if (!accessByUser[access.user_id]) accessByUser[access.user_id] = [];
    accessByUser[access.user_id].push({
      id: access.id,
      client_id: access.client_id,
      client_name: client?.name ?? null,
      client_group: client?.client_group ?? null,
      granted_by: access.granted_by,
      created_at: access.created_at,
    });
  }

  return accessByUser;
}
