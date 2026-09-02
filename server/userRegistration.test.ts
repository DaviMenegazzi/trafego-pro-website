import { describe, it, expect } from "vitest";
import { isAdminRole, isTeamRole, fetchUserAccess } from "./auth.js";
import { buildPendingRegistrationBio } from "./registrationPolicy.js";
import { normalizeManagedUserStatus } from "./userAccessPolicy.js";

describe("User Registration and Admin Approval Policy", () => {
  it("recognizes administrative and team roles correctly", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("viewer")).toBe(false);
    expect(isAdminRole("none")).toBe(false);

    expect(isTeamRole("viewer")).toBe(true);
    expect(isTeamRole("designer")).toBe(true);
    expect(isTeamRole("account_manager")).toBe(true);
    expect(isTeamRole("none")).toBe(false);
  });

  it("blocks inactive and pending user profiles from receiving active JWT claims", async () => {
    const mockSupabasePending = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: "user-123",
                email: "novo@empresa.com",
                role: "viewer",
                status: "pending",
                full_name: "Novo Usuário",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const access = await fetchUserAccess("user-123", "dummy-token", mockSupabasePending);
    expect(access.role).toBe("");
    expect(access.allowedClientIds).toEqual([]);
    expect(access.status).toBe("pending");
  });

  it("grants access only when user profile status is active", async () => {
    const mockSupabaseActive = {
      from: (table: string) => {
        if (table === "user_profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: "user-456",
                    email: "aprovado@empresa.com",
                    role: "viewer",
                    status: "active",
                    full_name: "Usuário Aprovado",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "user_client_access") {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ client_id: "client-unit-1" }],
                error: null,
              }),
            }),
          };
        }
        return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      },
    };

    const access = await fetchUserAccess("user-456", "dummy-token", mockSupabaseActive);
    expect(access.role).toBe("viewer");
    expect(access.allowedClientIds).toEqual(["client-unit-1"]);
    expect(access.status).toBeUndefined(); // Active does not return non-active status flag
  });

  it("retains only the declared role justification in a new registration profile", () => {
    expect(buildPendingRegistrationBio("Gestor de unidade")).toBe("Justificativa: Gestor de unidade");
    expect(buildPendingRegistrationBio()).toBe("");
  });

  it("accepts only active and inactive administrative status transitions", () => {
    expect(normalizeManagedUserStatus("active")).toBe("active");
    expect(normalizeManagedUserStatus("inactive")).toBe("inactive");
    expect(normalizeManagedUserStatus("pending")).toBeNull();
  });
});
