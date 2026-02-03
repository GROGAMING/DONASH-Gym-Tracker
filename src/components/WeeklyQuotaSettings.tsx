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
    <div style={{ 
      padding: "20px", 
      maxWidth: "400px", 
      margin: "20px 0",
      border: "1px solid #ddd",
      borderRadius: "8px",
      backgroundColor: "#f9f9f9"
    }}>
      <h3 style={{ margin: "0 0 16px 0" }}>Weekly Quota Settings</h3>
      
      <div style={{ marginBottom: "16px" }}>
        <label style={{ 
          display: "block", 
          marginBottom: "8px",
          fontWeight: "bold"
        }}>
          Required sessions this week:
        </label>
        
        <select
          value={requiredSessions}
          onChange={(e) => saveSettings(Number(e.target.value))}
          disabled={loading || saving}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            backgroundColor: loading || saving ? "#f5f5f5" : "#fff",
            fontSize: "16px",
            cursor: loading || saving ? "not-allowed" : "pointer"
          }}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>

      {message && (
        <div style={{
          padding: "8px 12px",
          borderRadius: "4px",
          backgroundColor: "#d4edda",
          color: "#155724",
          fontSize: "14px",
          marginBottom: "8px"
        }}>
          ✅ {message}
        </div>
      )}

      {error && (
        <div style={{
          padding: "8px 12px",
          borderRadius: "4px",
          backgroundColor: "#f8d7da",
          color: "#721c24",
          fontSize: "14px",
          marginBottom: "8px"
        }}>
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
