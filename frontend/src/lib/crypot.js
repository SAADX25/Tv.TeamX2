function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function generateKeyPair() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const rawPub = await crypto.subtle.exportKey("raw", publicKey);
  return { publicKey: bufToBase64(rawPub), privateKey };
}

export async function deriveAesKey(privateKey, peerPubB64) {
  const peerPub = await crypto.subtle.importKey(
    "raw",
    base64ToBuf(peerPubB64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPub },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(key, text) {
  const enc = new TextEncoder().encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  return { iv: bufToBase64(iv), data: bufToBase64(cipher) };
}

export async function decryptMessage(key, payload) {
  const { iv, data } = payload;
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuf(iv) },
    key,
    base64ToBuf(data)
  );
  return new TextDecoder().decode(plain);
}