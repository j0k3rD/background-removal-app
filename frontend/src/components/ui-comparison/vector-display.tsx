"use client"

import React, { useState } from 'react'

interface VectorDisplayProps {
  svgUrl: string
  originalUrl?: string
  filename?: string
}

export function VectorDisplay({ svgUrl, originalUrl, filename }: VectorDisplayProps) {
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <div className="space-y-3">
      {originalUrl && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowOriginal(false)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              !showOriginal 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            SVG Vectorizado
          </button>
          <button
            onClick={() => setShowOriginal(true)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              showOriginal 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Original
          </button>
        </div>
      )}
      <div className="relative w-full h-96 border rounded-lg bg-[url('/checkerboard.svg')] bg-repeat overflow-hidden">
        <img
          src={showOriginal && originalUrl ? originalUrl : svgUrl}
          alt={filename || 'Result'}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  )
}
