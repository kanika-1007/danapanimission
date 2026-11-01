import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const donationTotal = document.querySelector("#total-donations");
const memberCount = document.querySelector("#member-count");
const configured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
const formatRupees = (value) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;

function showConnectionError(message) {
  donationTotal.textContent = "उपलब्ध नहीं";
  memberCount.textContent = "उपलब्ध नहीं";
  console.error(message);
}

if (!configured) {
  showConnectionError("लाइव आँकड़े देखने के लिए Firebase कनेक्शन सेटअप होना बाकी है।");
} else {
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

  onSnapshot(doc(db, "settings", "summary"), (snapshot) => {
    const summary = snapshot.exists() ? snapshot.data() : {};
    const total = summary.donationTotal ?? 0;
    const count = summary.memberCount ?? 0;
    if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(count) || count < 0) {
      donationTotal.textContent = "उपलब्ध नहीं";
      memberCount.textContent = "उपलब्ध नहीं";
      console.error("The donation total or member count in settings/summary is invalid.");
      return;
    }
    donationTotal.textContent = formatRupees(total);
    memberCount.textContent = new Intl.NumberFormat("en-IN").format(count);
  }, (error) => {
    donationTotal.textContent = "उपलब्ध नहीं";
    memberCount.textContent = "उपलब्ध नहीं";
    console.error("Could not load the mission summary.", error);
  });
}
