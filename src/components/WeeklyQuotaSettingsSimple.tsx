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
          value={required}
          onChange={(e) => saveSettings(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            backgroundColor: "#fff",
            fontSize: "16px",
            cursor: "pointer"
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
    </div>
  );
}
