import React from "react";
import { Clock, MessageCircle } from "lucide-react";

export interface FeedPost {
  id: string;
  playerName: string;
  timestamp: string;
  image: string;
  caption?: string;
  initials: string;
}

interface FeedItemProps {
  post: FeedPost;
  index: number;
}

const FeedItem: React.FC<FeedItemProps> = ({ post, index }) => {
  return (
    <article
      className="bg-card rounded-2xl overflow-hidden shadow-card border border-border animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-xs text-primary-foreground">
            {post.initials}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{post.playerName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{post.timestamp}</span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-success/20 border border-success/30 flex items-center justify-center">
          <span className="text-[9px] font-bold text-success">✓</span>
        </div>
      </div>

      {/* Image */}
      <div className="relative w-full bg-muted" style={{ paddingBottom: "75%" }}>
        <img
          src={post.image}
          alt={`${post.playerName}'s gym proof`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Caption & actions */}
      {post.caption && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-start gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-snug">{post.caption}</p>
          </div>
        </div>
      )}

      {!post.caption && <div className="h-2" />}
    </article>
  );
};

export default FeedItem;
