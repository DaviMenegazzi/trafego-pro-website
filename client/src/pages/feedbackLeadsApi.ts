export type FeedbackSubmission = Record<string, unknown>;

export type FeedbackFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function submitFeedbackLead(
  payload: FeedbackSubmission,
  token: string | null,
  fetchImpl: FeedbackFetch = fetch,
) {
  if (!token) {
    throw new Error("SESSION_EXPIRED");
  }

  const response = await fetchImpl("/api/feedback-leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...payload,
      submittedAt: payload.submittedAt ?? new Date().toISOString(),
    }),
  });

  let result: { error?: string } = {};
  try {
    result = (await response.json()) as { error?: string };
  } catch {
    // Keep the HTTP status as the source of truth when the response has no JSON body.
  }

  if (!response.ok) {
    throw new Error(result.error || "Erro ao salvar feedback");
  }

  return result;
}
