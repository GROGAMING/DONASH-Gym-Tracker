"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  weeklySessionCount: number;
  metQuota: boolean;
}

interface WeeklyQuotaData {
  users: User[];
  requiredSessions: number;
  weekStart: string;
  totalUsers: number;
  metCount: number;
}

export default function MetWeeklyQuota() {
  const [data, setData] = useState<WeeklyQuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMetUsers();
  }, []);

  async function fetchMetUsers() {
    try {
      const res = await fetch("/api/weekly-quota?metOnly=true");
      if (!res.ok) throw new Error("Failed to fetch data");
      const quotaData = await res.json();
      setData(quotaData);
    } catch (error) {
      setError("Error loading weekly quota data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading weekly quota data...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  if (!data || data.users.length === 0) {
    return (
      <div style={{ 
        padding: "16px", 
        border: "1px solid #ddd", 
        borderRadius: "8px",
        backgroundColor: "#f8f9fa"
      }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Met This Week's Quota</h3>
        <p style={{ margin: 0, color: "#666" }}>
          No users have met the {data?.requiredSessions || 3} session requirement yet this week.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "16px", 
      border: "1px solid #28a745", 
      borderRadius: "8px",
      backgroundColor: "#d4edda"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "12px"
      }}>
        <h3 style={{ margin: 0, color: "#155724" }}>
          ✅ Met This Week's Quota ({data.requiredSessions} sessions)
        </h3>
        <span style={{ 
          fontSize: "14px", 
          color: "#155724",
          fontWeight: "bold"
        }}>
          {data.metCount} of {data.totalUsers}
        </span>
      </div>
      
      <div style={{ fontSize: "14px", color: "#155724", marginBottom: "12px" }}>
        Week of {new Date(data.weekStart).toLocaleDateString()}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {data.users.map((user) => (
          <div
            key={user.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              backgroundColor: "#fff",
              borderRadius: "4px",
              border: "1px solid #c3e6cb"
            }}
          >
            <span style={{ fontWeight: "500" }}>
              {user.name}
            </span>
            <span style={{ 
              fontSize: "12px", 
              color: "#666",
              backgroundColor: "#e9ecef",
              padding: "2px 6px",
              borderRadius: "3px"
            }}>
              {user.weeklySessionCount} sessions
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
