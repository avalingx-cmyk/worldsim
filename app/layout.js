import './globals.css'

export const metadata = {
  title: 'WorldSim-1 — A Living Digital World',
  description: 'A persistent 48-hour AI civilization simulation. Watch people live, love, build, and die in real time.',
  openGraph: {
    title: 'WorldSim-1',
    description: 'A living digital world powered by AI. Anything can happen.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ backgroundColor: '#05050a', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
