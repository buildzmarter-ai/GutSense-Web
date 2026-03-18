"use client";

import { useState } from "react";
import TabNavigation, { TabId } from "@/components/TabNavigation";
import AnalyzeTab from "@/components/AnalyzeTab";
import HistoryTab from "@/components/HistoryTab";
import SourcesTab from "@/components/SourcesTab";
import SettingsTab from "@/components/SettingsTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("analyze");

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {activeTab === "analyze" && <AnalyzeTab />}
        {activeTab === "history" && <HistoryTab onNavigateToAnalyze={() => setActiveTab("analyze")} />}
        {activeTab === "sources" && <SourcesTab />}
        {activeTab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}
