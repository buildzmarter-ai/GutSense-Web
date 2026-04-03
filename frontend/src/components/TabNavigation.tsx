"use client";

import { FlaskConical, Clock, BookOpen, Settings } from "lucide-react";

const tabs = [
  { id: "analyze", label: "Analyze", icon: FlaskConical },
  { id: "history", label: "History", icon: Clock },
  { id: "sources", label: "Sources", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type TabId = (typeof tabs)[number]["id"];

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-20 lg:w-56 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
        <div className="px-4 py-6">
          <h1 className="hidden lg:block text-xl font-bold text-[var(--color-gut-accent)]">
            GutSense
          </h1>
          <h1 className="lg:hidden text-center text-xl font-bold text-[var(--color-gut-accent)]">
            GS
          </h1>
        </div>
        <div className="flex flex-col gap-1 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[var(--color-gut-accent)]/10 text-[var(--color-gut-accent)]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={20} />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <div className="flex justify-around py-2 pb-[env(safe-area-inset-bottom,8px)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "text-[var(--color-gut-accent)]"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon size={22} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
