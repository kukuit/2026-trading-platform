'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Camera, Loader2, Pencil, Plus, UserCheck, UserPlus, UserX, X } from 'lucide-react'
import { money } from '@/lib/serializers'
import { USD_TO_VND_RATE } from '@/config/currency'
import type { User } from './types'
import { DEFAULT_STARTING_BALANCE_VND, formatUsdInput } from './utils'
import { EmptyRow, Input, Td, Th } from './ui'
import { UserStrategyDetails } from './UserStrategyDetails'

export function CreateUserModal({
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  isPending: boolean
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [startingBalanceUsd, setStartingBalanceUsd] = useState(
    formatUsdInput(Number(DEFAULT_STARTING_BALANCE_VND) / USD_TO_VND_RATE),
  )
  const [startingBalanceVnd, setStartingBalanceVnd] = useState(DEFAULT_STARTING_BALANCE_VND)
  const [validationError, setValidationError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const startingBalance = Number(form.get('startingBalance') ?? 0)

    if (!name) {
      event.preventDefault()
      setValidationError('Name is required.')
      return
    }

    if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
      event.preventDefault()
      setValidationError('USD must be greater than 0.')
      return
    }

    setValidationError('')
    onSubmit(event)
  }

  const handleUsdChange = (value: string) => {
    setStartingBalanceUsd(value)
    const numericValue = Number(value)
    setStartingBalanceVnd(
      Number.isFinite(numericValue) && numericValue > 0
        ? String(Math.round(numericValue * USD_TO_VND_RATE))
        : '',
    )
  }

  const handleVndChange = (value: string) => {
    setStartingBalanceVnd(value)
    const numericValue = Number(value)
    setStartingBalanceUsd(
      Number.isFinite(numericValue) && numericValue > 0
        ? formatUsdInput(numericValue / USD_TO_VND_RATE)
        : '',
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Create User
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">New trading account</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close create user modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Input name="name" placeholder="Name" required />
          <Input name="description" placeholder="Description" />
          <AvatarField name="avatar" />
          <StrategyFields />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                USD
              </label>
              <Input
                name="startingBalance"
                placeholder="Starting balance"
                type="number"
                min="0.01"
                step="0.01"
                value={startingBalanceUsd}
                onChange={(event) => handleUsdChange(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                VND
              </label>
              <Input
                placeholder="Amount in VND"
                type="number"
                min="0"
                step="1000"
                value={startingBalanceVnd}
                onChange={(event) => handleVndChange(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            1 USD = {new Intl.NumberFormat('vi-VN').format(USD_TO_VND_RATE)} VND
          </p>
        </div>

        {(validationError || error) && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {validationError || error}
          </p>
        )}

        <button
          disabled={isPending}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Create User
        </button>
      </form>
    </div>
  )
}

export function EditUserModal({
  user,
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  user: User
  isPending: boolean
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [validationError, setValidationError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()

    if (!name) {
      event.preventDefault()
      setValidationError('Name is required.')
      return
    }

    setValidationError('')
    onSubmit(event)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Edit User</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Trading account</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close edit user modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Input name="name" placeholder="Name" defaultValue={user.name} required />
          <Input
            name="description"
            placeholder="Description"
            defaultValue={user.description ?? ''}
          />
          <AvatarField name="avatar" currentAvatar={user.avatar} fallbackName={user.name} />
          <StrategyFields
            idPrefix="edit-"
            maxCoinCount={user.strategy?.maxCoinCount ?? ''}
            coinSelectionRule={user.strategy?.coinSelectionRule ?? ''}
            buyRule={user.strategy?.buyRule ?? ''}
            sellRule={user.strategy?.sellRule ?? ''}
          />
        </div>

        {(validationError || error) && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {validationError || error}
          </p>
        )}

        <button
          disabled={isPending}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
          Save User
        </button>
      </form>
    </div>
  )
}

export function UserPickerModal({
  users,
  selectedUserId,
  isLoading,
  isStatusPending,
  onSelect,
  onToggleStatus,
  onCreateUser,
  onEditUser,
  onClose,
}: {
  users: User[]
  selectedUserId: string
  isLoading: boolean
  isStatusPending: boolean
  onSelect: (userId: string) => void
  onToggleStatus: (user: User) => void
  onCreateUser: () => void
  onEditUser: (userId: string) => void
  onClose: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'disabled'>('active')
  const filteredUsers = users.filter((user) =>
    statusFilter === 'active' ? user.status === 1 : user.status === 0,
  )
  const visibleUsers = [...filteredUsers].sort((a, b) => {
    if (a.id === selectedUserId) return -1
    if (b.id === selectedUserId) return 1
    return 0
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="w-full max-w-3xl rounded border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Select User
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Trading accounts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close user picker"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCreateUser}
            className="inline-flex h-9 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
          >
            <UserPlus size={15} />
            Create User
          </button>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700" htmlFor="user-status-filter">
              Status
            </label>
            <select
              id="user-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as 'active' | 'disabled')
              }
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-teal-700"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <Th>User</Th>
                <Th>Strategy</Th>
                <Th className="text-right">Cash</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <EmptyRow colSpan={4} text="Loading users." />}
              {!isLoading &&
                visibleUsers.map((user) => {
                  const isSelected = user.id === selectedUserId
                  const isActive = user.status === 1
                  return (
                    <tr
                      key={user.id}
                      className={`border-t ${
                        isSelected
                          ? 'border-teal-200 bg-teal-50/80'
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <div>
                              <span className="font-semibold text-slate-950">{user.name}</span>
                              {isSelected && (
                                <span className="ml-2 rounded bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">
                                  Selected
                                </span>
                              )}
                            </div>
                            {user.description && (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {user.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td className="min-w-64 text-slate-600">
                        <UserStrategyDetails user={user} />
                      </Td>
                      <Td className="text-right">{money(user.currentBalance)}</Td>
                      <Td className="min-w-32">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className={`inline-flex h-8 w-8 items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-50 ${
                              isActive
                                ? 'border border-rose-200 bg-white text-rose-700 hover:border-rose-400'
                                : 'border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400'
                            }`}
                            disabled={isStatusPending}
                            onClick={() => onToggleStatus(user)}
                            type="button"
                            aria-label={isActive ? `Disable ${user.name}` : `Activate ${user.name}`}
                            title={isActive ? 'Disable' : 'Activate'}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:border-teal-700 hover:text-teal-700"
                            onClick={() => onEditUser(user.id)}
                            type="button"
                            aria-label={`Edit ${user.name}`}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="h-8 rounded bg-teal-700 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSelected || !isActive}
                            onClick={() => onSelect(user.id)}
                            type="button"
                          >
                            Select
                          </button>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              {!isLoading && !visibleUsers.length && (
                <EmptyRow colSpan={4} text={`No ${statusFilter} users available.`} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AvatarField({
  name,
  currentAvatar,
  fallbackName = '',
}: {
  name: string
  currentAvatar?: string | null
  fallbackName?: string
}) {
  const [preview, setPreview] = useState(currentAvatar ?? '')
  const [previewObjectUrl, setPreviewObjectUrl] = useState('')

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    }
  }, [previewObjectUrl])

  return (
    <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={preview} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
            {initials(fallbackName) || <Camera size={18} />}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Avatar
        </label>
        <Input
          accept="image/png,image/jpeg"
          className="pt-1.5"
          name={name}
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
            if (!file) {
              setPreviewObjectUrl('')
              setPreview(currentAvatar ?? '')
              return
            }

            const nextPreview = URL.createObjectURL(file)
            setPreviewObjectUrl(nextPreview)
            setPreview(nextPreview)
          }}
        />
        <p className="mt-1 text-xs text-slate-500">PNG or JPG, 1:1 ratio, max 2MB.</p>
      </div>
    </div>
  )
}

function UserAvatar({ user }: { user: User }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-full w-full object-cover" src={user.avatar} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
          {initials(user.name)}
        </div>
      )}
    </div>
  )
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function StrategyFields({
  idPrefix = '',
  maxCoinCount = '',
  coinSelectionRule = '',
  buyRule = '',
  sellRule = '',
}: {
  idPrefix?: string
  maxCoinCount?: number | string
  coinSelectionRule?: string
  buyRule?: string
  sellRule?: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          htmlFor={`${idPrefix}max-coin-count`}
        >
          Max coin count
        </label>
        <Input
          id={`${idPrefix}max-coin-count`}
          name="maxCoinCount"
          placeholder="Max coin count"
          inputMode="numeric"
          defaultValue={maxCoinCount}
        />
      </div>
      <LabeledTextInput
        id={`${idPrefix}coin-selection-rule`}
        name="coinSelectionRule"
        label="Coin selection rule"
        defaultValue={coinSelectionRule}
      />
      <LabeledTextInput
        id={`${idPrefix}buy-rule`}
        name="buyRule"
        label="Buy rule"
        defaultValue={buyRule}
      />
      <LabeledTextInput
        id={`${idPrefix}sell-rule`}
        name="sellRule"
        label="Sell rule"
        defaultValue={sellRule}
      />
    </div>
  )
}

function LabeledTextInput({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string
  name: string
  label: string
  defaultValue?: string
}) {
  return (
    <div>
      <label
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        htmlFor={id}
      >
        {label}
      </label>
      <Input id={id} name={name} defaultValue={defaultValue} />
    </div>
  )
}
