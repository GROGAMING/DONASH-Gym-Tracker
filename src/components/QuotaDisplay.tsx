"use client";

import { getWeeklyRequiredSessions } from "@/lib/weeklyQuotaSimple";

interface UserWithQuota {
  id: string;
  name: string;
  weeklySessionCount: number;
  metQuota: boolean;
}

interface QuotaDisplayProps {
  users: UserWithQuota[];
  weekStart: string;
  showMetOnly?: boolean;
}

export default function QuotaDisplay({ users, weekStart, showMetOnly = false }: QuotaDisplayProps) {
  const required = getWeeklyRequiredSessions();
  
  // Apply quota logic
  const usersWithQuota = users.map(user => ({
    ...user,
    metQuota: user.weeklySessionCount >= required
  }));
  
  // Filter if requested
  const filteredUsers = showMetOnly 
    ? usersWithQuota.filter(user => user.metQuota)
    : usersWithQuota;
  
  // Sort by name
  filteredUsers.sort((a, b) => a.name.localeCompare(b.name));

  const metCount = usersWithQuota.filter(u => u.metQuota).length;

  if (showMetOnly) {
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
            ✅ Met This Week's Quota ({required} sessions)
          </h3>
          <span style={{ 
            fontSize: "14px", 
            color: "#155724",
            fontWeight: "bold"
          }}>
            {metCount} of {users.length}
          </span>
        </div>
        
        <div style={{ fontSize: "14px", color: "#155724", marginBottom: "12px" }}>
          Week of {new Date(weekStart).toLocaleDateString()}
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          {filteredUsers.map((user) => (
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

  return (
    <div>
      <div style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
        Required: {required} sessions
      </div>
      <ol>
        {filteredUsers.map((user) => (
          <li key={user.name}>
            {user.name}: {user.weeklySessionCount} {user.metQuota ? "✅" : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}
