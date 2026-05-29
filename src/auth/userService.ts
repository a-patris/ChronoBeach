import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { readFirebaseConfig } from "../config/firebase";
import { getFirebaseAuth, getFirestoreDb } from "../config/firebaseApp";
import type { User } from "firebase/auth";
import {
  isPlatformStaff,
  isSuperAdminEmail,
  normalizeUserRole,
  resolveUserRole,
  type UserProfile,
  type UserRole,
} from "./roles";

function profileFromDoc(uid: string, data: Record<string, unknown>): UserProfile {
  const role = normalizeUserRole(data.role) ?? "tournament_manager";
  return {
    uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? data.email ?? "Utilisateur"),
    role,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    mustChangePassword: data.mustChangePassword === true,
  };
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirestoreDb(), "users", uid));
  if (!snap.exists()) return null;
  return profileFromDoc(uid, snap.data() as Record<string, unknown>);
}

/** Crée ou met à jour le profil Firestore après connexion. */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);

  if (isSuperAdminEmail(user.email)) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? user.email?.split("@")[0] ?? "Admin",
      role: "super_admin",
      createdAt: existing.data()?.createdAt ?? new Date().toISOString(),
    };
    try {
      await setDoc(
        ref,
        {
          email: profile.email,
          displayName: profile.displayName,
          role: "super_admin",
          createdAt: profile.createdAt,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn(
        "[ChronoBeach] Profil Firestore non enregistré — publiez firestore.rules dans Firebase Console.",
        err,
      );
    }
    return profile;
  }

  if (existing.exists()) {
    return profileFromDoc(user.uid, existing.data() as Record<string, unknown>);
  }

  throw new Error(
    "Compte non autorisé. Demandez un accès à l'administrateur ChronoBeach.",
  );
}

export async function resolveAuthProfile(user: User): Promise<{
  profile: UserProfile | null;
  role: UserRole | null;
}> {
  if (user.isAnonymous) {
    return { profile: null, role: null };
  }

  if (isSuperAdminEmail(user.email)) {
    const profile = await ensureUserProfile(user);
    return { profile, role: "super_admin" };
  }

  const profile = await loadUserProfile(user.uid);
  const role = resolveUserRole(user.email, profile?.role ?? null);
  if (!profile || !role) {
    return { profile: null, role: null };
  }
  return { profile, role };
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(getFirestoreDb(), "users"));
  return snap.docs
    .map((d) => profileFromDoc(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
}

/** Crée un compte sans déconnecter l'admin (app Firebase secondaire). */
export async function createUserAccount(
  creatorUid: string,
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
): Promise<UserProfile> {
  const config = readFirebaseConfig();
  if (!config) throw new Error("Firebase non configuré");

  const secondary = initializeApp(config, `cb-create-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondary);
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password,
    );
    await signOut(secondaryAuth);

    const profile: UserProfile = {
      uid: cred.user.uid,
      email: email.trim(),
      displayName:
        displayName.trim() || email.trim().split("@")[0] || roleLabelFallback(role),
      role,
      createdAt: new Date().toISOString(),
      createdBy: creatorUid,
      mustChangePassword: true,
    };

    await setDoc(doc(getFirestoreDb(), "users", cred.user.uid), {
      email: profile.email,
      displayName: profile.displayName,
      role,
      createdAt: profile.createdAt,
      createdBy: creatorUid,
      mustChangePassword: true,
      createdAtServer: serverTimestamp(),
    });

    return profile;
  } finally {
    await deleteApp(secondary);
  }
}

function roleLabelFallback(role: UserRole): string {
  if (role === "admin") return "Admin";
  return "Organisateur";
}

export type TournamentSummary = {
  id: string;
  name: string;
  createdAt?: string;
  ownerUid?: string;
  managerUid?: string;
  matchCount: number;
  access?: { markerCode: string; spectatorCode: string };
};

export async function listTournamentSummaries(
  viewerUid: string | undefined,
  viewerRole: UserRole | null,
): Promise<TournamentSummary[]> {
  const snap = await getDocs(collection(getFirestoreDb(), "tournaments"));
  const all = snap.docs.map((d) => {
    const data = d.data() as {
      name?: string;
      createdAt?: string;
      ownerUid?: string;
      managerUid?: string;
      matches?: unknown[];
      access?: { markerCode: string; spectatorCode: string };
    };
    return {
      id: d.id,
      name: data.name ?? "Sans nom",
      createdAt: data.createdAt,
      ownerUid: data.ownerUid,
      managerUid: data.managerUid,
      matchCount: Array.isArray(data.matches) ? data.matches.length : 0,
      access: data.access,
    };
  });

  const filtered = isPlatformStaff(viewerRole)
    ? all
    : all.filter((t) => t.managerUid === viewerUid || t.ownerUid === viewerUid);

  return filtered.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function createUserCreationErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Cette adresse e-mail est déjà utilisée.";
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/weak-password":
      return "Mot de passe trop faible (8 caractères minimum).";
    default:
      return "Impossible de créer le compte.";
  }
}

export function createPasswordChangeErrorMessage(code: string): string {
  switch (code) {
    case "auth/weak-password":
      return "Mot de passe trop faible (8 caractères minimum).";
    case "auth/requires-recent-login":
      return "Session expirée. Reconnectez-vous avec le mot de passe temporaire.";
    default:
      return "Impossible de mettre à jour le mot de passe.";
  }
}

/** 1er login : remplace le mot de passe temporaire. */
export async function completePasswordSetup(newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Non connecté");

  await updatePassword(user, newPassword);
  await setDoc(
    doc(getFirestoreDb(), "users", user.uid),
    { mustChangePassword: false, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** @deprecated Utiliser createUserAccount */
export const createOrganizerAccount = (
  creatorUid: string,
  email: string,
  password: string,
  displayName: string,
) => createUserAccount(creatorUid, email, password, displayName, "tournament_manager");
