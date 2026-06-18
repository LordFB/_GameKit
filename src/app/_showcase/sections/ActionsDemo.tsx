"use client";

import {
  Button,
  ButtonGroup,
  Icon,
  SplitButton,
  Tooltip,
} from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

export function ActionsDemo() {
  return (
    <Section number={2} title="Actions">
      <div className={styles.grid3}>
        <Tile label="Primary / Secondary">
          <div className={styles.row}>
            <Button leadingIcon={<Icon name="play" size={16} />}>Play Now</Button>
            <Button variant="secondary">Learn More</Button>
          </div>
        </Tile>

        <Tile label="Button Group (segmented)">
          <ButtonGroup
            defaultValue="middle"
            items={[
              { value: "left", label: "Left" },
              { value: "middle", label: "Middle" },
              { value: "right", label: "Right" },
            ]}
          />
        </Tile>

        <Tile label="Sizes">
          <div className={styles.row}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Tile>

        <Tile label="Ghost / Icon / Split / FAB" span2>
          <div className={styles.row}>
            <Button variant="ghost">View Details</Button>
            <Tooltip content="Favorite">
              <Button variant="secondary" iconOnly aria-label="Favorite">
                <Icon name="heart" size={18} />
              </Button>
            </Tooltip>
            <SplitButton onClick={() => {}} onMenu={() => {}}>
              <Icon name="save" size={16} /> Save
            </SplitButton>
            <Button fab aria-label="Create">
              <Icon name="plus" size={22} />
            </Button>
          </div>
        </Tile>

        <Tile label="Intents">
          <div className={styles.row}>
            <Button variant="success" leadingIcon={<Icon name="check" size={16} />}>
              Confirm
            </Button>
            <Button variant="warning">Caution</Button>
          </div>
        </Tile>

        <Tile label="States" span2>
          <div className={styles.row}>
            <Button>Default</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button variant="successSoft" leadingIcon={<Icon name="check" size={16} />}>
              Done
            </Button>
            <Button variant="danger" leadingIcon={<Icon name="trash" size={16} />}>
              Delete
            </Button>
          </div>
        </Tile>
      </div>
    </Section>
  );
}
