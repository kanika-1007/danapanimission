import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const donationTotal = document.querySelector("#total-donations");
const memberCount = document.querySelector("#member-count");
const photoBanner = document.querySelector("#photo-banner");
const bannerImage = document.querySelector("#photo-banner-image");
const bannerError = document.querySelector("#photo-banner-error");
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

  onSnapshot(doc(db, "settings", "banner"), (snapshot) => {
    if (!snapshot.exists()) {
      bannerImage.src = "श्री राधा गोविंद गौशाला कुस्तला.jpg";
      bannerImage.dataset.fallback = "true";
      bannerError.hidden = true;
      return;
    }
    const driveFileId = snapshot.data().driveFileId;
    if (typeof driveFileId !== "string" || !/^[A-Za-z0-9_-]{10,200}$/.test(driveFileId)) {
      bannerImage.src = "श्री राधा गोविंद गौशाला कुस्तला.jpg";
      bannerImage.dataset.fallback = "true";
      console.error("The Google Drive file ID in settings/banner is invalid.");
      return;
    }
    bannerError.hidden = true;
    bannerImage.dataset.fallback = "false";
    bannerImage.src = `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1600`;
    photoBanner.hidden = false;
  }, (error) => {
    photoBanner.hidden = true;
    console.error("Could not load the banner photo settings.", error);
  });

  bannerImage.addEventListener("error", () => {
    if (bannerImage.dataset.fallback === "true") return;
    bannerImage.src = "श्री राधा गोविंद गौशाला कुस्तला.jpg";
    bannerImage.dataset.fallback = "true";
    bannerError.hidden = false;
  });
}
