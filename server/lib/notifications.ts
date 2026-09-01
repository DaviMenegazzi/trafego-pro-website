/**
 * Módulo de notificações do sistema (fire-and-forget).
 * Notifica administradores e usuários sobre eventos de ciclo de vida de contas.
 */

export interface NewRegistrationNotification {
  userId?: string;
  fullName: string;
  email: string;
  requestedUnit?: string;
  reason?: string;
}

export async function notifyAdminNewRegistration(data: NewRegistrationNotification): Promise<void> {
  // Fire-and-forget: log estruturado e preparado para webhook/WhatsApp/Email
  try {
    const unitText = data.requestedUnit ? ` | Unidade: ${data.requestedUnit}` : "";
    const reasonText = data.reason ? ` | Cargo/Motivo: ${data.reason}` : "";
    console.info(
      `[notify-admin] 🔔 Novo cadastro pendente de aprovação: ${data.fullName} <${data.email}>${unitText}${reasonText}`
    );
  } catch (err) {
    console.error("[notify-admin] Falha ao processar notificação de cadastro:", err);
  }
}

export async function notifyUserApproved(data: { email: string; fullName: string; role: string }): Promise<void> {
  try {
    console.info(
      `[notify-user] ✅ Cadastro aprovado com sucesso para ${data.fullName} <${data.email}> (Role: ${data.role})`
    );
  } catch (err) {
    console.error("[notify-user] Falha ao notificar aprovação de usuário:", err);
  }
}

export async function notifyUserRejected(data: { email: string; fullName: string }): Promise<void> {
  try {
    console.info(
      `[notify-user] ❌ Cadastro recusado/inativado para ${data.fullName} <${data.email}>`
    );
  } catch (err) {
    console.error("[notify-user] Falha ao notificar recusa de usuário:", err);
  }
}
