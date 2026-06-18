"use client";

import { useState } from "react";
import {
  Button,
  Calendar,
  CommandPalette,
  EmptyState,
  HudPanel,
  Icon,
  Leaderboard,
  ScrollArea,
  TreeView,
} from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

export function LayoutDemo() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <Section number={7} title="Layout & Utility">
      <div className={styles.grid3}>
        <Tile label="Tree View">
          <TreeView
            defaultExpanded={["world", "north"]}
            defaultSelected="dungeon"
            nodes={[
              {
                id: "world",
                label: "World",
                icon: "map",
                children: [
                  {
                    id: "north",
                    label: "Northern Realm",
                    children: [
                      { id: "dungeon", label: "Frost Dungeon" },
                      { id: "village", label: "Snowpine Village" },
                    ],
                  },
                  { id: "south", label: "Southern Desert" },
                ],
              },
              { id: "assets", label: "Assets", icon: "folder" },
            ]}
          />
        </Tile>

        <Tile label="Calendar Widget" stack={false}>
          <Calendar
            defaultDate={new Date(2025, 4, 24)}
            events={["2025-05-10", "2025-05-24", "2025-05-28"]}
          />
        </Tile>

        <Tile label="Leaderboard Widget">
          <Leaderboard
            entries={[
              { rank: 1, name: "Aria Vale", score: "12,840" },
              { rank: 2, name: "Kael Sun", score: "11,290" },
              { rank: 3, name: "Mira Dawn", score: "10,560" },
              { rank: 8, name: "You", score: "6,120", you: true },
            ]}
          />
        </Tile>

        <Tile label="Command Palette">
          <Button
            variant="secondary"
            fullWidth
            leadingIcon={<Icon name="command" size={16} />}
            onClick={() => setPaletteOpen(true)}
          >
            Open command palette
          </Button>
        </Tile>

        <Tile label="Empty State">
          <EmptyState
            icon="inventory"
            title="No items found"
            description="Your inventory is empty. Complete quests to earn loot."
            action={<Button size="sm">Browse Quests</Button>}
          />
        </Tile>

        <Tile label="Scroll Area">
          <ScrollArea maxHeight={150}>
            <div className={styles.col}>
              {Array.from({ length: 10 }).map((_, i) => (
                <p key={i} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  Log entry #{i + 1}: Player moved to sector {i + 1}.
                </p>
              ))}
            </div>
          </ScrollArea>
        </Tile>

        <Tile label="HUD-style Status" span2>
          <HudPanel
            title="The Lost Relic"
            level={28}
            bars={[
              { resource: "health", value: 320, max: 400, label: "Health" },
              { resource: "stamina", value: 75, max: 100, label: "Stamina" },
              { resource: "mana", value: 180, max: 240, label: "Mana" },
              { resource: "xp", value: 640, max: 1000, label: "XP" },
            ]}
          />
        </Tile>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={[
          { id: "new", label: "Create new project", hint: "Start from scratch", icon: "plus", shortcut: "⌘N" },
          { id: "open", label: "Open scene", hint: "Browse recent", icon: "folder", shortcut: "⌘O" },
          { id: "build", label: "Build & run", hint: "Compile the game", icon: "play", shortcut: "⌘B" },
          { id: "settings", label: "Open settings", icon: "settings", shortcut: "⌘," },
          { id: "deploy", label: "Deploy to cloud", hint: "Publish build", icon: "upload" },
        ]}
      />
    </Section>
  );
}
