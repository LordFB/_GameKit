"use client";

import { useState } from "react";
import {
  Checkbox,
  ColorPicker,
  Field,
  FileUpload,
  Icon,
  Input,
  NumberInput,
  PasswordInput,
  RadioGroup,
  RangeSlider,
  Select,
  Slider,
  Switch,
  Textarea,
} from "@/components";
import { Section, Tile } from "../Shell";
import styles from "../../showcase.module.css";

export function FormDemo() {
  const [agree, setAgree] = useState(true);

  return (
    <Section number={3} title="Form Controls">
      <div className={styles.grid3}>
        <Tile label="Text Input">
          <Field label="Display name" htmlFor="f-name" hint="Visible to other players">
            <Input id="f-name" placeholder="Enter your name" />
          </Field>
        </Tile>

        <Tile label="Password Field">
          <Field label="Password" htmlFor="f-pw">
            <PasswordInput id="f-pw" defaultValue="secret-pass" />
          </Field>
        </Tile>

        <Tile label="Textarea">
          <Field label="Message" htmlFor="f-msg">
            <Textarea id="f-msg" placeholder="Your message here…" rows={3} />
          </Field>
        </Tile>

        <Tile label="Select Dropdown">
          <Field label="Class" htmlFor="f-class">
            <Select
              id="f-class"
              placeholder="Choose a class"
              options={[
                { value: "warrior", label: "Warrior" },
                { value: "mage", label: "Mage" },
                { value: "rogue", label: "Rogue" },
                { value: "cleric", label: "Cleric" },
              ]}
            />
          </Field>
        </Tile>

        <Tile label="Radio / Checkbox">
          <RadioGroup
            name="gender"
            defaultValue="female"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <Checkbox
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            label="I agree to the terms"
          />
        </Tile>

        <Tile label="Toggle Switch">
          <Switch defaultChecked label="Enable notifications" />
          <Switch label="Dark mode" />
          <Switch disabled label="Locked setting" />
        </Tile>

        <Tile label="Slider">
          <Slider defaultValue={70} showValue aria-label="Volume" />
        </Tile>

        <Tile label="Range Slider">
          <RangeSlider defaultValue={[20, 80]} />
        </Tile>

        <Tile label="Number Input">
          <NumberInput defaultValue={42} min={0} max={99} aria-label="Quantity" />
        </Tile>

        <Tile label="Color Picker">
          <ColorPicker defaultValue="#6366F1" />
        </Tile>

        <Tile label="Validation States">
          <Field label="Email" status="valid" message="Looks good!">
            <Input defaultValue="player@gamekit.dev" status="valid" />
          </Field>
          <Field label="Username" status="invalid" message="Already taken">
            <Input defaultValue="admin" status="invalid" />
          </Field>
        </Tile>

        <Tile label="File Upload" span2>
          <FileUpload />
        </Tile>

        <Tile label="Disabled & Icon Inputs">
          <Input placeholder="Disabled input" disabled />
          <Input
            placeholder="Search…"
            leadingIcon={<Icon name="search" size={16} />}
          />
        </Tile>
      </div>
    </Section>
  );
}
