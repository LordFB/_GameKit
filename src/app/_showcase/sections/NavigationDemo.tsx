"use client";

import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  DropdownMenu,
  Icon,
  Navbar,
  Pagination,
  Sidebar,
  Stepper,
  Tabs,
} from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

export function NavigationDemo() {
  return (
    <Section number={1} title="Navigation">
      <div className={styles.col}>
        <Navbar
          links={[
            { label: "Dashboard", active: true },
            { label: "Quests" },
            { label: "Inventory" },
            { label: "Leaderboard" },
          ]}
          actions={
            <>
              <Button variant="secondary" iconOnly aria-label="Search">
                <Icon name="search" size={18} />
              </Button>
              <Button variant="secondary" iconOnly aria-label="Notifications">
                <Icon name="bell" size={18} />
              </Button>
              <DropdownMenu
                align="end"
                trigger={<Avatar name="Aria Vale" status="online" />}
                sections={[
                  {
                    label: "Aria Vale",
                    items: [
                      { label: "Profile", icon: <Icon name="user" size={16} /> },
                      { label: "Settings", icon: <Icon name="settings" size={16} />, shortcut: "⌘," },
                    ],
                  },
                  {
                    items: [
                      { label: "Log out", icon: <Icon name="logout" size={16} />, tone: "danger" },
                    ],
                  },
                ]}
              />
            </>
          }
        />

        <div className={styles.grid2}>
          <Tile label="Sidebar" stack={false}>
            <Sidebar
              defaultValue="quests"
              items={[
                { label: "Dashboard", icon: "dashboard", value: "dashboard" },
                { label: "Quests", icon: "quests", value: "quests", badge: 3 },
                { label: "Inventory", icon: "inventory", value: "inventory" },
                { label: "Characters", icon: "characters", value: "characters" },
                { label: "Map", icon: "map", value: "map" },
                { label: "Settings", icon: "settings", value: "settings" },
              ]}
            />
          </Tile>

          <div className={styles.col}>
            <Tile label="Breadcrumb">
              <Breadcrumb
                items={[
                  { label: "Home", href: "#" },
                  { label: "Quests", href: "#" },
                  { label: "Main Story", href: "#" },
                  { label: "The Lost Relic" },
                ]}
              />
            </Tile>

            <Tile label="Tabs">
              <Tabs
                variant="underline"
                items={[
                  { value: "overview", label: "Overview" },
                  { value: "stats", label: "Stats" },
                  { value: "achievements", label: "Achievements", badge: 12 },
                  { value: "settings", label: "Settings", disabled: true },
                ]}
              />
            </Tile>

            <Tile label="Pagination">
              <Pagination total={10} defaultPage={4} />
            </Tile>
          </div>
        </div>

        <Tile label="Stepper">
          <Stepper
            current={2}
            steps={[
              { label: "Create", description: "New project" },
              { label: "Details", description: "Add metadata" },
              { label: "Review", description: "Check assets" },
              { label: "Complete", description: "Publish" },
            ]}
          />
        </Tile>

        <Tile label="Dropdown Menu" stack={false}>
          <DropdownMenu
            trigger={
              <Button variant="secondary" trailingIcon={<Icon name="chevronDown" size={16} />}>
                Menu
              </Button>
            }
            sections={[
              {
                label: "Account",
                items: [
                  { label: "Profile", icon: <Icon name="user" size={16} /> },
                  { label: "Appearance", icon: <Icon name="sun" size={16} /> },
                  { label: "Notifications", icon: <Icon name="bell" size={16} /> },
                ],
              },
              {
                items: [
                  { label: "Log out", icon: <Icon name="logout" size={16} />, tone: "danger" },
                ],
              },
            ]}
          />
          <Badge tone="primary" dot>
            New
          </Badge>
        </Tile>
      </div>
    </Section>
  );
}
