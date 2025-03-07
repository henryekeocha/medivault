import { FileHeart } from "lucide-react"

interface LogoProps {
  theme?: string
}

export function Logo({ theme = "light" }: LogoProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <FileHeart className="h-8 w-8 text-primary" strokeWidth={2} />
        <div className="absolute inset-0 bg-primary/20 rounded-lg"></div>
      </div>
      <span className={`text-xl font-bold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>MediVault</span>
    </div>
  )
} 