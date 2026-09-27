"use client";

import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { tooltip: ReactNode };

export function ChartTooltipButton({
  children,
  tooltip,
  className = "",
  onClick,
  onKeyDown,
  ...props
}: Props) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = !dismissed && (hovered || focused || pinned);
  return (
    <button
      {...props}
      type="button"
      data-feedback="off"
      className={"chart-tooltip-trigger " + className}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={() => {
        setFocused(false);
        setPinned(false);
      }}
      onClick={(event) => {
        setPinned((value) => !value);
        setDismissed(false);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setDismissed(true);
          setPinned(false);
        }
        onKeyDown?.(event);
      }}
    >
      {children}
      <span className="chart-tooltip" role="tooltip" id={id} hidden={!open}>
        {tooltip}
      </span>
    </button>
  );
}
