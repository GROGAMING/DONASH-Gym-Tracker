import React from "react";

const SkeletonLoader: React.FC = () => (
  <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-card">
    {/* Header */}
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full skeleton shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 w-28 rounded-full skeleton mb-2" />
        <div className="h-2.5 w-20 rounded-full skeleton" />
      </div>
    </div>
    {/* Image */}
    <div className="w-full h-56 skeleton" />
    {/* Caption */}
    <div className="px-4 py-3">
      <div className="h-3 w-4/5 rounded-full skeleton mb-2" />
      <div className="h-3 w-2/3 rounded-full skeleton" />
    </div>
  </div>
);

export default SkeletonLoader;
