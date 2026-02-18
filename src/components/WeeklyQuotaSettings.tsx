"use client";

import { useState, useEffect } from "react";
import { getRequiredWeeklySessions, setRequiredWeeklySessions } from "@/lib/settings";

export default function WeeklyQuotaSettings() {
  const [requiredSessions, setRequiredSessions] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      
      const value = await getRequiredWeeklySessions();
      setRequiredSessions(value);
      setMessage("");
    } catch (error) {
      console.error("Error loading settings:", error);
      setError(`Error loading settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(value: number) {
    if (saving) return;
    
    const previousValue = requiredSessions;
    setSaving(true);
    setError("");
    setMessage("");
    
    // Optimistic UI update
    setRequiredSessions(value);
    
    try {
      await setRequiredWeeklySessions(value as 1 | 2 | 3 | 4);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setError(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert on failure
      setRequiredSessions(previousValue);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "20px 0" }}>
      <h3 className="card-title">Weekly Quota Settings</h3>
      
      <div style={{ marginBottom: "16px" }}>
        <label className="label">
          Required sessions this week:
        </label>
        
        <select
          value={requiredSessions}
          onChange={(e) => saveSettings(Number(e.target.value))}
          disabled={loading || saving}
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

      {saving && (
        <div style={{ fontSize: "14px", color: "#666" }}>
          Saving...
        </div>
      )}
    </div>
  );
}
