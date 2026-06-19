import type { InputHTMLAttributes, ReactNode } from 'react'
import type { SortDirection } from './types'

export function Metric({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          positive === undefined ? 'text-slate-950' : positive ? 'text-emerald-700' : 'text-rose-700'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-700 ${props.className ?? ''}`}
    />
  )
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>
}

export function SortableTh({
  align = 'left',
  active,
  children,
  direction,
  onClick,
}: {
  align?: 'left' | 'right'
  active: boolean
  children: ReactNode
  direction: SortDirection
  onClick: () => void
}) {
  return (
    <th className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        className={`inline-flex items-center gap-1 font-semibold ${
          align === 'right' ? 'justify-end text-right' : 'text-left'
        }`}
        onClick={onClick}
      >
        {children}
        <span className={`text-[10px] ${active ? 'text-teal-700' : 'text-slate-400'}`}>
          {active ? (direction === 'asc' ? 'ASC' : 'DESC') : 'SORT'}
        </span>
      </button>
    </th>
  )
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {text}
      </td>
    </tr>
  )
}
