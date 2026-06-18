import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Avatar } from "../Avatar/Avatar";
import styles from "./ChatBubble.module.css";

export interface ChatMessage {
  author?: string;
  avatar?: string;
  content: ReactNode;
  timestamp?: string;
  side?: "left" | "right";
}

/** Chat message bubble (board: Chat / Message bubble). Right side = own message. */
export function ChatBubble({
  author,
  avatar,
  content,
  timestamp,
  side = "left",
}: ChatMessage) {
  const own = side === "right";
  return (
    <div className={cx(styles.row, own && styles.own)}>
      {!own && <Avatar src={avatar} name={author} size="sm" />}
      <div className={styles.stack}>
        {(author || timestamp) && !own && (
          <div className={styles.meta}>
            {author && <span className={styles.author}>{author}</span>}
            {timestamp && <span className={styles.time}>{timestamp}</span>}
          </div>
        )}
        <div className={cx(styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther)}>
          {content}
        </div>
        {own && timestamp && (
          <span className={cx(styles.time, styles.timeOwn)}>{timestamp}</span>
        )}
      </div>
    </div>
  );
}

/** Thread container for a list of chat bubbles. */
export function ChatThread({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className={styles.thread}>
      {messages.map((m, i) => (
        <ChatBubble key={i} {...m} />
      ))}
    </div>
  );
}
