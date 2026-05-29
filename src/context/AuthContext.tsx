import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "../config/firebaseApp";
import { isFirebaseConfigured } from "../config/firebase";
import { resolveAuthProfile, completePasswordSetup as saveNewPassword, registerDiscoveryAccount, deleteUserAccount as requestAccountDeletion } from "../auth/userService";
import { setBillingContext } from "../auth/billingContext";
import {
  canManageUsers,
  isPlatformStaff,
  isSuperAdminEmail,
  type UserProfile,
  type UserRole,
  canSelfDeleteAccount as userCanSelfDeleteAccount,
} from "../auth/roles";
import { canGoLive } from "../auth/billing";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isSuperAdmin: boolean;
  isPlatformStaff: boolean;
  isTournamentManager: boolean;
  canManageUsers: boolean;
  loading: boolean;
  profileLoading: boolean;
  authRequired: boolean;
  accessDenied: string | null;
  mustChangePassword: boolean;
  canGoLive: boolean;
  isDiscoveryMode: boolean;
  canSelfDeleteAccount: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpDiscovery: (email: string, password: string, displayName: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteAccount: (targetUid?: string) => Promise<void>;
  completePasswordSetup: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authRequired = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(authRequired);
  const [profileLoading, setProfileLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  const loadProfile = useCallback(async (next: User | null) => {
    if (!next) {
      setProfile(null);
      setRole(null);
      setAccessDenied(null);
      setBillingContext(undefined, null);
      return;
    }

    if (next.isAnonymous) {
      setProfile(null);
      setRole(null);
      setAccessDenied(null);
      setBillingContext(undefined, null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const resolved = await resolveAuthProfile(next);
      setProfile(resolved.profile);
      setRole(resolved.role);
      setBillingContext(resolved.profile?.billingStatus, resolved.role);
      setAccessDenied(
        resolved.role ? null : "Compte non autorisé. Contactez l'administrateur ChronoBeach.",
      );
    } catch (err) {
      if (isSuperAdminEmail(next.email)) {
        setProfile({
          uid: next.uid,
          email: next.email ?? "",
          displayName: next.displayName ?? next.email?.split("@")[0] ?? "Admin",
          role: "super_admin",
        });
        setRole("super_admin");
        setBillingContext("active", "super_admin");
        setAccessDenied(null);
        return;
      }
      const msg =
        err instanceof Error && err.message.includes("permission")
          ? "Permissions Firestore insuffisantes. Publiez firestore.rules dans Firebase Console (Firestore → Règles → Publier), puis reconnectez-vous."
          : err instanceof Error
            ? err.message
            : "Impossible de charger le profil.";
      setProfile(null);
      setRole(null);
      setAccessDenied(msg);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authRequired) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      void loadProfile(next);
    });
  }, [authRequired, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAccessDenied(null);
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    await loadProfile(cred.user);
  }, [loadProfile]);

  const signUpDiscovery = useCallback(
    async (email: string, password: string, displayName: string) => {
      setAccessDenied(null);
      setProfileLoading(true);
      try {
        await registerDiscoveryAccount(email, password, displayName);
        const auth = getFirebaseAuth();
        if (auth.currentUser) await loadProfile(auth.currentUser);
      } finally {
        setProfileLoading(false);
      }
    },
    [loadProfile],
  );

  const signOutUser = useCallback(async () => {
    await signOut(getFirebaseAuth());
    setProfile(null);
    setRole(null);
    setAccessDenied(null);
    setBillingContext(undefined, null);
  }, []);

  const deleteAccount = useCallback(
    async (targetUid?: string) => {
      const uid = targetUid ?? user?.uid;
      if (!uid) throw new Error("Non connecté");
      await requestAccountDeletion(uid);
      if (uid === user?.uid) {
        await signOut(getFirebaseAuth());
        setProfile(null);
        setRole(null);
        setAccessDenied(null);
        setBillingContext(undefined, null);
      }
    },
    [user],
  );

  const completePasswordSetup = useCallback(
    async (password: string) => {
      await saveNewPassword(password);
      const auth = getFirebaseAuth();
      if (auth.currentUser) await loadProfile(auth.currentUser);
    },
    [loadProfile],
  );

  const mustChangePassword = profile?.mustChangePassword === true;
  const userCanGoLive = canGoLive(profile?.billingStatus, role);
  const isDiscoveryMode =
    authRequired && role === "tournament_manager" && profile?.billingStatus === "discovery";
  const canSelfDeleteAccountFlag = userCanSelfDeleteAccount(user?.email, role);

  const isSuperAdmin = role === "super_admin";
  const platformStaff = isPlatformStaff(role);
  const tournamentManager = role === "tournament_manager" || platformStaff;

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      isSuperAdmin,
      isPlatformStaff: platformStaff,
      isTournamentManager: tournamentManager,
      canManageUsers: canManageUsers(role),
      loading,
      profileLoading,
      authRequired,
      accessDenied,
      mustChangePassword,
      canGoLive: userCanGoLive,
      isDiscoveryMode,
      canSelfDeleteAccount: canSelfDeleteAccountFlag,
      signIn,
      signUpDiscovery,
      signOutUser,
      deleteAccount,
      completePasswordSetup,
    }),
    [
      user,
      profile,
      role,
      isSuperAdmin,
      platformStaff,
      tournamentManager,
      loading,
      profileLoading,
      authRequired,
      accessDenied,
      mustChangePassword,
      userCanGoLive,
      isDiscoveryMode,
      canSelfDeleteAccountFlag,
      signIn,
      signUpDiscovery,
      signOutUser,
      deleteAccount,
      completePasswordSetup,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors provider");
  return ctx;
}
