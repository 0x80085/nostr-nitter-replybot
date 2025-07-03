import { nip19 } from 'nostr-tools';
import 'dotenv/config';

const hexPubkey = process.env.NOSTR_BOT_PUBLIC_KEY!;
const npub = nip19.npubEncode(hexPubkey);

console.log(npub);
