import { useState } from "react";

export const useToggleState = (initialState: string) => {
  const [state, setState] = useState(initialState);

  const toggleState = () => {
    setState((prevState) => (prevState === "leftOpen" ? "close" : "leftOpen"));
  };

  return { state, toggleState };
};
