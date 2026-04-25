"use client"

import { useState, useEffect } from "react"
import { TetrisGame } from "@/components/tetris-game"
import { MobileTetrisGame } from "@/components/mobile-tetris-game"
import { MainMenu } from "@/components/main-menu"
import { LearnerBriefing } from "@/components/learner-briefing"
import { useLearner } from "@/hooks/use-learner"
import type { Difficulty } from "@/types/learner"

type Stage = "menu" | "briefing" | "game"

export default function Home() {
  const [stage, setStage] = useState<Stage>("menu")
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [isMobile, setIsMobile] = useState(false)

  const learner = useLearner()

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const goToBriefing = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty)
    setStage("briefing")
  }

  const beginSession = () => {
    setStage("game")
  }

  const backToMenu = () => {
    setStage("menu")
  }

  return (
    <main className="min-h-screen">
      {stage === "menu" && (
        <MainMenu
          summary={learner.summary}
          isProfileLoaded={learner.isLoaded}
          onStartGame={goToBriefing}
          onResetProfile={learner.resetProfile}
        />
      )}

      {stage === "briefing" && learner.summary && (
        <LearnerBriefing
          difficulty={difficulty}
          summary={learner.summary}
          cachedBriefing={learner.profile?.lastBriefing ?? null}
          onBack={backToMenu}
          onStart={beginSession}
          onBriefingReady={learner.setBriefing}
        />
      )}

      {stage === "game" &&
        (isMobile ? (
          <MobileTetrisGame difficulty={difficulty} learner={learner} onBackToMenu={backToMenu} />
        ) : (
          <TetrisGame difficulty={difficulty} learner={learner} onBackToMenu={backToMenu} />
        ))}
    </main>
  )
}
