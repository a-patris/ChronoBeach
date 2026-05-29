const functions = require("firebase-functions/v1");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const APP_NAME = "ChronoBeach";

function getAdminEmail() {
  return process.env.ADMIN_NOTIFY_EMAIL || "amaury.patris@gmail.com";
}

function getAppAdminUrl() {
  return process.env.APP_ADMIN_URL || "https://chronobeach.vercel.app/users";
}

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

    await getFirestore().collection("mail").add({
      to: adminEmail,
      createdAt: FieldValue.serverTimestamp(),
      message: { subject, text, html },
    });
  });
