"use client";

import { useState, useEffect } from "react";
import { useWeeklyRequiredSessions } from "@/lib/weeklyQuotaSimple";

export default function WeeklyQuotaSettings() {
  const { required, setRequired } = useWeeklyRequiredSessions();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSettings(value: number) {
    try {
      setError("");
      setMessage("");
      
      setRequired(value as 1 | 2 | 3 | 4);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setError(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "20px 0" }}>
      <h3 className="card-title">Weekly Quota Settings</h3>
      
      <div style={{ marginBottom: "16px" }}>
        <label className="label">
          Required sessions this week:
        </label>
        
        <select
          value={required}
          onChange={(e) => saveSettings(Number(e.target.value))}
          className="input"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>

      {message && (
        <div className="message message-success">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="message message-error">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
