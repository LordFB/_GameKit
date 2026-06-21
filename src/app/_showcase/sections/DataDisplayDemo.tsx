"use client";

import {
  Avatar,
  AvatarGroup,
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Button,
  Icon,
  StatCard,
  Table,
  Tooltip,
  type Column,
} from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

interface Player {
  id: string;
  rank: number;
  name: string;
  level: number;
  score: number;
  status: "online" | "away" | "offline";
}

const players: Player[] = [
  { id: "1", rank: 1, name: "Aria Vale", level: 87, score: 12840, status: "online" },
  { id: "2", rank: 2, name: "Kael Sun", level: 81, score: 11290, status: "away" },
  { id: "3", rank: 3, name: "Mira Dawn", level: 79, score: 10560, status: "online" },
  { id: "4", rank: 4, name: "Tov Rook", level: 74, score: 9870, status: "offline" },
];

const columns: Column<Player>[] = [
  { key: "rank", header: "#", width: "48px", sortable: true, sortValue: (r) => r.rank },
  {
    key: "name",
    header: "Player",
    sortable: true,
    sortValue: (r) => r.name,
    cell: (r) => (
      <div className={styles.row}>
        <Avatar name={r.name} size="sm" status={r.status} />
        <strong>{r.name}</strong>
      </div>
    ),
  },
  { key: "level", header: "Level", align: "center", sortable: true, sortValue: (r) => r.level },
  {
    key: "score",
    header: "Score",
    align: "right",
    sortable: true,
    sortValue: (r) => r.score,
    // Pin the locale: bare toLocaleString() uses the host's locale, so the
    // server (Node) and client (browser) can pick different group separators
    // ("12,840" vs "12.840") and mismatch on hydration. A fixed locale renders
    // identically on every machine.
    cell: (r) => <strong>{r.score.toLocaleString("en-US")}</strong>,
  },
];

export function DataDisplayDemo() {
  return (
    <Section number={5} title="Data Display">
      <div className={styles.grid3}>
        <StatCard
          label="Achievements"
          value="7,890"
          icon={<Icon name="star" size={18} filled />}
          tone="warning"
          trend={12}
          trendLabel="this week"
        />
        <StatCard
          label="Gold Earned"
          value="15,340"
          icon={<Icon name="coin" size={18} />}
          tone="success"
          trend={8}
        />
        <StatCard
          label="Deaths"
          value="142"
          icon={<Icon name="shield" size={18} />}
          tone="danger"
          trend={-4}
          trendLabel="vs last run"
        />
      </div>

      <div className={styles.grid2} style={{ marginTop: "var(--space-4)" }}>
        <Tile label="Data Table (sortable)" span2>
          <Table columns={columns} data={players} rowKey={(r) => r.id} selectedKey="1" />
        </Tile>
      </div>

      <div className={styles.grid3} style={{ marginTop: "var(--space-4)" }}>
        <Tile label="Card">
          <Card padding="none" elevation="md" interactive>
            <div
              style={{
                height: 120,
                borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
                background:
                  "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)",
              }}
            />
            <div style={{ padding: "var(--space-5)" }}>
              <CardHeader
                title="Ancient Forest"
                subtitle="A mysterious woodland realm"
                action={<Badge tone="success">Open</Badge>}
              />
              <CardBody>
                Explore the dense canopy and uncover hidden relics guarded by
                forest spirits.
              </CardBody>
              <CardFooter>
                <Button size="sm" fullWidth>
                  Explore
                </Button>
              </CardFooter>
            </div>
          </Card>
        </Tile>

        <Tile label="Avatar Group / Presence">
          <AvatarGroup
            max={4}
            avatars={[
              { name: "Aria Vale", status: "online" },
              { name: "Kael Sun" },
              { name: "Mira Dawn", status: "away" },
              { name: "Tov Rook" },
              { name: "Player 5" },
              { name: "Player 6" },
            ]}
          />
          <div className={styles.row}>
            <Avatar name="Aria" status="online" />
            <Avatar name="Kael" status="busy" />
            <Avatar fallback="🐉" />
          </div>
        </Tile>

        <Tile label="Badges & Tooltip">
          <div className={styles.row}>
            <Badge tone="primary">Epic</Badge>
            <Badge tone="warning" variant="solid">Legendary</Badge>
            <Badge tone="info" icon={<Icon name="sparkles" size={12} />}>
              Rare
            </Badge>
          </div>
          <Tooltip content="Equipped to slot 1" side="top">
            <Button variant="secondary" size="sm">
              <Icon name="shield" size={15} /> Hover me
            </Button>
          </Tooltip>
        </Tile>
      </div>
    </Section>
  );
}
