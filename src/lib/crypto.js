export async function verifyPassword(password, encoded) {
  if (!encoded || !password) return false;
  try {
    const [salt, expectedDigestHex] = encoded.split('$');
    if (!salt || !expectedDigestHex) return false;
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 120000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const derivedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return derivedHex.toLowerCase() === expectedDigestHex.toLowerCase();
  } catch (err) {
    console.error('Password verify error:', err);
    return false;
  }
}

export async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const digestHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${salt}$${digestHex}`;
}
