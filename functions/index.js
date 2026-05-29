const functions = require("firebase-functions/v1");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

initializeApp();

const APP_NAME = "ChronoBeach";
const BOOTSTRAP_SUPER_ADMIN_EMAIL = "amaury.patris@gmail.com";
const SMTP_SECRET_NAME =
  "projects/chronobeach-e47a9/secrets/firestore-send-email-SMTP_PASSWORD/versions/latest";

function getAdminEmail() {
  return process.env.ADMIN_NOTIFY_EMAIL || "amaury.patris@gmail.com";
}

function getAppAdminUrl() {
  return process.env.APP_ADMIN_URL || "https://chrono-beach.vercel.app/users";
}

function getSmtpUser() {
  return process.env.SMTP_USER || "amaury.patris@gmail.com";
}

let cachedSmtpPassword = null;

async function getSmtpPassword() {
  if (process.env.SMTP_PASSWORD) return process.env.SMTP_PASSWORD;
  if (cachedSmtpPassword) return cachedSmtpPassword;

  try {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({ name: SMTP_SECRET_NAME });
    cachedSmtpPassword = version.payload.data.toString("utf8");
    return cachedSmtpPassword;
  } catch (err) {
    console.warn("[ChronoBeach] SMTP secret unavailable:", err.message);
    return null;
  }
}

async function sendActivationEmail({ to, subject, text, html }) {
  const pass = await getSmtpPassword();
  if (!pass) {
    throw new Error("SMTP non configuré (secret ou SMTP_PASSWORD manquant).");
  }

  const user = getSmtpUser();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    text,
    html,
  });
}

function normalizeAccessCode(code) {
  return String(code).trim().toUpperCase().replace(/\s+/g, "");
}

async function deleteAccessCodes(db, access) {
  if (!access) return;
  if (access.markerCode) {
    await db.collection("accessCodes").doc(normalizeAccessCode(access.markerCode)).delete();
  }
  if (access.spectatorCode) {
    await db.collection("accessCodes").doc(normalizeAccessCode(access.spectatorCode)).delete();
  }
}

async function deleteTournamentTree(db, tournamentId, tournamentData) {
  const sessions = await db
    .collection("tournaments")
    .doc(tournamentId)
    .collection("markerSessions")
    .get();
  for (const session of sessions.docs) {
    await session.ref.delete();
  }

  await deleteAccessCodes(db, tournamentData.access);
  await db.collection("tournamentSummaries").doc(tournamentId).delete();
  await db.collection("tournaments").doc(tournamentId).delete();
}

async function purgeUserData(db, uid) {
  const requests = await db.collection("activationRequests").where("uid", "==", uid).get();
  for (const request of requests.docs) {
    await request.ref.delete();
  }

  const tournaments = await db.collection("tournaments").get();
  for (const tournament of tournaments.docs) {
    const data = tournament.data();
    if (data.managerUid !== uid && data.ownerUid !== uid) continue;
    await deleteTournamentTree(db, tournament.id, data);
  }

  await db.collection("users").doc(uid).delete();
}

async function canDeleteTarget(db, callerUid, callerEmail, targetUid) {
  if (targetUid === callerUid) {
    const targetDoc = await db.collection("users").doc(targetUid).get();
    if (!targetDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Compte introuvable.");
    }
    const target = targetDoc.data();
    if (
      target.role === "super_admin" ||
      callerEmail === BOOTSTRAP_SUPER_ADMIN_EMAIL
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Ce compte ne peut pas être supprimé depuis l'application.",
      );
    }
    return;
  }

  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerRole = callerDoc.exists ? callerDoc.data().role : null;
  const callerIsSuperAdmin =
    callerRole === "super_admin" || callerEmail === BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const callerIsAdmin = callerRole === "admin";

  if (!callerIsSuperAdmin && !callerIsAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Non autorisé.");
  }

  const targetDoc = await db.collection("users").doc(targetUid).get();
  if (!targetDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Compte introuvable.");
  }

  const target = targetDoc.data();
  if (target.role === "super_admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Impossible de supprimer un super administrateur.",
    );
  }
  if (callerIsAdmin && target.role !== "tournament_manager") {
    throw new functions.https.HttpsError("permission-denied", "Non autorisé.");
  }
}

exports.deleteUserAccount = functions
  .region("europe-west1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Connexion requise.");
    }

    const callerUid = context.auth.uid;
    const callerEmail = String(context.auth.token.email || "").toLowerCase();
    const targetUid = typeof data?.uid === "string" && data.uid.trim()
      ? data.uid.trim()
      : callerUid;

    const db = getFirestore();
    await canDeleteTarget(db, callerUid, callerEmail, targetUid);
    await purgeUserData(db, targetUid);

    try {
      await getAuth().deleteUser(targetUid);
    } catch (err) {
      if (err.code !== "auth/user-not-found") throw err;
    }

    return { ok: true };
  });

exports.notifyActivationRequest = functions
  .region("europe-west1")
  .firestore.document("activationRequests/{requestId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const adminEmail = getAdminEmail();
    const appUrl = getAppAdminUrl();

    const displayName = data.displayName || data.email || "Organisateur";
    const tournamentLine = data.tournamentName
      ? `\nTournoi : ${data.tournamentName}`
      : "";
    const messageLine = data.message ? `\n\nMessage :\n${data.message}` : "";

    const subject = `[${APP_NAME}] Demande d'activation — ${displayName}`;
    const text = [
      "Bonjour,",
      "",
      "Un club / organisateur demande l'activation de son compte.",
      "",
      `Nom : ${displayName}`,
      `E-mail : ${data.email}`,
      tournamentLine,
      messageLine,
      "",
      `Voir les demandes : ${appUrl}`,
      "",
      "— Notification automatique",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <p>Bonjour,</p>
      <p><strong>Un club demande l'activation de son compte</strong> sur ${APP_NAME}.</p>
      <ul>
        <li><strong>Nom :</strong> ${displayName}</li>
        <li><strong>E-mail :</strong> ${data.email}</li>
        ${data.tournamentName ? `<li><strong>Tournoi :</strong> ${data.tournamentName}</li>` : ""}
      </ul>
      ${data.message ? `<p><strong>Message :</strong><br/>${String(data.message).replace(/\n/g, "<br/>")}</p>` : ""}
      <p><a href="${appUrl}">Ouvrir l'espace admin → Demandes d'activation</a></p>
    `;

    try {
      await sendActivationEmail({ to: adminEmail, subject, text, html });
      console.log("[ChronoBeach] E-mail d'activation envoyé à", adminEmail);
    } catch (err) {
      console.error("[ChronoBeach] Envoi SMTP direct échoué, fallback collection mail:", err.message);
      await getFirestore().collection("mail").add({
        to: adminEmail,
        createdAt: FieldValue.serverTimestamp(),
        message: { subject, text, html },
      });
    }
  });
