function getForgeConfig() {
  const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!forgeUrl || !forgeKey) throw new Error("Armazenamento seguro indisponível");
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array, contentType: string): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const dot = relKey.lastIndexOf(".");
  const key = dot < 0 ? `${relKey}_${suffix}` : `${relKey.slice(0, dot)}_${suffix}${relKey.slice(dot)}`;
  const presignUrl = new URL("v1/storage/presign/put", `${forgeUrl}/`);
  presignUrl.searchParams.set("path", key.replace(/^\/+/, ""));
  const presign = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presign.ok) throw new Error("Não foi possível preparar o armazenamento da mídia");
  const { url: uploadUrl } = await presign.json() as { url?: string };
  if (!uploadUrl) throw new Error("Armazenamento não retornou URL de envio");
  const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: new Blob([data as Uint8Array], { type: contentType }) });
  if (!upload.ok) throw new Error("Não foi possível enviar a mídia ao armazenamento");
  return { key, url: `/manus-storage/${key}` };
}
