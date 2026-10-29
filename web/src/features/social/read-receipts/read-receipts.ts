import type { ChatTimelineData } from '../messaging/timeline/chat-entry';

/** Reading only moves forward, so a later receipt never moves the mark back. */
export function withPeerRead(history: ChatTimelineData, seq: string): ChatTimelineData {
  const peerReadSeq = history.meta?.peerReadSeq;
  const isFurther = peerReadSeq != null && BigInt(seq) > BigInt(peerReadSeq);
  if (!history.meta || !isFurther) return history;

  return { ...history, meta: { ...history.meta, peerReadSeq: seq } };
}

export function isReadByPeer(seq: string, peerReadSeq: string | null): boolean {
  return peerReadSeq !== null && BigInt(seq) <= BigInt(peerReadSeq);
}
