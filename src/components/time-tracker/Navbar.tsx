import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { BriefcaseBusiness, LogOut, Moon, Sun, UserCircle } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { applyTheme, getStoredTheme } from '#/lib/theme'
import type { ThemeMode } from '#/lib/theme'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { Workspace } from '#/lib/time-tracker/types'

export function Navbar({
  workspace,
  user,
}: {
  workspace: Workspace
  user: { id: string; name: string; email: string }
}) {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<ThemeMode>('light')

  useEffect(() => {
    setTheme(getStoredTheme())
    function onThemeChange(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail
      if (detail === 'light' || detail === 'dark') setTheme(detail)
    }
    window.addEventListener('theme-change', onThemeChange)
    return () => window.removeEventListener('theme-change', onThemeChange)
  }, [])

  function toggleTheme(): void {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
  }

  const handleSignOut = () => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => void navigate({ to: '/auth' }),
      },
    })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          to="/app/time-tracker"
          className="flex items-center gap-3 no-underline"
        >
          <img
            src="/logo192.png"
            alt=""
            className="h-9 w-9 rounded-lg bg-card"
          />
          <div className="hidden sm:block">
            <p className="m-0 text-sm font-bold text-foreground">Flow Track</p>
            <p className="m-0 text-xs text-muted-foreground">
              Internal workspace tracking
            </p>
          </div>
        </Link>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Workspace indicator - borderless ghost button */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden items-center gap-2 text-foreground sm:inline-flex"
            asChild
          >
            <Link to="/app/workspace/settings">
              <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{workspace.name}</span>
            </Link>
          </Button>

          {/* Theme toggle - icon only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Profile dropdown - icon only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Profile"
                className="text-muted-foreground hover:text-foreground"
              >
                <UserCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs font-normal text-muted-foreground truncate">
                  {user.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/profile">Profile settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sign out - icon only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign out"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
