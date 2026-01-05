import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Background Removal App',
  description: 'Remove background from images using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
