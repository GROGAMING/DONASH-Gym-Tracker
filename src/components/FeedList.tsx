import React from "react";
import FeedItem, { FeedPost } from "./FeedItem";
import SkeletonLoader from "./SkeletonLoader";
import { Dumbbell, RefreshCw } from "lucide-react";

import PageContainer from "@/components/PageContainer";

interface FeedListProps {
  posts: FeedPost[];
  loading: boolean;
}

const FeedList: React.FC<FeedListProps> = ({ posts, loading }) => {
  if (loading) {
    return (
      <PageContainer className="pt-4">
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonLoader key={i} />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (posts.length === 0) {
    return (
      <PageContainer className="py-16 sm:py-20">
        <div className="flex flex-col items-center justify-center text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground mb-2">No posts yet</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Be the first to upload — hit the gym and prove it to your team.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Pull-to-refresh hint */}
      <div className="flex items-center justify-center gap-2 py-3">
        <RefreshCw className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground/60">Pull to refresh</span>
      </div>

      <PageContainer className="pb-4">
        <div className="flex flex-col gap-4">
          {posts.map((post, i) => (
            <FeedItem key={post.id} post={post} index={i} />
          ))}
        </div>
      </PageContainer>

      <div className="py-8 text-center">
        <p className="text-xs text-muted-foreground">
          {posts.length} post{posts.length !== 1 ? "s" : ""} · that's all for now
        </p>
      </div>
    </div>
  );
};

export default FeedList;
