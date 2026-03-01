import React, { useState, useEffect, useCallback } from "react";
import TeamHeader from "@/components/TeamHeader";
import PlayerSelect from "@/components/PlayerSelect";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import CameraCapture from "@/components/CameraCapture";
import FeedList from "@/components/FeedList";
import Leaderboard from "@/components/Leaderboard";
import MainMenu from "@/components/MainMenu";
import AdminPlaceholder from "@/components/AdminPlaceholder";
import BackButton from "@/components/BackButton";
import BottomNav, { Tab } from "@/components/BottomNav";
import ToastBanner from "@/components/ToastBanner";
import { FeedPost } from "@/components/FeedItem";
import { Pencil } from "lucide-react";

import gymPost1 from "@/assets/gym-post-1.jpg";
import gymPost2 from "@/assets/gym-post-2.jpg";
import gymPost3 from "@/assets/gym-post-3.jpg";
import gymPost4 from "@/assets/gym-post-4.jpg";

// ─── Data ────────────────────────────────────────────────────────────────────

const TEAM_NAME = "Redmond RFC";

const PLAYERS = [
  "Aaron Walsh", "Ben Thornton", "Cian Murphy", "Dara O'Brien",
  "Eoin Kelly", "Fionn Reilly", "Gavin Clarke", "Hugh McMahon",
  "Ian Farrell", "Jack Quinlan", "Kevin O'Shea", "Liam Brady",
  "Marcus Ryan", "Niall Connell", "Owen Sheridan",
];

const SAMPLE_POSTS: FeedPost[] = [
  { id: "1", playerName: "Marcus Ryan",   timestamp: "Today, 7:14 AM",      image: gymPost1, caption: "Morning session done ✅ Back and bi's. Felt strong.",     initials: "MR" },
  { id: "2", playerName: "Cian Murphy",   timestamp: "Today, 6:50 AM",      image: gymPost2, caption: "Heavy squat day. 140kg for 5. PRs incoming.",              initials: "CM" },
  { id: "3", playerName: "Ben Thornton",  timestamp: "Yesterday, 7:02 PM",  image: gymPost3,                                                                      initials: "BT" },
  { id: "4", playerName: "Eoin Kelly",    timestamp: "Yesterday, 6:30 AM",  image: gymPost4, caption: "Deadlift conditioning. 160 x 3. Body is battered.",       initials: "EK" },
  { id: "5", playerName: "Aaron Walsh",   timestamp: "Mon, 7:45 AM",        image: gymPost2, caption: "Upper body push. Getting the reps in before training.",    initials: "AW" },
  { id: "6", playerName: "Jack Quinlan",  timestamp: "Mon, 6:15 AM",        image: gymPost1,                                                                      initials: "JQ" },
  { id: "7", playerName: "Fionn Reilly",  timestamp: "Sun, 8:00 AM",        image: gymPost3, caption: "Two sessions this week. Keeping the streak alive 🔥",     initials: "FR" },
  { id: "8", playerName: "Liam Brady",    timestamp: "Sun, 7:30 AM",        image: gymPost4, caption: "Pre-match gym. Light and fast.",                           initials: "LB" },
  { id: "9", playerName: "Niall Connell", timestamp: "Sat, 9:10 AM",        image: gymPost1,                                                                      initials: "NC" },
  { id: "10", playerName: "Dara O'Brien", timestamp: "Sat, 7:00 AM",        image: gymPost2, caption: "Saturday grind. Squad standards.",                        initials: "DO" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type AppStep = "setup" | "app";

interface ToastState { message: string; type: "success" | "error" }

// ─── Upload sub-step ─────────────────────────────────────────────────────────
type UploadStep = "playerSelect" | "capture" | "captured" | "posting";

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const [step, setStep] = useState<AppStep>("setup");
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Player
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Upload flow
  const [uploadStep, setUploadStep] = useState<UploadStep>("playerSelect");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Feed
  const [feedLoading, setFeedLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  // Simulate feed load once app is entered
  useEffect(() => {
    if (step === "app") {
      const t = setTimeout(() => {
        setPosts(SAMPLE_POSTS);
        setFeedLoading(false);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Reset upload flow whenever user navigates to upload tab
  const handleTabChange = (tab: Tab) => {
    if (tab === "upload" && activeTab !== "upload") {
      setUploadStep(selectedPlayer ? "capture" : "playerSelect");
      setCapturedFile(null);
      setCapturedPreview(null);
      setCaption("");
      setUploadProgress(0);
      setUploading(false);
    }
    setActiveTab(tab);
  };

  // ── Capture handlers ───────────────────────────────────────────────────────
  const handleCapture = (file: File, preview: string) => {
    setCapturedFile(file);
    setCapturedPreview(preview);
    setUploadStep("captured");
  };

  const handleRetake = () => {
    setCapturedFile(null);
    setCapturedPreview(null);
    setUploadStep("capture");
  };

  const handleUsePhoto = () => {
    // just confirm – caption step is inline
    setUploadStep("captured");
  };

  const handlePost = () => {
    if (!capturedFile || !selectedPlayer) return;
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return Math.min(p + Math.floor(Math.random() * 18) + 8, 100);
      });
    }, 180);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);

      const initials = selectedPlayer
        .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

      const newPost: FeedPost = {
        id: Date.now().toString(),
        playerName: selectedPlayer,
        timestamp: "Just now",
        image: capturedPreview!,
        caption: caption || undefined,
        initials,
      };

      setPosts((prev) => [newPost, ...prev]);
      setUploading(false);
      setCapturedFile(null);
      setCapturedPreview(null);
      setCaption("");
      setUploadProgress(0);
      setUploadStep("capture");
      setToast({ message: "Posted to team! 🏋️", type: "success" });
      setActiveTab("doomscroll");
    }, 2400);
  };

  const dismissToast = useCallback(() => setToast(null), []);

  // ── Setup screen ───────────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-primary safe-top">
          <div className="max-w-sm mx-auto px-4 pt-10 pb-8">
            <h1 className="font-display font-extrabold text-3xl text-primary-foreground leading-tight">
              {TEAM_NAME}
            </h1>
            <p className="text-primary-foreground/60 text-sm mt-1">Rep Receipt</p>
          </div>
        </div>

        <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-4">
          <div className="relative z-20 bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-up">
            <h2 className="font-display font-bold text-xl text-foreground mb-1">Who are you?</h2>
            <p className="text-sm text-muted-foreground mb-6">Pick your name to get started.</p>
            <PlayerSelect players={PLAYERS} selected={selectedPlayer} onSelect={setSelectedPlayer} />
            <div className="mt-5">
              <PrimaryButton disabled={!selectedPlayer} onClick={() => setStep("app")}>
                Continue →
              </PrimaryButton>
            </div>
          </div>
          <div className="relative z-0 flex items-start gap-2.5 mt-5 px-1 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <svg className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No login needed. Your team link keeps things private — only people with this link can see your team's posts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main App ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {toast && (
        <ToastBanner message={toast.message} type={toast.type} onDismiss={dismissToast} />
      )}

      <TeamHeader teamName={TEAM_NAME} />

      <main className="flex-1 overflow-y-auto pb-24">

        {/* ── Home / Main Menu ─────────────────────────────────────────────── */}
        {activeTab === "home" && (
          <MainMenu
            teamName={TEAM_NAME}
            onNavigate={(tab) => handleTabChange(tab)}
          />
        )}

        {/* ── Admin placeholder ─────────────────────────────────────────────── */}
        {(activeTab as string) === "admin" && (
          <AdminPlaceholder onBack={() => setActiveTab("home")} />
        )}

        {/* ── Upload tab ────────────────────────────────────────────────────── */}
        {activeTab === "upload" && (
          <div className="max-w-sm mx-auto px-4 pt-5 animate-fade-up">
            <div className="mb-4">
              <BackButton onClick={() => setActiveTab("home")} />
            </div>
            {/* Player row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="font-display font-bold text-xs text-primary-foreground">
                    {selectedPlayer!.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">Posting as</p>
                  <p className="font-semibold text-sm text-foreground">{selectedPlayer}</p>
                </div>
              </div>
              <SecondaryButton onClick={() => setStep("setup")}>
                <Pencil className="w-3 h-3" />
                Change
              </SecondaryButton>
            </div>

            {/* Camera capture component */}
            <CameraCapture
              onCapture={handleCapture}
              preview={uploadStep === "captured" ? capturedPreview : null}
              onRetake={handleRetake}
              onUse={handleUsePhoto}
              uploading={uploading}
              progress={Math.min(uploadProgress, 100)}
            />

            {/* Caption + post — only shown when photo is captured and not posting */}
            {uploadStep === "captured" && !uploading && (
              <div className="mt-4 animate-fade-up">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption… (optional)"
                  maxLength={200}
                  rows={2}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-foreground/30 transition-colors"
                />
                {caption.length > 0 && (
                  <p className="text-right text-xs text-muted-foreground mt-1">{caption.length}/200</p>
                )}
                <div className="mt-4">
                  <PrimaryButton onClick={handlePost}>
                    Post to team
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Leaderboard tab ───────────────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <div className="max-w-sm mx-auto px-4 pt-5">
            <div className="mb-4">
              <BackButton onClick={() => setActiveTab("home")} />
            </div>
            <Leaderboard />
          </div>
        )}

        {/* ── Doom Scroll tab ───────────────────────────────────────────────── */}
        {activeTab === "doomscroll" && (
          <div className="max-w-sm mx-auto animate-fade-up">
            <div className="px-4 pt-5 mb-2">
              <BackButton onClick={() => setActiveTab("home")} />
            </div>
            <FeedList posts={posts} loading={feedLoading} />
          </div>
        )}
      </main>

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
};

export default Index;
