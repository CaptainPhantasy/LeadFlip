"use client"

import * as React from "react"
import { Moon, Sun, Sunset, Sparkles, Leaf, Droplet } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Standard Themes</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("warm")}>
          <Sunset className="mr-2 h-4 w-4" />
          Warm
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Bubble Tea Themes</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("taro")}>
          <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
          Taro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("matcha")}>
          <Leaf className="mr-2 h-4 w-4 text-green-600" />
          Matcha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("honeydew")}>
          <Droplet className="mr-2 h-4 w-4 text-lime-500" />
          Honeydew
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
