/** Rôles globaux (collection Firestore `users`). */
export type UserRole = "super_admin" | "admin" | "tournament_manager";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
  createdBy?: string;
  /** true après création par un admin — changement obligatoire au 1er login. */
  mustChangePassword?: boolean;
};

export function parseSuperAdminEmails(): string[] {
  const raw = import.meta.env.VITE_SUPER_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseSuperAdminEmails().includes(email.trim().toLowerCase());
}

export function normalizeUserRole(raw: unknown): UserRole | null {
  if (raw === "super_admin" || raw === "admin" || raw === "tournament_manager") {
    return raw;
  }
  if (raw === "organizer") return "tournament_manager";
  return null;
}

export function resolveUserRole(
  email: string | null | undefined,
  profileRole: UserRole | null | undefined,
): UserRole | null {
  if (isSuperAdminEmail(email)) return "super_admin";
  return profileRole ?? null;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super administrateur";
    case "admin":
      return "Administrateur";
    case "tournament_manager":
      return "Responsable de tournoi";
  }
}

export function isPlatformStaff(role: UserRole | null): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageUsers(role: UserRole | null): boolean {
  return isPlatformStaff(role);
}

/** Rôles qu'un créateur peut attribuer à un nouveau compte. */
export function creatableRoles(creatorRole: UserRole | null): UserRole[] {
  if (creatorRole === "super_admin") return ["admin", "tournament_manager"];
  if (creatorRole === "admin") return ["tournament_manager"];
  return [];
}

export function canCreateRole(creatorRole: UserRole | null, target: UserRole): boolean {
  return creatableRoles(creatorRole).includes(target);
}

export function canManageTournament(
  role: UserRole | null,
  userUid: string | undefined,
  managerUid: string | undefined,
): boolean {
  if (!role || !userUid) return false;
  if (isPlatformStaff(role)) return true;
  if (role === "tournament_manager") return managerUid === userUid;
  return false;
}
