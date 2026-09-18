import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3G9B1Xu_ZjcErZXGU0r6Jl7P0Rn-HxOc",
  authDomain: "tilly-app-a7068.firebaseapp.com",
  projectId: "tilly-app-a7068",
  storageBucket: "tilly-app-a7068.firebasestorage.app",
  messagingSenderId: "125200035588",
  appId: "1:125200035588:web:04ba72b57263e09e182a51",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Bildet exakt dieselbe kleine API nach, die die App bisher über window.storage
// (Claude-Artefakt-Speicher) genutzt hat. So musste am eigentlichen App-Code
// so gut wie nichts geändert werden. Der zweite Parameter ("shared") wird hier
// ignoriert, da in dieser eigenständigen Version ohnehin alles über eine
// gemeinsame Firestore-Datenbank läuft.
export const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, "tilly", key));
    if (!snap.exists()) return null;
    return { value: snap.data().value };
  },
  async set(key, value) {
    await setDoc(doc(db, "tilly", key), { value });
    return { value };
  },
};
