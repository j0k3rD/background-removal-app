"use client"

import React from 'react'
import Image from 'next/image'

interface VectorDisplayProps {
  svgUrl: string
  filename?: string
}

export function VectorDisplay({ svgUrl, filename }: VectorDisplayProps) {
  return (
    <div className="relative w-full h-96 border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
      <img
        src={svgUrl}
        alt={filename || 'SVG Result'}
        className="w-full h-full object-contain"
      />
    </div>
  )
}