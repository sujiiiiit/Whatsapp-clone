import { useRef, useState } from "react";

export const useSearch = () => {
  const [searchIsOpen, setSearchIsOpen] = useState(false);

  const openSearch = () => setSearchIsOpen(true);
  const closeSearch = () => setSearchIsOpen(false);

  return { searchIsOpen, openSearch, closeSearch };
};

export const useClearSearch = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return { inputRef, clearInput };
};


export const useSearchInput = () => {
  const [searchContent, setSearchContent] = useState("");

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchContent(event.target.value);
  };

  return { searchContent, handleSearchChange };
}
