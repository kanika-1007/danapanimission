import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, query, serverTimestamp, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const configured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
const loginPanel = document.querySelector("#login-panel");
const dashboardPanel = document.querySelector("#dashboard-panel");
const statusMessage = document.querySelector("#status-message");
const dashboardStatus = document.querySelector("#dashboard-status");
const loginForm = document.querySelector("#login-form");
const donationForm = document.querySelector("#donation-form");
const memberForm = document.querySelector("#member-form");
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

  onAuthStateChanged(auth, (user) => {
    if (stopSummaryListener) {
      stopSummaryListener();
      stopSummaryListener = undefined;
    }
    loginPanel.hidden = Boolean(user);
    dashboardPanel.hidden = !user;
    if (!user) return;

    document.querySelector("#admin-user").textContent = user.email || "व्यवस्थापक";
    const summaryRef = doc(db, "settings", "summary");
    stopSummaryListener = onSnapshot(summaryRef, (snapshot) => {
      const total = snapshot.exists() ? snapshot.data().donationTotal : 0;
      if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
        showStatus(dashboardStatus, "Firestore में कुल सहयोग राशि सही संख्या नहीं है। इसे ठीक करके फिर सेव करें।", true);
        console.error("The donation total in settings/summary is invalid.");
        return;
      }
      document.querySelector("#donation-total").value = String(total);
    }, (error) => {
      showStatus(dashboardStatus, "कुल सहयोग राशि लोड नहीं हो सकी। Firestore permissions जाँचें।", true);
      console.error("Could not load the donation total.", error);
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
    if (!Number.isSafeInteger(amount) || amount < 0) {
      showStatus(dashboardStatus, "कुल सहयोग राशि शून्य या उससे अधिक पूर्ण रुपये में भरें।", true);
      return;
    }
    const submitButton = donationForm.querySelector("button");
    submitButton.disabled = true;
    showStatus(dashboardStatus, "राशि सेव हो रही है…");
    try {
      await setDoc(doc(db, "settings", "summary"), { donationTotal: amount, updatedAt: serverTimestamp() });
      showStatus(dashboardStatus, "कुल सहयोग राशि सफलतापूर्वक अपडेट हुई।");
    } catch (error) {
      showStatus(dashboardStatus, "राशि सेव नहीं हुई। आपका admin access और Firestore rules जाँचें।", true);
      console.error("Could not update the donation total.", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  memberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = memberForm.elements.name.value.trim();
    if (!name) {
      showStatus(dashboardStatus, "कृपया सहयोगी का नाम भरें।", true);
      return;
    }
    const submitButton = memberForm.querySelector("button");
    submitButton.disabled = true;
    showStatus(dashboardStatus, "सहयोगी जोड़ा जा रहा है…");
    try {
      await addDoc(collection(db, "members"), { name, joinedAt: serverTimestamp() });
      memberForm.reset();
      showStatus(dashboardStatus, "नया सहयोगी सफलतापूर्वक जोड़ा गया।");
    } catch (error) {
      showStatus(dashboardStatus, "सहयोगी नहीं जुड़ा। आपका admin access और Firestore rules जाँचें।", true);
      console.error("Could not add the mission member.", error);
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
