/* ============================================================================
   GameKit — public component surface.
   Import anything from "@/components".
   ========================================================================== */

// foundation
export { Icon } from "./Icon";
export type { IconName, IconProps } from "./Icon";

// actions
export { Button } from "./Button/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button/Button";
export { ButtonGroup, SplitButton } from "./Button/ButtonGroup";
export type { SegmentedItem } from "./Button/ButtonGroup";

// data display
export { Badge } from "./Badge/Badge";
export type { BadgeProps, BadgeTone } from "./Badge/Badge";
export { Avatar, AvatarGroup } from "./Avatar/Avatar";
export type { AvatarProps, AvatarGroupProps, PresenceStatus } from "./Avatar/Avatar";
export { Card, CardHeader, CardBody, CardFooter } from "./Card/Card";
export type { CardProps } from "./Card/Card";
export { Tooltip } from "./Tooltip/Tooltip";
export { Table } from "./DataDisplay/Table";
export type { Column, TableProps } from "./DataDisplay/Table";
export { StatCard } from "./DataDisplay/StatCard";
export type { StatCardProps } from "./DataDisplay/StatCard";

// form controls
export { Field } from "./Form/Field";
export type { FieldProps, FieldStatus } from "./Form/Field";
export {
  Input,
  PasswordInput,
  Textarea,
  Select,
} from "./Form/Input";
export type { InputProps, TextareaProps, SelectProps } from "./Form/Input";
export { Checkbox, Radio, RadioGroup, Switch } from "./Form/Choice";
export type { RadioGroupProps, SwitchProps } from "./Form/Choice";
export { Slider, RangeSlider } from "./Form/Slider";
export type { SliderProps, RangeSliderProps } from "./Form/Slider";
export { NumberInput } from "./Form/NumberInput";
export type { NumberInputProps } from "./Form/NumberInput";
export { FileUpload } from "./Form/FileUpload";
export type { FileUploadProps } from "./Form/FileUpload";
export { ColorPicker } from "./Form/ColorPicker";
export type { ColorPickerProps } from "./Form/ColorPicker";

// feedback
export { ProgressBar, CircularProgress } from "./Feedback/Progress";
export type { ProgressBarProps, CircularProgressProps } from "./Feedback/Progress";
export { Spinner, Skeleton, SkeletonText } from "./Feedback/Loaders";
export { Alert } from "./Feedback/Alert";
export type { AlertProps, AlertTone } from "./Feedback/Alert";
export { ToastProvider, useToast } from "./Feedback/Toast";
export type { ToastOptions, ToastTone } from "./Feedback/Toast";
export { Modal } from "./Feedback/Modal";
export type { ModalProps } from "./Feedback/Modal";

// navigation
export { Navbar } from "./Navigation/Navbar";
export type { NavbarProps } from "./Navigation/Navbar";
export { Sidebar } from "./Navigation/Sidebar";
export type { SidebarProps, SidebarItem } from "./Navigation/Sidebar";
export { Breadcrumb } from "./Navigation/Breadcrumb";
export type { Crumb } from "./Navigation/Breadcrumb";
export { Tabs } from "./Navigation/Tabs";
export type { TabsProps, TabItem } from "./Navigation/Tabs";
export { Pagination } from "./Navigation/Pagination";
export type { PaginationProps } from "./Navigation/Pagination";
export { Stepper } from "./Navigation/Stepper";
export type { StepperProps, Step } from "./Navigation/Stepper";
export { DropdownMenu } from "./Navigation/Menu";
export type { DropdownMenuProps, MenuItem, MenuSection } from "./Navigation/Menu";

// content & media
export { Timeline } from "./Content/Timeline";
export type { TimelineEntry, TimelineStatus } from "./Content/Timeline";
export { ChatBubble, ChatThread } from "./Content/ChatBubble";
export type { ChatMessage } from "./Content/ChatBubble";
export { Carousel } from "./Content/Carousel";
export type { CarouselSlide } from "./Content/Carousel";

// layout & utility
export { TreeView } from "./Layout/TreeView";
export type { TreeViewProps, TreeNode } from "./Layout/TreeView";
export { Calendar } from "./Layout/Calendar";
export type { CalendarProps } from "./Layout/Calendar";
export { EmptyState } from "./Layout/EmptyState";
export type { EmptyStateProps } from "./Layout/EmptyState";
export { CommandPalette } from "./Layout/CommandPalette";
export type { CommandPaletteProps, Command } from "./Layout/CommandPalette";
export { ScrollArea } from "./Layout/ScrollArea";
export type { ScrollAreaProps } from "./Layout/ScrollArea";

// game-specific
export { HudBar, HudPanel } from "./Game/HudBar";
export type { HudBarProps, HudResource } from "./Game/HudBar";
export { Leaderboard } from "./Game/Leaderboard";
export type { LeaderboardEntry } from "./Game/Leaderboard";
