import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2 items-center">
      {/* Korean Button */}
      <Button
        onClick={() => setLanguage("ko")}
        variant={language === "ko" ? "default" : "outline"}
        size="sm"
        className={`px-3 py-1 text-sm font-medium ${
          language === "ko"
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0"
            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
        }`}
      >
        <span className="mr-1">🇰🇷</span>
        KO
      </Button>

      {/* English Button */}
      <Button
        onClick={() => setLanguage("en")}
        variant={language === "en" ? "default" : "outline"}
        size="sm"
        className={`px-3 py-1 text-sm font-medium ${
          language === "en"
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0"
            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
        }`}
      >
        <span className="mr-1">🇺🇸</span>
        EN
      </Button>
    </div>
  );
}
