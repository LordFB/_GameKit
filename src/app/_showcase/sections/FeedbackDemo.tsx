"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  CircularProgress,
  Icon,
  Modal,
  ProgressBar,
  Skeleton,
  SkeletonText,
  Spinner,
  useToast,
} from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

export function FeedbackDemo() {
  const { toast } = useToast();
  const [questOpen, setQuestOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <Section number={4} title="Feedback">
      <div className={styles.grid3}>
        <Tile label="Progress Bar">
          <ProgressBar value={66} showLabel />
          <ProgressBar value={40} tone="success" />
          <ProgressBar value={85} tone="warning" striped />
        </Tile>

        <Tile label="Circular Progress" stack={false}>
          <CircularProgress value={72} />
          <CircularProgress value={45} tone="success" />
        </Tile>

        <Tile label="Spinner / Skeleton">
          <div className={styles.row}>
            <Spinner />
            <Spinner tone="neutral" label="Loading…" />
          </div>
          <div className={styles.row} style={{ width: "100%" }}>
            <Skeleton circle width={40} height={40} />
            <div style={{ flex: 1 }}>
              <SkeletonText lines={2} />
            </div>
          </div>
        </Tile>

        <Tile label="Alert Banners" span2>
          <Alert tone="success" title="Saved!" dismissible>
            Your scene was uploaded successfully.
          </Alert>
          <Alert tone="warning" title="Heads up" dismissible>
            Your session will expire in 5 minutes.
          </Alert>
          <Alert
            tone="danger"
            title="Build failed"
            action={
              <Button size="sm" variant="danger">
                Retry
              </Button>
            }
          >
            The asset bundle could not be compiled.
          </Alert>
          <Alert tone="info" title="New quests available">
            3 new side quests are ready to accept.
          </Alert>
        </Tile>

        <Tile label="Toasts">
          <div className={styles.row}>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  tone: "success",
                  title: "Quest completed!",
                  description: "You earned 250 XP",
                })
              }
            >
              Success toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({ tone: "danger", title: "Connection lost" })
              }
            >
              Error toast
            </Button>
          </div>
        </Tile>

        <Tile label="Modal Dialogs" span2>
          <div className={styles.row}>
            <Button onClick={() => setQuestOpen(true)}>New Quest</Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              Confirmation
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete Item
            </Button>
          </div>
        </Tile>

        <Tile label="Status Badges">
          <div className={styles.row}>
            <Badge tone="info" dot>Info</Badge>
            <Badge tone="success" dot>Success</Badge>
            <Badge tone="warning" dot>Warning</Badge>
            <Badge tone="danger" dot>Danger</Badge>
            <Badge tone="primary" variant="solid">Active</Badge>
            <Badge tone="neutral" variant="outline">Draft</Badge>
          </div>
        </Tile>
      </div>

      {/* New Quest modal */}
      <Modal
        open={questOpen}
        onClose={() => setQuestOpen(false)}
        title="New Quest"
        description="Are you ready to start 'The Lost Relic'? You'll be teleported to the Northern Realm."
        footer={
          <>
            <Button variant="secondary" onClick={() => setQuestOpen(false)}>
              Cancel
            </Button>
            <Button
              leadingIcon={<Icon name="play" size={16} />}
              onClick={() => {
                setQuestOpen(false);
                toast({ tone: "success", title: "Quest started!" });
              }}
            >
              Start Quest
            </Button>
          </>
        }
      />

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save changes?"
        description="Your unsaved edits to this scene will be written to disk."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmOpen(false)}>Save</Button>
          </>
        }
      />

      {/* Destructive delete modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        tone="danger"
        title="Delete Item"
        description="This item will be permanently removed and cannot be recovered. Continue?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leadingIcon={<Icon name="trash" size={16} />}
              onClick={() => {
                setDeleteOpen(false);
                toast({ tone: "danger", title: "Item deleted" });
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </Section>
  );
}
