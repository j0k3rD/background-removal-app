"use client"

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface ImageCompareProps {
  leftImage: string
  rightImage: string
  leftLabel?: string
  rightLabel?: string
}

export function ImageCompare({ leftImage, rightImage, leftLabel = 'Original', rightLabel = 'Procesado' }: ImageCompareProps) {
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(percentage)
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
        setPosition(percentage)
      }
    }

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
      window.addEventListener('mousemove', handleGlobalMouseMove)
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-96 overflow-hidden rounded-lg border bg-gray-900/5 dark:bg-gray-50/5 select-none touch-none outline-none cursor-ew-resize"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => {
        handleMouseDown()
        handleMove(e)
      }}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleMove}
    >
      <div className="absolute inset-0">
        <img
          src={rightImage}
          alt={rightLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={leftImage}
          alt={leftLabel}
          className="h-full w-auto object-contain max-w-none"
          style={{ width: `${containerRef.current?.clientWidth || 0}px` }}
          draggable={false}
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize z-10"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-gray-600" />
            <div className="w-0.5 h-3 bg-gray-600" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs font-medium">
        {leftLabel}
      </div>
      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs font-medium">
        {rightLabel}
      </div>
    </div>
  )
}