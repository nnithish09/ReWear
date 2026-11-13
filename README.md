# ReWear – Personal Wardrobe Tracker

A digital wardrobe manager built with **React + Vite + Tailwind CSS** and **Firebase Authentication + Cloud Firestore** (NoSQL). Users sign in, then add, view, search, edit, categorise and delete the clothes they own. Every user has a private wardrobe, and photos are uploaded straight from the device and stored **as Base64 inside Firestore — Firebase Storage is not used.**

---

## 1. Run it on Windows (step by step)

1. **Install Node.js** (version 20 or newer, the "LTS" download) from <https://nodejs.org> and finish the installer. Check it with `node -v` in a terminal.
2. **Extract the ZIP.** Right-click `ReWear_FINAL.zip` → *Extract All…*. You get one folder called `ReWear_FINAL`.
3. **Open the folder in VS Code** (*File → Open Folder…* → `ReWear_FINAL`), then open a terminal (*Terminal → New Terminal*).
4. **Create your `.env` file.** The ZIP deliberately contains **no `.env`** (it holds your Firebase key).
   - If you already have a `.env` from your earlier ReWear folder, **copy it into `ReWear_FINAL`** — you are done with steps 4–5. Keep your original `.env` safe; this project never overwrites it.
   - Otherwise, copy `.env.example` to `.env` (in the terminal: `copy .env.example .env`).
5. **Fill in your Firebase configuration** in `.env` (Firebase Console → ⚙ Project settings → *General* → *Your apps* → *Web app* → *SDK setup and configuration*). Values for this project:

   | Variable | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | *your key from the Console / your existing `.env`* |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `rewear-e70d6.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `rewear-e70d6` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `rewear-e70d6.firebasestorage.app` (not used, but keep it) |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `372486422330` |
   | `VITE_FIREBASE_APP_ID` | `1:372486422330:web:cefef2604c46f053975a03` |
   | `VITE_FIREBASE_MEASUREMENT_ID` | `G-9K8QDCEZ12` |

6. **Install dependencies:** `npm install`
7. **Start the app:** `npm run dev`
8. **Open** the address printed in the terminal — normally <http://localhost:5173>.
   (If you change `.env` later, stop the server with `Ctrl+C` and run `npm run dev` again.)
9. **Publish the Firestore rules** — *required, see section 2*. Without this, saving clothes fails with "Missing or insufficient permissions".

Other commands: `npm run build` (production build into `dist/`), `npm run preview` (serve that build), `npm test` (automated tests, section 5).

---

## 2. Firebase Console checklist (one time)

Project: **ReWear** (`rewear-e70d6`). Open <https://console.firebase.google.com>.

1. **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
2. **Authentication → Settings → Authorized domains:** make sure `localhost` is listed (it is by default). Add your own domain if you host the app.
3. **Firestore Database:** create the database if it does not exist (any location).
4. **Publish the security rules (most important):**
   1. Firestore Database → **Rules** tab.
   2. **Select everything in the editor and delete it.**
   3. Open `firestore.rules` from this project, copy **all** of it, paste it in.
   4. Click **Publish**, and wait for the "published" confirmation.
   5. Check that the editor now starts with `rules_version = '2';` followed by `// ReWear security rules – v3`. If you see another version (or none), the old rules are still live.

   *Command-line alternative:* `npm i -g firebase-tools`, `firebase login`, then `firebase deploy --only firestore:rules` (`.firebaserc` already points to `rewear-e70d6`).

> The rules in this ZIP have **not** been published by the author of this package — publishing happens in *your* Firebase project and only you can do it.

Firebase Storage is **not** required and is **not** used.

---

## 3. How the app works

### Features
- Email/password sign-up, login, logout, password-reset email, persistent sessions; Google sign-in (popup)
- Protected routes (`onAuthStateChanged`), session survives refresh
- Dashboard: totals (all / available / donated / discarded / categories), distribution chart, per-category bars, recently added — all computed live from Firestore
- Wardrobe: search by name or brand, filter by category / colour / occasion / status, sort newest or oldest, grid and list views, skeleton loaders, empty states
- Add / view / edit / delete clothing with confirmation dialog; change availability from the details page
- **Photo upload:** file picker or drag-and-drop, instant preview, change / remove, automatic resize + compression, progress indicator
- Responsive layout (sidebar becomes a drawer on mobile), toast notifications

### Tech stack
React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · Firebase JS SDK v10 (modular) · Recharts · Lucide React · React Hot Toast

### Firestore structure

```
users/{uid}
  name, email, photoURL, createdAt, updatedAt
  wardrobe/{itemId}
    itemName, category, color, size, brand, occasion, description,
    status (Available | Donated | Discarded), purchaseDate (YYYY-MM-DD),
    imageBase64   (optional) "data:image/jpeg;base64,…"  ≤ 460,800 characters
    imageUrl      (optional, legacy records only)
    createdAt, updatedAt
```

`uid` is always the signed-in user's Firebase UID, and every query is built from it. The rules enforce the same boundary on the server, so one user can never read or change another user's wardrobe.

### CRUD

| Operation | Service function | Firestore call |
|---|---|---|
| Create | `addClothing()` | `addDoc()` + `serverTimestamp()` |
| Read | `getClothing()`, `getClothingById()`, `subscribeToWardrobe()` | `getDocs()`, `getDoc()`, `onSnapshot()` |
| Update | `updateClothing()` | `updateDoc()` (only changed clothing fields + `updatedAt`) |
| Delete | `deleteClothing()` | `deleteDoc()` |

The wardrobe list uses `onSnapshot`, so adds, edits and deletes appear on every page immediately and the dashboard statistics update automatically. A save only reports success after Firestore has confirmed it; on failure the form keeps everything the user typed and the chosen photo.

### Images are Base64 inside Firestore (no Firebase Storage)

Workflow (`src/utils/imageProcessing.js`, `src/components/ImageUploader.jsx`):

1. Validate: JPG / PNG / WEBP only, original file ≤ **10 MB**, file signature checked (a renamed `.txt` is rejected).
2. Decode with `createImageBitmap()` (falls back to an `<img>` element); corrupt files show a friendly error.
3. Resize proportionally so the longest side is ≤ **800 px** (never upscaled), on a **white** canvas so transparency does not turn black.
4. Encode as JPEG (`canvas.toBlob`, quality 0.85). If the result is too large, quality is lowered step by step (to 0.45), then the dimensions (to 320 px).
5. Convert to a data URL with `FileReader.readAsDataURL()`. The final string must be ≤ **460,800 characters** — a conservative limit, because Firestore documents may not exceed 1 MiB. If nothing fits, nothing is saved and the user is asked to choose a smaller image.

| Edit action | What is written |
|---|---|
| Don't touch the image | image fields are left untouched (no recompression, no extra data written) |
| Choose a new image | `imageBase64` replaced |
| Remove the image | `imageBase64` **and** legacy `imageUrl` removed with `deleteField()` |

Display priority everywhere: `imageBase64` → legacy `imageUrl` → placeholder. Base64 data is never put in localStorage/sessionStorage, never logged and never shown in error messages. Because images live in the documents, the live wardrobe listener downloads them together with the items; this is fine for a personal wardrobe but would slow down with hundreds of items.

### Security rules (`firestore.rules`)

- authentication required; only `request.auth.uid == userId` may touch `users/{userId}` and its `wardrobe`
- exact field allow-list (`hasOnly`) and required list (`hasAll`); `imageBase64` and legacy `imageUrl` are optional strings; `imageBase64` ≤ 460,800 characters
- category / occasion / status must be one of the allowed values; string lengths limited
- `createdAt`/`updatedAt` must equal the server time on create; on update `createdAt` cannot change and `updatedAt` must be the server time
- everything else is denied; there is no public access

---

## 4. Try it yourself (manual test checklist)

1. **Register** with email + password → you land on the dashboard. Refresh: you stay signed in. **Log out**, then open `/wardrobe` directly: you are sent to the login page.
2. **Google login:** *Continue with Google*; closing the popup should show no error.
3. **Forgot password:** enter your email; the reset mail arrives.
4. **Add:** *Add clothing* → fill the required fields (*) → drop in a photo → *Add to wardrobe*. You get a green confirmation and the form clears. In Firebase Console → Firestore → `users/<your uid>/wardrobe/<id>`, the document has `imageBase64` starting with `data:image/jpeg;base64,`.
5. **View:** the item shows on *My Wardrobe*, the dashboard "Recently added" and its details page. Refresh: the image is still there.
6. **Search / filter:** search by name or brand; filter by category, colour, occasion and status; try both sort orders and grid/list.
7. **Edit:** change the name only → the image stays. Replace the photo. Remove the photo (the field disappears in Firestore).
8. **Status:** on the details page switch Available → Donated; dashboard counts change.
9. **Delete:** confirm the dialog → the item disappears and the document is gone from Firestore.
10. **Privacy:** create a second account; it must see none of the first account's items. (Optional: Firestore → Rules → *Rules Playground* → simulate an unauthenticated `get` on `/users/<uid>/wardrobe/<id>` and a signed-in read of a different uid — both must be **denied**.)
11. **Errors:** try a `.gif`, a file bigger than 10 MB and a renamed text file — each shows a clear message.

---

## 5. Automated tests

```bash
npm test
```

Needs only Node.js 20+; no extra packages and **no Firebase connection** (Firebase is replaced by in-memory mocks). It covers:

- form + sign-up validation, image-source priority (`imageBase64` → `imageUrl` → placeholder)
- the Firestore service: paths use the signed-in UID, only allowed fields are written, images are saved in the same write, invalid/oversize images create **no** record, update leaves image fields alone unless asked, removal uses `deleteField()`, delete, listener cleanup, offline guard
- the auth service: persistence, profile document, Google popup options, error messages
- image compression logic with fake browser APIs: resize ratio, white background, quality/size retries, exact size-limit boundary, corrupt and unsupported files
- a consistency check that **reads `firestore.rules` itself** and fails if its allowed fields, categories, occasions, statuses or 460,800 limit ever disagree with the application
- the duplicate-submit guard

**What these tests cannot prove:** they never talk to the real Firebase, so they do not prove that sign-in works, that your published rules accept the writes, or that the UI looks right. Use the manual checklist above for that.

---

## 6. Troubleshooting

### "Could not save the item: Missing or insufficient permissions."
Firestore **rejected** the write, almost always because the rules published in your Firebase project are not the rules in this folder (the very first version of the rules required a field this version no longer writes).
1. Publish `firestore.rules` exactly as described in section 2 and verify the "v3" comment line.
2. Make sure you are signed in (the sidebar shows your name) and that `.env` points to project `rewear-e70d6`. The red banner above the form shows the signed-in user ID and project ID that were used.
3. In Firebase Console → Firestore → Rules, use the *Rules Playground*: simulate a **create** on `/users/<that uid>/wardrobe/test` as that user.
4. If your Firestore database was created in "test mode" long ago, its temporary open rules have expired — publishing the rules fixes that too.

### Firebase configuration errors
- *"Firebase is not configured"* screen → `.env` is missing or a variable is empty. Check the names (they must start with `VITE_`), save the file, restart `npm run dev`.
- `auth/api-key-not-valid` or `auth/invalid-api-key` → the API key was copied wrongly (no quotes, no spaces).
- `.env` must be in the project root, next to `package.json`.

### Google login problems
- `auth/unauthorized-domain` → add the domain you are using (e.g. `localhost`) under Authentication → Settings → Authorized domains.
- `auth/popup-blocked` → allow pop-ups for the site, then retry.
- `auth/operation-not-allowed` → enable the Google provider under Authentication → Sign-in method.
- Closing the popup is not an error and shows nothing.

### Image size / processing errors
- "Unsupported file type" → use JPG, PNG or WEBP.
- "maximum allowed size is 10.0 MB" → pick a smaller original (phone photos are usually fine).
- "too detailed to compress below the 450 KB limit" → choose a simpler or smaller picture, or crop it first.
- "could not be read … corrupted" → the file is damaged; re-export or screenshot it.
- "browser does not support the image features" → use a current Chrome, Edge, Firefox or Safari.

### Saves failing for other reasons
- "Could not reach Firestore" / offline message → check your internet connection; the form keeps your data, press the button again.
- "Your session is not active" → sign out and in again.
- A save error never clears the form; only a confirmed save does.

---

## 7. Project structure

```
ReWear_FINAL/
├── firestore.rules          ← publish this in the Firebase Console
├── firebase.json  .firebaserc
├── .env.example             ← copy to .env and fill in (never commit .env)
├── package.json  vite.config.js  tailwind.config.js  postcss.config.js  index.html
├── public/
├── src/
│   ├── firebase/firebaseConfig.js        single Firebase init, exports auth + db
│   ├── services/                         authService.js, clothingService.js
│   ├── context/AuthContext.jsx           onAuthStateChanged + live profile
│   ├── hooks/                            useAuth.js, useWardrobe.js
│   ├── components/                       Sidebar, Navbar, ClothingCard, ClothingForm,
│   │                                     ImageUploader, ItemImage, FilterPanel, …
│   ├── pages/                            Login, Register, Dashboard, Wardrobe, Add/Edit/Details, …
│   └── utils/                            validation, imageProcessing, imageSource, …
└── tests/                                npm test
```

## 8. Screenshots

Add your own screenshots here after running the app: `docs/login.png`, `docs/dashboard.png`, `docs/wardrobe.png`, `docs/add-item.png`.

## 9. Future enhancements

Outfit builder, wear-count tracking, wardrobe export, dark mode, optional Firebase Storage for larger photos.
