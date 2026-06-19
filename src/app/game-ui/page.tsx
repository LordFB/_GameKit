"use client";

import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  ChatThread,
  CircularProgress,
  DropdownMenu,
  HudPanel,
  Icon,
  Input,
  Leaderboard,
  ProgressBar,
  ScrollArea,
  Select,
  Slider,
  StatCard,
  Switch,
  Tabs,
  Tooltip,
} from "@/components";
import { ThemeToggle } from "../_showcase/ThemeToggle";
import styles from "./page.module.css";

const inventoryItems = [
  { name: "Rune Blade", tone: "primary", selected: true },
  { name: "Ward Shell", tone: "success", selected: false },
  { name: "Ember Vial", tone: "warning", selected: false },
  { name: "Night Key", tone: "danger", selected: false },
  { name: "Field Kit", tone: "neutral", selected: false },
  { name: "Echo Map", tone: "info", selected: false },
] as const;

const party = [
  { name: "Aria Vale", role: "Vanguard", hp: 82, mana: 44, status: "online" },
  { name: "Kael Sun", role: "Marksman", hp: 68, mana: 71, status: "away" },
  { name: "Mira Dawn", role: "Cipher", hp: 91, mana: 88, status: "online" },
] as const;

const questSteps = [
  { label: "Secure the outer gate", done: true },
  { label: "Restore beacon relay", done: true },
  { label: "Escort convoy to Spire 7", done: false },
  { label: "Hold extraction zone", done: false },
];

export default function GameUiDemoPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <a href="/" className={styles.brand} aria-label="Back to component showcase">
            <span className={styles.brandIcon}>
              <Icon name="gamepad" size={20} />
            </span>
            <span>
              <span className={styles.brandName}>GAME KIT</span>
              <span className={styles.brandMeta}>Operation Emberfall</span>
            </span>
          </a>

          <nav className={styles.nav} aria-label="Game interface sections">
            {["Play", "Loadout", "Quests", "Social"].map((item, index) => (
              <a
                key={item}
                href="#"
                className={styles.navItem}
                data-state={index === 0 ? "selected" : undefined}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className={styles.topActions}>
            <Tooltip content="Notifications">
              <Button variant="subtle" iconOnly aria-label="Notifications">
                <Icon name="bell" size={17} />
              </Button>
            </Tooltip>
            <DropdownMenu
              align="end"
              trigger={
                <Button variant="secondary" trailingIcon={<Icon name="chevronDown" size={15} />}>
                  Squad
                </Button>
              }
              sections={[
                {
                  label: "Session",
                  items: [
                    { label: "Invite player", icon: <Icon name="plus" size={15} /> },
                    { label: "Open settings", icon: <Icon name="settings" size={15} /> },
                  ],
                },
                {
                  items: [
                    {
                      label: "Leave fireteam",
                      icon: <Icon name="logout" size={15} />,
                      tone: "danger",
                    },
                  ],
                },
              ]}
            />
            <ThemeToggle />
          </div>
        </header>

        <section className={styles.statusStrip} aria-label="Player status">
          <HudPanel
            title="Aria Vale"
            level={42}
            bars={[
              { resource: "health", value: 318, max: 400, label: "Health" },
              { resource: "stamina", value: 76, max: 100, label: "Stamina" },
              { resource: "mana", value: 142, max: 180, label: "Focus" },
              { resource: "xp", value: 790, max: 1000, label: "Renown" },
            ]}
          />
          <StatCard
            label="Squad Power"
            value="8,420"
            tone="primary"
            icon={<Icon name="sparkles" size={18} />}
            trend={7}
            trendLabel="loadout"
          />
          <StatCard
            label="Extraction"
            value="12:48"
            tone="warning"
            icon={<Icon name="flag" size={18} />}
            trend={-2}
            trendLabel="window"
          />
          <div className={styles.matchmaking}>
            <div className={styles.matchHead}>
              <span>Fireteam</span>
              <Badge tone="success" dot>
                Ready
              </Badge>
            </div>
            <AvatarGroup
              max={4}
              avatars={[
                { name: "Aria Vale", status: "online" },
                { name: "Kael Sun", status: "away" },
                { name: "Mira Dawn", status: "online" },
                { name: "Tov Rook" },
              ]}
            />
          </div>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.sidebar} aria-label="Game controls">
            {[
              { icon: "dashboard", label: "Command", active: true, badge: "Live" },
              { icon: "map", label: "World Map" },
              { icon: "inventory", label: "Inventory", badge: "14" },
              { icon: "characters", label: "Roster" },
              { icon: "leaderboard", label: "Rankings" },
              { icon: "settings", label: "Options" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className={styles.sideItem}
                data-state={item.active ? "selected" : undefined}
              >
                <Icon name={item.icon as "dashboard"} size={18} />
                <span>{item.label}</span>
                {item.badge && <Badge size="sm">{item.badge}</Badge>}
              </button>
            ))}
          </aside>

          <section className={styles.stage} aria-label="Mission screen">
            <div className={styles.stageHeader}>
              <div>
                <Badge tone="warning" variant="solid">
                  Heroic
                </Badge>
                <h1>Crimson Relay</h1>
                <p>Arcology ruins, nightfall cycle</p>
              </div>
              <div className={styles.stageActions}>
                <Button variant="secondary" leadingIcon={<Icon name="save" size={16} />}>
                  Save
                </Button>
                <Button leadingIcon={<Icon name="play" size={16} />}>Launch</Button>
              </div>
            </div>

            <div className={styles.viewport}>
              <div className={styles.hudTopLeft}>
                <Badge tone="info" dot>
                  Sector 12
                </Badge>
                <Badge tone="danger" variant="outline">
                  Storm incoming
                </Badge>
              </div>
              <div className={styles.minimap} aria-label="Minimap">
                <span className={styles.mapPulse} />
                <span className={styles.mapPath} />
                <span className={styles.mapNodeOne} />
                <span className={styles.mapNodeTwo} />
                <span className={styles.mapNodeThree} />
              </div>
              <div className={styles.world}>
                <span className={styles.gridLineA} />
                <span className={styles.gridLineB} />
                <span className={styles.towerOne} />
                <span className={styles.towerTwo} />
                <span className={styles.beacon} />
                <span className={styles.playerMarker}>
                  <Icon name="shield" size={18} />
                </span>
                <span className={styles.enemyMarker}>
                  <Icon name="warning" size={15} />
                </span>
                <span className={styles.objectiveMarker}>
                  <Icon name="flag" size={15} />
                </span>
              </div>
              <div className={styles.abilityBar} aria-label="Ability slots">
                {[
                  ["1", "shield"],
                  ["2", "sparkles"],
                  ["3", "heart"],
                  ["4", "flag"],
                  ["Q", "box"],
                ].map(([key, icon], index) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.ability}
                    data-state={index === 1 ? "selected" : undefined}
                  >
                    <Icon name={icon as "shield"} size={18} />
                    <span>{key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.lowerDeck}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span>Mission Progress</span>
                  <Badge tone="primary">Phase 3</Badge>
                </div>
                <ProgressBar value={64} tone="primary" striped showLabel />
                <ul className={styles.questList}>
                  {questSteps.map((step) => (
                    <li key={step.label} data-state={step.done ? "selected" : undefined}>
                      <Icon name={step.done ? "check" : "chevronRight"} size={15} />
                      <span>{step.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span>Loadout</span>
                  <Badge tone="warning">Legendary</Badge>
                </div>
                <div className={styles.inventoryGrid}>
                  {inventoryItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={styles.inventorySlot}
                      data-state={item.selected ? "selected" : undefined}
                    >
                      <span className={styles[`loot_${item.tone}`]} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <aside className={styles.commandPanel} aria-label="Mission details">
            <Tabs
              variant="pill"
              defaultValue="squad"
              items={[
                { value: "squad", label: "Squad" },
                { value: "map", label: "Map" },
                { value: "comms", label: "Comms" },
              ]}
            >
              {(active) => (
                <div className={styles.tabPanel}>
                  {active === "squad" && (
                    <div className={styles.partyList}>
                      {party.map((member) => (
                        <div key={member.name} className={styles.partyRow}>
                          <Avatar
                            name={member.name}
                            size="sm"
                            status={member.status as "online"}
                          />
                          <div>
                            <strong>{member.name}</strong>
                            <span>{member.role}</span>
                          </div>
                          <CircularProgress value={member.hp} size={46} tone="success" />
                        </div>
                      ))}
                    </div>
                  )}

                  {active === "map" && (
                    <div className={styles.controlStack}>
                      <label>
                        Encounter density
                        <Slider defaultValue={68} showValue aria-label="Encounter density" />
                      </label>
                      <label>
                        Region layer
                        <Select
                          aria-label="Region layer"
                          defaultValue="threat"
                          options={[
                            { value: "threat", label: "Threat" },
                            { value: "loot", label: "Loot" },
                            { value: "squad", label: "Squad" },
                          ]}
                        />
                      </label>
                      <Switch defaultChecked label="Show squad pings" />
                      <Switch defaultChecked label="Track rare spawns" />
                    </div>
                  )}

                  {active === "comms" && (
                    <div className={styles.comms}>
                      <ScrollArea maxHeight={228}>
                        <ChatThread
                          messages={[
                            {
                              author: "Mira",
                              timestamp: "21:04",
                              content: "Relay heat is rising. We have two minutes.",
                            },
                            {
                              author: "Kael",
                              timestamp: "21:05",
                              content: "Taking high ground above the east bridge.",
                            },
                            {
                              side: "right",
                              timestamp: "21:05",
                              content: "Hold there. I am moving the convoy now.",
                            },
                          ]}
                        />
                      </ScrollArea>
                      <Input
                        aria-label="Squad message"
                        placeholder="Send squad message"
                        leadingIcon={<Icon name="send" size={15} />}
                      />
                    </div>
                  )}
                </div>
              )}
            </Tabs>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span>Leaderboard</span>
                <Badge tone="info">Weekly</Badge>
              </div>
              <Leaderboard
                entries={[
                  { rank: 1, name: "Aria Vale", score: "12,840", you: true },
                  { rank: 2, name: "Kael Sun", score: "11,290" },
                  { rank: 3, name: "Mira Dawn", score: "10,560" },
                  { rank: 8, name: "Tov Rook", score: "6,120" },
                ]}
              />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
