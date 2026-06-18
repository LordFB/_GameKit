"use client";

import { Carousel, ChatThread, Timeline } from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

export function MediaDemo() {
  return (
    <Section number={6} title="Media & Content">
      <div className={styles.grid3}>
        <Tile label="Image Carousel" span2>
          <Carousel
            slides={[
              {
                id: "1",
                background:
                  "linear-gradient(135deg, #1e3a8a, #6366f1, #a855f7)",
                title: "Dragon's Lair",
                caption: "A legendary boss arena",
              },
              {
                id: "2",
                background:
                  "linear-gradient(135deg, #064e3b, #10b981, #84cc16)",
                title: "Verdant Vale",
                caption: "Lush starting zone",
              },
              {
                id: "3",
                background:
                  "linear-gradient(135deg, #7c2d12, #ea580c, #f59e0b)",
                title: "Ember Wastes",
                caption: "Volcanic endgame region",
              },
            ]}
          />
        </Tile>

        <Tile label="Chat / Messages">
          <ChatThread
            messages={[
              {
                author: "Kael",
                content: "Ready for the raid tonight?",
                timestamp: "5:42 PM",
              },
              {
                content: "Absolutely! Let's do this 🔥",
                timestamp: "5:43 PM",
                side: "right",
              },
              {
                author: "Kael",
                content: "Meet at the north gate in 10.",
                timestamp: "5:44 PM",
              },
            ]}
          />
        </Tile>

        <Tile label="Timeline" span2>
          <Timeline
            entries={[
              {
                title: "Quest Started",
                meta: "2 days ago",
                description: "Accepted 'The Lost Relic' from the Elder.",
                status: "complete",
              },
              {
                title: "Objective Complete",
                meta: "Yesterday",
                description: "Found the hidden cave entrance.",
                status: "complete",
              },
              {
                title: "Boss Encounter",
                meta: "In progress",
                description: "Defeat the Stone Guardian.",
                status: "active",
              },
              {
                title: "Claim Reward",
                meta: "Locked",
                status: "pending",
              },
            ]}
          />
        </Tile>
      </div>
    </Section>
  );
}
