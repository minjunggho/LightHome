import { useEffect, useState } from "react";

/**
 * Reveals `text` one character at a time.
 *
 * @param text       The full string to type out.
 * @param speed      Milliseconds between each revealed character (default 38ms).
 * @param startDelay Milliseconds to wait before typing begins (default 600ms).
 * @returns `{ displayed, done }` — the substring revealed so far and whether typing finished.
 */
export function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);

    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
