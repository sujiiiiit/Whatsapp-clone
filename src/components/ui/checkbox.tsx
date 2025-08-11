import { useState, memo, useCallback } from "react";

const DEFAULT_TABS = ["All", "Unread", "Favourites", "Groups"] as const;
type Tab = (typeof DEFAULT_TABS)[number];

interface FilterTabsProps {
    value?: Tab;                         // controlled value
    onChange?: (tab: Tab) => void;       // change handler
    tabs?: readonly Tab[];               // custom tabs
    className?: string;
}

const baseBtn =
    "px-4 py-1.5 rounded-full border text-xs sm:text-sm font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer";

function FilterTabs({
    value,
    onChange,
    tabs = DEFAULT_TABS,
    className = ""
}: FilterTabsProps) {
    const [internal, setInternal] = useState<Tab>(tabs[0]);
    const active = value ?? internal;

    const handleSelect = useCallback(
        (tab: Tab) => {
            if (tab === active) return;
            if (onChange) onChange(tab);
            else setInternal(tab);
        },
        [active, onChange]
    );

    return (
        <div role="tablist" aria-label="Filter tabs" className={`flex gap-2 ${className}`}>
            {tabs.map((tab) => {
                const isActive = tab === active;
                return (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleSelect(tab)}
                        className={
                            `${baseBtn} ` +
                            (isActive
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-white text-gray-500 border-gray-300 hover:bg-gray-100")
                        }
                    >
                        {tab}
                    </button>
                );
            })}
        </div>
    );
}

export default memo(FilterTabs);
