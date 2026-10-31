import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const donationTotal = document.querySelector("#total-donations");
const memberCount = document.querySelector("#member-count");
const supporterList = document.querySelector("#supporter-list");
const configured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
const formatRupees = (value) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;

function showConnectionError(message) {
  donationTotal.textContent = "उपलब्ध नहीं";
  memberCount.textContent = "उपलब्ध नहीं";
  supporterList.replaceChildren();
  const notice = document.createElement("p");
  notice.className = "empty-message";
  notice.textContent = message;
  supporterList.append(notice);
}

if (!configured) {
  showConnectionError("लाइव आँकड़े देखने के लिए Firebase कनेक्शन सेटअप होना बाकी है।");
} else {
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

  onSnapshot(doc(db, "settings", "summary"), (snapshot) => {
    const total = snapshot.exists() ? snapshot.data().donationTotal : 0;
    if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
      donationTotal.textContent = "उपलब्ध नहीं";
      console.error("The donation total in settings/summary is invalid.");
      return;
    }
    donationTotal.textContent = formatRupees(total);
  }, (error) => {
    donationTotal.textContent = "उपलब्ध नहीं";
    console.error("Could not load the donation total.", error);
  });

  const membersQuery = query(collection(db, "members"), orderBy("joinedAt", "desc"));
  onSnapshot(membersQuery, (snapshot) => {
    memberCount.textContent = new Intl.NumberFormat("en-IN").format(snapshot.size);
    supporterList.replaceChildren();
    if (snapshot.empty) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "आप पहले सहयोगी बनें — आपका नाम यहाँ सम्मान से जोड़ा जाएगा।";
      supporterList.append(empty);
      return;
    }

    for (const memberDocument of snapshot.docs) {
      const member = memberDocument.data();
      if (typeof member.name !== "string" || !member.name.trim()) {
        console.error(`Member ${memberDocument.id} has no valid name.`);
        continue;
      }
      const card = document.createElement("article");
      card.className = "supporter-card";
      const avatar = document.createElement("span");
      avatar.className = "supporter-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = Array.from(member.name.trim())[0];
      const details = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = member.name.trim();
      const caption = document.createElement("small");
      caption.textContent = "दाना पानी मिशन के सहयोगी";
      details.append(name, caption);
      card.append(avatar, details);
      supporterList.append(card);
    }
  }, (error) => {
    memberCount.textContent = "उपलब्ध नहीं";
    supporterList.replaceChildren();
    const notice = document.createElement("p");
    notice.className = "empty-message";
    notice.textContent = "सहयोगियों की सूची अभी लोड नहीं हो सकी। कृपया कुछ देर बाद फिर आएँ।";
    supporterList.append(notice);
    console.error("Could not load mission members.", error);
  });
}
