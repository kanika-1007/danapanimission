# दाना पानी मिशन

A lightweight Hindi-language public website and Firebase-backed admin dashboard for the Dana Pani Mission in Sawai Madhopur.

## Firebase setup

1. Create a Firebase project and register a **Web app** in Firebase Console.
2. Copy the web app configuration into `firebase-config.js`.
3. In **Authentication → Sign-in method**, enable **Email/Password**, then create the administrator's user account.
4. Create a **Firestore Database** and publish the included `firestore.rules`.
5. In Firestore, create a document in the `admins` collection whose document ID is the administrator's Firebase Auth **UID**. The document may contain a simple field such as `role: "admin"`. Do not let the website create admin records.
6. Serve the site over HTTP (ES modules do not work from a `file://` URL). Deploy the site files and `firestore.rules` using your chosen static host and Firebase tooling.

The public page reads `settings/summary.donationTotal` and `settings/summary.memberCount` in real time. The admin can update only the total donation amount and the number of mission members. The site advertises the ₹300 monthly minimum without storing or publishing individual member contribution amounts.

The phone number on the site, **94147 09683**, is the contact number included in the supplied campaign artwork.

## Local preview

Serve this folder with the VS Code Live Server extension or another static HTTP server, then open its local URL. Do not open `index.html` directly as a `file://` URL: the site uses JavaScript modules. Firebase-backed data and admin sign-in require the Firebase setup above.
