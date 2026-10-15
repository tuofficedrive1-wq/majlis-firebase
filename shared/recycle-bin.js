// shared/recycle-bin.js  —  Delete = "Bin me bhejna".  Koi data seedha ghayab nahi hota.
//
// Istemal:
//   import { db } from "../shared/firebase-init.js";
//   import { moveToBin, moveManyToBin, replaceDocs, restoreFromBin } from "../shared/recycle-bin.js";
//
//   // pehle:  await deleteDoc(doc(db,"asatiza_details",id));
//   // ab:     await moveToBin(db,"asatiza_details",id,{ label:"Ustaad: "+name });
//
// Bin me item 30 din rehta hai (Firestore TTL policy se auto-clean, guide dekhein).
import {
  collection, doc, getDoc, getDocs, writeBatch, serverTimestamp,
  query, orderBy, limit, Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth } from "./firebase-init.js";

export const BIN = "recycle_bin";
const KEEP_DAYS = 30;
const MAX_OPS = 450; // Firestore batch limit 500

function meta(extra = {}) {
  const u = auth.currentUser;
  return {
    deletedAt: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + KEEP_DAYS * 864e5),
    deletedBy: u ? u.uid : null,
    deletedByEmail: u ? u.email : null,
    restored: false,
    ...extra
  };
}
function binEntry(db, snap, extra) {
  return {
    srcCollection: snap.ref.parent.path,   // jaise "asatiza_details"
    srcId: snap.id,
    data: snap.data(),
    ...meta(extra)
  };
}

/** Ek doc ko bin me daalo (bin entry + delete ek saath, atomic). */
export async function moveToBin(db, collectionPath, id, extra = {}) {
  const ref = doc(db, collectionPath, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const b = writeBatch(db);
  b.set(doc(collection(db, BIN)), binEntry(db, snap, extra));
  b.delete(ref);
  await b.commit();
  return true;
}

/** Bohat se docSnapshots (getDocs ke result) ko bin me daalo. */
export async function moveManyToBin(db, snaps, extra = {}) {
  const list = Array.isArray(snaps) ? snaps : snaps.docs;
  const per = Math.floor(MAX_OPS / 2);
  for (let i = 0; i < list.length; i += per) {
    const b = writeBatch(db);
    list.slice(i, i + per).forEach(s => {
      b.set(doc(collection(db, BIN)), binEntry(db, s, extra));
      b.delete(s.ref);
    });
    await b.commit();
  }
  return list.length;
}

/**
 * "Purana hatao + naya likho" ko ATOOT (atomic) banata hai.
 * Ya to sab hoga, ya kuch bhi nahi — beech me fail hua to purana data salamat.
 *   oldSnaps : purane docs (getDocs ka result ya array)
 *   newDocs  : [{ collection:"jaiza_forms", id?:"...", data:{...} }]
 */
export async function replaceDocs(db, oldSnaps, newDocs, extra = {}) {
  const old = Array.isArray(oldSnaps) ? oldSnaps : oldSnaps.docs;
  if (old.length * 2 + newDocs.length > 499)
    throw new Error("Ek saath bohat zyada records (" + (old.length + newDocs.length) + "). Batch limit.");
  const b = writeBatch(db);
  old.forEach(s => { b.set(doc(collection(db, BIN)), binEntry(db, s, { reason: "replaced", ...extra })); b.delete(s.ref); });
  newDocs.forEach(n => {
    const ref = n.id ? doc(db, n.collection, n.id) : doc(collection(db, n.collection));
    b.set(ref, n.data);
  });
  await b.commit();
}

/** Bin ke items (naye pehle). */
export async function listBin(db, max = 200) {
  const s = await getDocs(query(collection(db, BIN), orderBy("deletedAt", "desc"), limit(max)));
  return s.docs.map(d => ({ binId: d.id, ...d.data() }));
}

/** Wapas wahin restore jahan se delete hua tha. */
export async function restoreFromBin(db, binId, { overwrite = false } = {}) {
  const binRef = doc(db, BIN, binId);
  const bs = await getDoc(binRef);
  if (!bs.exists()) throw new Error("Bin item nahi mila");
  const e = bs.data();
  const target = doc(db, e.srcCollection, e.srcId);
  if (!overwrite && (await getDoc(target)).exists()) throw new Error("EXISTS");
  const b = writeBatch(db);
  b.set(target, e.data);
  b.update(binRef, { restored: true, restoredAt: serverTimestamp() });
  await b.commit();
}

/** Bin se hamesha ke liye hatao (sirf admin). */
export async function purgeBinItem(db, binId) {
  const b = writeBatch(db);
  b.delete(doc(db, BIN, binId));
  await b.commit();
}
