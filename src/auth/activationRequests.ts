import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "../config/firebaseApp";
import { isFirebaseConfigured } from "../config/firebase";

const COLLECTION = "activationRequests";

export type ActivationRequestStatus = "pending" | "contacted" | "approved" | "dismissed";

export type ActivationRequest = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  tournamentName?: string;
  tournamentId?: string;
  message?: string;
  status: ActivationRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  handledBy?: string;
};

export type CreateActivationRequestInput = {
  uid: string;
  email: string;
  displayName: string;
  tournamentName?: string;
  tournamentId?: string;
  message?: string;
};

function docToRequest(id: string, data: Record<string, unknown>): ActivationRequest {
  return {
    id,
    uid: String(data.uid ?? ""),
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    tournamentName:
      typeof data.tournamentName === "string" ? data.tournamentName : undefined,
    tournamentId: typeof data.tournamentId === "string" ? data.tournamentId : undefined,
    message: typeof data.message === "string" ? data.message : undefined,
    status: (data.status as ActivationRequestStatus) ?? "pending",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    handledBy: typeof data.handledBy === "string" ? data.handledBy : undefined,
  };
}

export async function hasPendingActivationRequest(uid: string): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  const q = query(
    collection(getFirestoreDb(), COLLECTION),
    where("uid", "==", uid),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createActivationRequest(
  input: CreateActivationRequestInput,
): Promise<ActivationRequest> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase non configuré.");
  }

  const pending = await hasPendingActivationRequest(input.uid);
  if (pending) {
    throw new Error("Vous avez déjà une demande en cours. Nous revenons vers vous rapidement.");
  }

  const ref = await addDoc(collection(getFirestoreDb(), COLLECTION), {
    uid: input.uid,
    email: input.email.trim(),
    displayName: input.displayName.trim() || input.email.trim(),
    tournamentName: input.tournamentName?.trim() || null,
    tournamentId: input.tournamentId ?? null,
    message: input.message?.trim() || null,
    status: "pending",
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
  });

  return {
    id: ref.id,
    uid: input.uid,
    email: input.email.trim(),
    displayName: input.displayName.trim() || input.email.trim(),
    tournamentName: input.tournamentName?.trim(),
    tournamentId: input.tournamentId,
    message: input.message?.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function listActivationRequests(): Promise<ActivationRequest[]> {
  const q = query(
    collection(getFirestoreDb(), COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToRequest(d.id, d.data() as Record<string, unknown>));
}

export function subscribeActivationRequests(
  listener: (requests: ActivationRequest[]) => void,
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    listener(
      snap.docs.map((d) => docToRequest(d.id, d.data() as Record<string, unknown>)),
    );
  });
}

export async function updateActivationRequestStatus(
  requestId: string,
  status: ActivationRequestStatus,
  handledBy: string,
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), COLLECTION, requestId), {
    status,
    handledBy,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  });
}

export function activationRequestStatusLabel(status: ActivationRequestStatus): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "contacted":
      return "Contacté";
    case "approved":
      return "Approuvé";
    case "dismissed":
      return "Archivé";
  }
}

export function countPendingRequests(requests: ActivationRequest[]): number {
  return requests.filter((r) => r.status === "pending").length;
}
