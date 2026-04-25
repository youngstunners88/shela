"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, BookOpen, Zap, Crown, Brain, RotateCcw } from "lucide-react"
import { LayerBadge } from "./layer-badge"
import type { Difficulty, LearnerSummary } from "@/types/learner"

interface MainMenuProps {
  summary: LearnerSummary | null
  isProfileLoaded: boolean
  onStartGame: (difficulty: Difficulty) => void
  onResetProfile: () => void
}

export function MainMenu({ summary, isProfileLoaded, onStartGame, onResetProfile }: MainMenuProps) {
  const hasHistory = !!summary && summary.totalSessions > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-1.5s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/8 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-amber-400 animate-subtle-bounce" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-lg">
              Letter Tetris
            </h1>
            <Sparkles
              className="w-10 h-10 text-amber-400 animate-subtle-bounce"
              style={{ animationDelay: "-1s" }}
            />
          </div>
          <p className="text-xl text-purple-200/80 font-light tracking-wide">
            Master English vocabulary through the art of falling letters
          </p>
        </div>

        {/* Learner stats card (Layer 2 surface) */}
        {isProfileLoaded && (
          <Card className="glass border-emerald-400/20 mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-emerald-200 text-base font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Your profile
                </CardTitle>
                <div className="flex items-center gap-2">
                  <LayerBadge layer={2} label="Tracking your play" />
                  {hasHistory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onResetProfile}
                      className="text-white/40 hover:text-white/80 hover:bg-white/10 h-7 px-2"
                      title="Reset profile"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasHistory ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ProfileStat label="Sessions" value={summary!.totalSessions} accent="text-emerald-300" />
                  <ProfileStat
                    label="Words completed"
                    value={summary!.totalWordsCompleted}
                    accent="text-amber-300"
                  />
                  <ProfileStat
                    label="Mastered"
                    value={summary!.masteredCount}
                    accent="text-purple-300"
                  />
                  <ProfileStat label="Best streak" value={summary!.bestStreak} accent="text-rose-300" />
                </div>
              ) : (
                <p className="text-purple-200/70 text-sm">
                  No history yet. Pick a difficulty below — the system will start learning your patterns
                  on the first word.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Difficulty Cards */}
        <div className="grid gap-5">
          <Card
            className="glass border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 group cursor-pointer"
            onClick={() => onStartGame("easy")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                  <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-emerald-300 text-xl">Beginner</CardTitle>
                  <CardDescription className="text-emerald-200/60">
                    3-4 letter words with gentle pacing
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-900/30">
                Start Learning
              </Button>
            </CardContent>
          </Card>

          <Card
            className="glass border-amber-500/30 hover:border-amber-400/50 transition-all duration-300 group cursor-pointer"
            onClick={() => onStartGame("medium")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-amber-300 text-xl">Intermediate</CardTitle>
                  <CardDescription className="text-amber-200/60">
                    4-6 letter words with moderate challenge
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium shadow-lg shadow-amber-900/30">
                Start Challenge
              </Button>
            </CardContent>
          </Card>

          <Card
            className="glass border-rose-500/30 hover:border-rose-400/50 transition-all duration-300 group cursor-pointer"
            onClick={() => onStartGame("hard")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 group-hover:bg-rose-500/30 transition-colors">
                  <Crown className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <CardTitle className="text-rose-300 text-xl">Advanced</CardTitle>
                  <CardDescription className="text-rose-200/60">
                    5-8 letter words for vocabulary masters
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-medium shadow-lg shadow-rose-900/30">
                Start Mastery
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="mt-8">
          <Card className="glass-dark">
            <CardHeader className="pb-3">
              <CardTitle className="text-white/90 text-lg font-medium flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-purple-200/70 text-sm">
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Letter blocks descend gracefully
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Arrange them to spell the target word
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Words you miss come back sooner
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    AI coach adapts to your patterns
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProfileStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-black/20 rounded-lg p-3 text-center border border-white/5">
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] text-white/50 uppercase tracking-wide mt-1">{label}</div>
    </div>
  )
}
