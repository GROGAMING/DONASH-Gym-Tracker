"use client";

import { useState, useEffect } from "react";

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
      
      const res = await fetch("/api/admin/settings/weekly-quota");
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch settings");
      }
      
      const data = await res.json();
      setRequiredSessions(data.required || 3);
      setMessage("");
    } catch (error) {
      console.error("Error loading settings:", error);
      
      let errorMessage = "Error loading settings";
      let statusCode = "Unknown";
      let responseText = "";
      
      if (error instanceof Response) {
        statusCode = error.status.toString();
        try {
          const errorData = await error.json();
          responseText = JSON.stringify(errorData);
          errorMessage = `Error ${error.status}: ${errorData.error || errorData.message || 'Unknown error'}`;
        } catch {
          responseText = await error.text();
          errorMessage = `Error ${error.status}: ${responseText || 'HTTP error'}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
        responseText = error.stack || "";
      }
      
      console.error("Load failed details:", {
        status: statusCode,
        response: responseText,
        error: error
      });
      
      setError(errorMessage);
      // Set fallback value
      setRequiredSessions(3);
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
      const res = await fetch("/api/admin/settings/weekly-quota", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ required: value })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save settings");
      }
      
      setMessage("Settings saved successfully!");
      setError(""); // Clear any previous errors
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      
      let errorMessage = "Error saving settings";
      let statusCode = "Unknown";
      let responseText = "";
      
      if (error instanceof Response) {
        statusCode = error.status.toString();
        try {
          const errorData = await error.json();
          responseText = JSON.stringify(errorData);
          errorMessage = `Error ${error.status}: ${errorData.error || errorData.message || 'Unknown error'}`;
        } catch {
          responseText = await error.text();
          errorMessage = `Error ${error.status}: ${responseText || 'HTTP error'}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
        responseText = error.stack || "";
      }
      
      console.error("Save failed details:", {
        status: statusCode,
        response: responseText,
        error: error
      });
      
      setError(errorMessage);
      // Revert on failure
      setRequiredSessions(previousValue);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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
        <div>Loading settings...</div>
      </div>
    );
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
