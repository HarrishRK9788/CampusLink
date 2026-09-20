'use client'

import { votePost } from '@/app/(main)/discuss/[postId]/actions'
import { useState } from 'react'

export function VoteButtons({ 
  postId, 
  initialScore, 
  initialUserVote 
}: { 
  postId: string, 
  initialScore: number, 
  initialUserVote: 1 | -1 | 0 
}) {
  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState(initialUserVote)
  const [isVoting, setIsVoting] = useState(false)

  async function handleVote(value: 1 | -1) {
    if (isVoting) return
    setIsVoting(true)

    // Optimistic update
    const previousVote = userVote
    const previousScore = score

    if (userVote === value) {
      // Trying to vote the same thing again... for now we don't have "remove vote" in the UI easily, 
      // but let's just ignore it to keep MVP simple.
      setIsVoting(false)
      return
    }

    // New vote logic
    let newScore = score
    if (userVote !== 0) {
      // Reversing a previous vote (e.g. was 1, now -1, net change is -2)
      newScore += (value * 2)
    } else {
      // New vote
      newScore += value
    }

    setScore(newScore)
    setUserVote(value)

    try {
      await votePost(postId, value)
    } catch (e) {
      // Revert on error
      setScore(previousScore)
      setUserVote(previousVote)
      alert("Failed to vote")
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex flex-col items-center min-w-[40px] text-gray-500 bg-gray-50 dark:bg-gray-800 rounded p-2 self-start">
      <button 
        onClick={() => handleVote(1)} 
        disabled={isVoting}
        className={`hover:text-orange-500 transition-colors ${userVote === 1 ? 'text-orange-500' : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="m18 15-6-6-6 6"/></svg>
      </button>
      
      <span className={`font-bold text-sm ${userVote === 1 ? 'text-orange-500' : userVote === -1 ? 'text-blue-500' : 'text-foreground'}`}>
        {score}
      </span>
      
      <button 
        onClick={() => handleVote(-1)} 
        disabled={isVoting}
        className={`hover:text-blue-500 transition-colors ${userVote === -1 ? 'text-blue-500' : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1"><path d="m6 9 6 6 6-6"/></svg>
      </button>
    </div>
  )
}
