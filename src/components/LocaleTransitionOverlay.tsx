"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

const START_EVENT = "cm:locale-switch:start";

export default function LocaleTransitionOverlay() {
  const locale = useLocale();
  const previousLocaleRef = useRef(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleStart = () => setVisible(true);
    window.addEventListener(START_EVENT, handleStart);
    return () => window.removeEventListener(START_EVENT, handleStart);
  }, []);

  useEffect(() => {
    if (previousLocaleRef.current !== locale) {
      const timeoutId = window.setTimeout(() => {
        setVisible(false);
      }, 280);
      previousLocaleRef.current = locale;
      return () => window.clearTimeout(timeoutId);
    }
  }, [locale]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="locale-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-none fixed inset-0 z-[140]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,133,161,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.15),transparent_30%),rgba(255,255,255,0.38)] backdrop-blur-md dark:bg-[radial-gradient(circle_at_top,rgba(0,133,161,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.18),transparent_30%),rgba(5,12,16,0.42)]"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
