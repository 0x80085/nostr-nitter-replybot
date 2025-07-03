import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils'; // already an installed dependency

const sk = generateSecretKey(); // `sk` is a Uint8Array
const pk = getPublicKey(sk); // `pk` is a hex string

console.log(`
    Secret = [${bytesToHex(sk)}]
    Public = [${pk}]
    `);
