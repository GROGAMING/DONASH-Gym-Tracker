"use client";

import { useState, useEffect } from "react";

export default function WeeklyQuotaSettings() {
  const [requiredSessions, setRequiredSessions] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setRequiredSessions(data.value);
    } catch (error) {
      setMessage("Error loading settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(value: number) {
    setSaving(true);
    setMessage("");
    
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      setRequiredSessions(value);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving settings");
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
        
        <div style={{ display: "flex", gap: "8px" }}>
          {[1, 2, 3, 4].map((value) => (
            <button
              key={value}
              onClick={() => saveSettings(value)}
              disabled={saving || requiredSessions === value}
              style={{
                flex: 1,
                padding: "12px",
                border: `2px solid ${requiredSessions === value ? "#007bff" : "#ddd"}`,
                borderRadius: "6px",
                backgroundColor: requiredSessions === value ? "#007bff" : "#fff",
                color: requiredSessions === value ? "#fff" : "#333",
                cursor: saving || requiredSessions === value ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "bold"
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div style={{
          padding: "8px 12px",
          borderRadius: "4px",
          backgroundColor: message.includes("Error") ? "#f8d7da" : "#d4edda",
          color: message.includes("Error") ? "#721c24" : "#155724",
          fontSize: "14px"
        }}>
          {message}
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
