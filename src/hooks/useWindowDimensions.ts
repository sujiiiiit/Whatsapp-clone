import { useState, useEffect, useRef } from "react";

export const useWindowDimensions = () => {
  const colRightRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = () => {
    if (colRightRef.current) {
      const { offsetWidth, offsetHeight } = colRightRef.current;
      setDimensions({ width: offsetWidth, height: offsetHeight });
    }
  };

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  return { colRightRef, dimensions };
};
