// app/components/NavbarLeft.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import {
  Briefcase,
  HeartPulse,
  ListTodo,
  Wallet,
  AArrowUp,
  Laptop,
  Laptop2,
  LaptopIcon,
  DollarSign,
  CircleDollarSign,
  Volleyball,
  PiggyBank,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
}

const ITEMS: NavItem[] = [
  { href: '/worklog', label: 'Landing Page', icon: Laptop },
  { href: '/healthlog', label: 'Email Template', icon: HeartPulse },
  { href: '/todolist', label: 'eDetailing', icon: ListTodo },
  { href: '/money', label: 'Mini Game', icon: PiggyBank },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  // Đóng menu khi click trên mobile (<= sm)
  const handleClick = () => {
    if (typeof window === 'undefined') return
    const isMobile = window.matchMedia('(max-width: 639px)').matches
    if (!isMobile) return
    const cb = document.getElementById('nav-toggle') as HTMLInputElement | null
    if (cb) cb.checked = false
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={[
        'relative w-full sm:h-[60px] py-2',
        'flex flex-col items-center justify-center gap-0.5',
        'text-center text-gray-700 hover:text-indigo-600',
        active ? 'text-indigo-600 font-medium' : '',
      ].join(' ')}
    >
      {/* line trái sát mép */}
      <span
        className={[
          'hidden sm:block absolute left-0 top-1/2 -translate-y-1/2',
          'w-[3px] h-8 rounded-r',
          active ? 'bg-indigo-600' : 'bg-transparent',
        ].join(' ')}
        aria-hidden="true"
      />
      <Icon className="w-6 h-6" strokeWidth={2} />
      <span className="text-[11px] leading-none">{item.label}</span>
    </Link>
  )
}

export default function NavbarLeft() {
  const pathname = usePathname() || '/'

  return (
    <aside
      className={[
        // Mobile off-canvas (panel rộng cố định)
        'fixed inset-y-0 left-0 z-50 w-64 p-3 bg-gray-100 border-r',
        'transform -translate-x-full transition-transform duration-200 peer-checked:translate-x-0',
        // Desktop: khóa width cứng 72px
        'sm:static sm:translate-x-0 sm:w-[72px] sm:min-w-[72px] sm:max-w-[72px] sm:px-0 sm:py-2 shrink-0',
        'flex flex-col items-center',
      ].join(' ')}
    >
      {/* header mobile */}
      <div className="w-full flex items-center justify-between sm:hidden mb-1">
        <div className="text-xs font-medium text-gray-700"></div>
        <label
          htmlFor="nav-toggle"
          aria-label="Close menu"
          className="inline-grid place-items-center w-8 h-8 rounded-md hover:bg-gray-200"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-700">
            <path
              fill="currentColor"
              d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </label>
      </div>

      {/* nav */}
      <nav className="w-full sm:w-full sm:flex sm:flex-col sm:items-stretch sticky top-0">
        <div className="grid grid-cols-1 gap-1 sm:gap-1 w-full">
          {ITEMS.map((it) => (
            <NavButton key={it.href} item={it} active={isActive(pathname, it.href)} />
          ))}
        </div>
      </nav>
    </aside>
  )
}
