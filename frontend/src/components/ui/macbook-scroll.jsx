import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  IconBrightnessDown,
  IconBrightnessUp,
  IconCaretRightFilled,
  IconCaretUpFilled,
  IconChevronUp,
  IconMicrophone,
  IconMoon,
  IconPlayerSkipForward,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconTable,
  IconVolume,
  IconVolume2,
  IconVolume3,
  IconSearch,
  IconWorld,
  IconCommand,
  IconCaretLeftFilled,
  IconCaretDownFilled
} from "@tabler/icons-react";

export const MacbookScroll = ({
  src,
  showGradient = true,
  title,
  badge,
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (window && window.innerWidth < 768) {
      setIsMobile(true);
    }
  }, []);

  const scaleX = useTransform(
    scrollYProgress,
    [0, 0.3],
    [1.1, isMobile ? 1 : 1.3],
  );
  const scaleY = useTransform(
    scrollYProgress,
    [0, 0.3],
    [0.6, isMobile ? 1 : 1.3],
  );
  const translate = useTransform(scrollYProgress, [0, 1], [0, 1000]);
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  const textTransform = useTransform(scrollYProgress, [0, 0.3], [0, 80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div
      ref={ref}
      className="macbook-wrapper"
      style={{
        transform: isMobile ? "scale(0.5)" : "scale(1)",
        transformOrigin: "top center",
      }}
    >
      <motion.h2
        style={{
          translateY: textTransform,
          opacity: textOpacity,
        }}
        className="macbook-title"
      >
        {title || (
          <span>
            This Macbook is built with Tailwindcss. <br /> No kidding.
          </span>
        )}
      </motion.h2>
      {/* Lid */}
      <Lid
        src={src}
        scaleX={scaleX}
        scaleY={scaleY}
        rotate={rotate}
        translate={translate}
      />
      {/* Base area */}
      <div className="macbook-base">
        {/* above keyboard bar */}
        <div className="macbook-top-bar">
          <div className="macbook-top-bar-inset" />
        </div>
        <div className="macbook-keyboard-section">
          <SpeakerGrid />
          <Keypad />
          <SpeakerGrid />
        </div>
        <Trackpad />
        <div className="macbook-notch" />
        {badge && <div className="macbook-badge-container">{badge}</div>}
      </div>
    </div>
  );
};

export const Lid = ({
  scaleX,
  scaleY,
  rotate,
  translate,
  src,
}) => {
  return (
    <div className="macbook-lid-wrapper">
      <motion.div
        style={{
          scaleX: scaleX,
          scaleY: scaleY,
          rotateX: rotate,
          translateY: translate,
          transformStyle: "preserve-3d",
          transformOrigin: "top center",
        }}
        className="macbook-lid"
      >
        {/* Outer Back shell of the lid (placed behind the screen in Z-axis) */}
        <div className="macbook-lid-bg">
          <div className="macbook-logo-inset">
            <span>
              <AceternityLogo />
            </span>
          </div>
        </div>
        
        {/* Inner Screen (placed in front in Z-axis) */}
        <div className="macbook-screen">
          <div className="macbook-screen-bezel" />
          <img
            src={src}
            alt="Mockup Screen"
            className="macbook-screen-img"
          />
        </div>
      </motion.div>
    </div>
  );
};

export const Trackpad = () => {
  return <div className="macbook-trackpad"></div>;
};

export const Keypad = () => {
  return (
    <div className="macbook-keypad">
      {/* First Row */}
      <div className="macbook-keyboard-row">
        <KBtn className="w-10 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
          esc
        </KBtn>
        <KBtn>
          <IconBrightnessDown style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F1</span>
        </KBtn>
        <KBtn>
          <IconBrightnessUp style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F2</span>
        </KBtn>
        <KBtn>
          <IconTable style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F3</span>
        </KBtn>
        <KBtn>
          <IconSearch style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F4</span>
        </KBtn>
        <KBtn>
          <IconMicrophone style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F5</span>
        </KBtn>
        <KBtn>
          <IconMoon style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F6</span>
        </KBtn>
        <KBtn>
          <IconPlayerTrackPrev style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F7</span>
        </KBtn>
        <KBtn>
          <IconPlayerSkipForward style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F8</span>
        </KBtn>
        <KBtn>
          <IconPlayerTrackNext style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F9</span>
        </KBtn>
        <KBtn>
          <IconVolume3 style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F10</span>
        </KBtn>
        <KBtn>
          <IconVolume2 style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F11</span>
        </KBtn>
        <KBtn>
          <IconVolume style={{ height: "6px", width: "6px" }} />
          <span className="mt-[2px] inline-block">F12</span>
        </KBtn>
        <KBtn>
          <div style={{ height: "4px", width: "4px", borderRadius: "50%", background: "black" }} />
        </KBtn>
      </div>

      {/* Second row */}
      <div className="macbook-keyboard-row">
        <KBtn>
          <span>~</span>
          <span>`</span>
        </KBtn>
        <KBtn>
          <span>!</span>
          <span>1</span>
        </KBtn>
        <KBtn>
          <span>@</span>
          <span>2</span>
        </KBtn>
        <KBtn>
          <span>#</span>
          <span>3</span>
        </KBtn>
        <KBtn>
          <span>$</span>
          <span>4</span>
        </KBtn>
        <KBtn>
          <span>%</span>
          <span>5</span>
        </KBtn>
        <KBtn>
          <span>^</span>
          <span>6</span>
        </KBtn>
        <KBtn>
          <span>&</span>
          <span>7</span>
        </KBtn>
        <KBtn>
          <span>*</span>
          <span>8</span>
        </KBtn>
        <KBtn>
          <span>(</span>
          <span>9</span>
        </KBtn>
        <KBtn>
          <span>)</span>
          <span>0</span>
        </KBtn>
        <KBtn>
          <span>&mdash;</span>
          <span>_</span>
        </KBtn>
        <KBtn>
          <span>+</span>
          <span> = </span>
        </KBtn>
        <KBtn className="w-10 items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">
          delete
        </KBtn>
      </div>

      {/* Third row */}
      <div className="macbook-keyboard-row">
        <KBtn className="w-10 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
          tab
        </KBtn>
        <KBtn>Q</KBtn>
        <KBtn>W</KBtn>
        <KBtn>E</KBtn>
        <KBtn>R</KBtn>
        <KBtn>T</KBtn>
        <KBtn>Y</KBtn>
        <KBtn>U</KBtn>
        <KBtn>I</KBtn>
        <KBtn>O</KBtn>
        <KBtn>P</KBtn>
        <KBtn>
          <span>{`{`}</span>
          <span>{`[`}</span>
        </KBtn>
        <KBtn>
          <span>{`}`}</span>
          <span>{`]`}</span>
        </KBtn>
        <KBtn>
          <span>{`|`}</span>
          <span>{"\\"}</span>
        </KBtn>
      </div>

      {/* Fourth Row */}
      <div className="macbook-keyboard-row">
        <KBtn className="w-[2.8rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
          caps lock
        </KBtn>
        <KBtn>A</KBtn>
        <KBtn>S</KBtn>
        <KBtn>D</KBtn>
        <KBtn>F</KBtn>
        <KBtn>G</KBtn>
        <KBtn>H</KBtn>
        <KBtn>J</KBtn>
        <KBtn>K</KBtn>
        <KBtn>L</KBtn>
        <KBtn>
          <span>{`:`}</span>
          <span>{`;`}</span>
        </KBtn>
        <KBtn>
          <span>{`"`}</span>
          <span>{`'`}</span>
        </KBtn>
        <KBtn className="w-[2.85rem] items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">
          return
        </KBtn>
      </div>

      {/* Fifth Row */}
      <div className="macbook-keyboard-row">
        <KBtn className="w-[3.65rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
          shift
        </KBtn>
        <KBtn>Z</KBtn>
        <KBtn>X</KBtn>
        <KBtn>C</KBtn>
        <KBtn>V</KBtn>
        <KBtn>B</KBtn>
        <KBtn>N</KBtn>
        <KBtn>M</KBtn>
        <KBtn>
          <span>{`<`}</span>
          <span>{`,`}</span>
        </KBtn>
        <KBtn>
          <span>{`>`}</span>
          <span>{`.`}</span>
        </KBtn>
        <KBtn>
          <span>{`?`}</span>
          <span>{`/`}</span>
        </KBtn>
        <KBtn className="w-[3.65rem] items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">
          shift
        </KBtn>
      </div>

      {/* sixth Row */}
      <div className="macbook-keyboard-row">
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">fn</div>
          <div className="flex w-full justify-start pl-1">
            <IconWorld style={{ height: "6px", width: "6px" }} />
          </div>
        </KBtn>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">
            <IconChevronUp style={{ height: "6px", width: "6px" }} />
          </div>
          <div className="flex w-full justify-start pl-1">control</div>
        </KBtn>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">
            <OptionKey style={{ height: "6px", width: "6px" }} />
          </div>
          <div className="flex w-full justify-start pl-1">option</div>
        </KBtn>
        <KBtn className="w-8" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">
            <IconCommand style={{ height: "6px", width: "6px" }} />
          </div>
          <div className="flex w-full justify-start pl-1">command</div>
        </KBtn>
        <KBtn className="w-[8.2rem]"></KBtn>
        <KBtn className="w-8" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-start pl-1">
            <IconCommand style={{ height: "6px", width: "6px" }} />
          </div>
          <div className="flex w-full justify-start pl-1">command</div>
        </KBtn>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-start pl-1">
            <OptionKey style={{ height: "6px", width: "6px" }} />
          </div>
          <div className="flex w-full justify-start pl-1">option</div>
        </KBtn>
        <div style={{ marginTop: "2px", display: "flex", height: "1.5rem", width: "4.9rem", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", borderRadius: "4px", padding: "0.5px" }}>
          <KBtn className="h-3 w-6" style={{ height: "0.75rem", width: "1.5rem" }}>
            <IconCaretUpFilled style={{ height: "6px", width: "6px" }} />
          </KBtn>
          <div style={{ display: "flex" }}>
            <KBtn className="h-3 w-6" style={{ height: "0.75rem", width: "1.5rem" }}>
              <IconCaretLeftFilled style={{ height: "6px", width: "6px" }} />
            </KBtn>
            <KBtn className="h-3 w-6" style={{ height: "0.75rem", width: "1.5rem" }}>
              <IconCaretDownFilled style={{ height: "6px", width: "6px" }} />
            </KBtn>
            <KBtn className="h-3 w-6" style={{ height: "0.75rem", width: "1.5rem" }}>
              <IconCaretRightFilled style={{ height: "6px", width: "6px" }} />
            </KBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export const KBtn = ({
  className,
  children,
  childrenClassName,
  style,
}) => {
  return (
    <div
      className="macbook-key-wrapper"
      style={style}
    >
      <div
        className="macbook-key-inner"
        style={{
          width: className?.includes("w-10") ? "2.5rem" : className?.includes("w-[2.8rem]") ? "2.8rem" : className?.includes("w-[2.85rem]") ? "2.85rem" : className?.includes("w-[3.65rem]") ? "3.65rem" : className?.includes("w-8") ? "2rem" : className?.includes("w-[8.2rem]") ? "8.2rem" : "1.5rem",
          height: className?.includes("h-3") ? "0.7rem" : "1.5rem"
        }}
      >
        <div className="macbook-key-text">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SpeakerGrid = () => {
  return <div className="macbook-speaker"></div>;
};

export const OptionKey = ({ style }) => {
  return (
    <svg
      fill="none"
      version="1.1"
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      style={style}
    >
      <rect
        stroke="currentColor"
        strokeWidth={2}
        x="18"
        y="5"
        width="10"
        height="2"
      />
      <polygon
        stroke="currentColor"
        strokeWidth={2}
        points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25 "
      />
    </svg>
  );
};

const AceternityLogo = () => {
  return (
    <svg
      width="66"
      height="65"
      viewBox="0 0 66 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: "12px", width: "12px", color: "white" }}
    >
      <path
        d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
    </svg>
  );
};
