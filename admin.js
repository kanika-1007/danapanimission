import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const configured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
const loginPanel = document.querySelector("#login-panel");
const dashboardPanel = document.querySelector("#dashboard-panel");
const statusMessage = document.querySelector("#status-message");
const dashboardStatus = document.querySelector("#dashboard-status");
const loginForm = document.querySelector("#login-form");
const donationForm = document.querySelector("#donation-form");
const bannerForm = document.querySelector("#banner-form");
const logoutButton = document.querySelector("#logout-button");
const showStatus = (element, message, isError = false) => {
  element.textContent = message;
  element.classList.toggle("error", isError);
};

if (!configured) {
  showStatus(statusMessage, "व्यवस्थापक लॉगिन शुरू करने के लिए पहले firebase-config.js में Firebase सेटिंग जोड़ें।", true);
} else {
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let stopSummaryListener;
  let stopBannerListener;

  onAuthStateChanged(auth, (user) => {
    if (stopSummaryListener) {
      stopSummaryListener();
      stopSummaryListener = undefined;
    }
    if (stopBannerListener) {
      stopBannerListener();
      stopBannerListener = undefined;
    }
    loginPanel.hidden = Boolean(user);
    dashboardPanel.hidden = !user;
    if (!user) return;

    document.querySelector("#admin-user").textContent = user.email || "व्यवस्थापक";
    const summaryRef = doc(db, "settings", "summary");
    stopSummaryListener = onSnapshot(summaryRef, (snapshot) => {
      const summary = snapshot.exists() ? snapshot.data() : {};
      const total = summary.donationTotal ?? 0;
      const count = summary.memberCount ?? 0;
      if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(count) || count < 0) {
        showStatus(dashboardStatus, "Firestore में सहयोग राशि या सहयोगियों की संख्या सही नहीं है। इसे ठीक करके फिर सेव करें।", true);
        console.error("The donation total or member count in settings/summary is invalid.");
        return;
      }
      document.querySelector("#donation-total").value = String(total);
      document.querySelector("#member-count").value = String(count);
    }, (error) => {
      showStatus(dashboardStatus, "मिशन के आँकड़े लोड नहीं हो सके। Firestore permissions जाँचें।", true);
      console.error("Could not load the mission summary.", error);
    });

    stopBannerListener = onSnapshot(doc(db, "settings", "banner"), (snapshot) => {
      document.querySelector("#banner-drive-link").value = snapshot.exists()
        ? `https://drive.google.com/file/d/${snapshot.data().driveFileId}/view`
        : "";
    }, (error) => {
      showStatus(dashboardStatus, "बैनर फोटो की जानकारी लोड नहीं हो सकी। Firestore permissions जाँचें।", true);
      console.error("Could not load the banner photo.", error);
    });
  }, (error) => {
    showStatus(statusMessage, "साइन-इन स्थिति जाँची नहीं जा सकी। कृपया पेज रीफ़्रेश करें।", true);
    console.error("Could not check the sign-in state.", error);
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector("button");
    submitButton.disabled = true;
    showStatus(statusMessage, "साइन इन हो रहा है…");
    try {
      await signInWithEmailAndPassword(auth, loginForm.elements.email.value.trim(), loginForm.elements.password.value);
      loginForm.reset();
      showStatus(statusMessage, "");
    } catch (error) {
      showStatus(statusMessage, "साइन इन नहीं हो सका। ईमेल, पासवर्ड और Firebase Auth सेटिंग जाँचें।", true);
      console.error("Admin sign-in failed.", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  donationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(donationForm.elements.donationTotal.value);
    const count = Number(donationForm.elements.memberCount.value);
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(count) || count < 0) {
      showStatus(dashboardStatus, "सहयोग राशि और सहयोगियों की संख्या शून्य या उससे अधिक पूर्ण संख्या में भरें।", true);
      return;
    }
    const submitButton = donationForm.querySelector("button");
    submitButton.disabled = true;
    showStatus(dashboardStatus, "मिशन के आँकड़े सेव हो रहे हैं…");
    try {
      await setDoc(doc(db, "settings", "summary"), {
        donationTotal: amount,
        memberCount: count,
        updatedAt: serverTimestamp()
      });
      showStatus(dashboardStatus, "मिशन के आँकड़े सफलतापूर्वक अपडेट हुए।");
    } catch (error) {
      showStatus(dashboardStatus, "मिशन के आँकड़े सेव नहीं हुए। आपका admin access और Firestore rules जाँचें।", true);
      console.error("Could not update the mission summary.", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  bannerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rawLink = bannerForm.elements.driveLink.value.trim();
    const bannerRef = doc(db, "settings", "banner");
    const submitButton = bannerForm.querySelector("button");
    let driveFileId;
    if (rawLink) {
      try {
        const link = new URL(rawLink);
        const isDriveLink = link.protocol === "https:" && link.hostname === "drive.google.com";
        const pathMatch = link.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
        driveFileId = pathMatch ? pathMatch[1] : link.searchParams.get("id");
        if (!isDriveLink || !driveFileId || !/^[A-Za-z0-9_-]{10,200}$/.test(driveFileId)) {
          showStatus(dashboardStatus, "कृपया मान्य Google Drive फोटो लिंक पेस्ट करें।", true);
          return;
        }
      } catch {
        showStatus(dashboardStatus, "कृपया मान्य Google Drive फोटो लिंक पेस्ट करें।", true);
        return;
      }
    }

    submitButton.disabled = true;
    showStatus(dashboardStatus, rawLink ? "बैनर फोटो सेव हो रही है…" : "बैनर फोटो हटाई जा रही है…");
    try {
      if (!rawLink) {
        await deleteDoc(bannerRef);
        showStatus(dashboardStatus, "बैनर फोटो हटा दी गई।");
        return;
      }

      await setDoc(bannerRef, { driveFileId, updatedAt: serverTimestamp() });
      showStatus(dashboardStatus, "बैनर फोटो सफलतापूर्वक अपडेट हुई।");
    } catch (error) {
      showStatus(dashboardStatus, "बैनर फोटो सेव नहीं हुई। आपका admin access और Firestore rules जाँचें।", true);
      console.error("Could not update the banner photo.", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showStatus(statusMessage, "आप साइन आउट हो गए हैं।");
    } catch (error) {
      showStatus(dashboardStatus, "साइन आउट नहीं हो सका। कृपया फिर कोशिश करें।", true);
      console.error("Admin sign-out failed.", error);
    }
  });
}
