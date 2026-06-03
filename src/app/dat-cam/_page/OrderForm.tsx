'use client'

import { useEffect, useMemo, useState } from 'react'
import { PhoneCall, MessageCircle, CheckCircle2 } from 'lucide-react'
import { PHONE, ZALO_LINK } from './constants'

type OrangeTypeKey = 'type1' | 'type2'
type PackageKey = '5kg' | '10kg' | '20kg' | 'other'
type PaymentKey = 'cod' | 'bank'

type PricingPickEvent = {
  orangeType?: OrangeTypeKey
  packageKey?: PackageKey
}

type OrderFormState = {
  name: string
  phone: string
  address: string

  orangeType: OrangeTypeKey

  packageKey: PackageKey
  otherKg: string

  time: string
  note: string
  payment: PaymentKey
}

const containerClass = 'max-w-6xl mx-auto px-4 md:px-6'
const inputBase =
  'w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-orange-100/70 focus:border-orange-300'
const labelClass = 'text-xs font-semibold text-slate-700'
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition disabled:opacity-60 disabled:cursor-not-allowed'
const secondaryBtn =
  'inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 transition'

const PRICE_PER_KG: Record<OrangeTypeKey, number> = {
  type1: 36000,
  type2: 27000,
}

function formatVND(v: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(v))}₫`
}

function computeKg(packageKey: PackageKey, otherKg: string) {
  if (packageKey === '5kg') return 5
  if (packageKey === '10kg') return 10
  if (packageKey === '20kg') return 20

  const raw = (otherKg || '').trim()
  if (!raw) return null
  if (!/^\d+(\.\d+)?$/.test(raw)) return null
  const kg = Number(raw)
  if (!Number.isFinite(kg) || kg <= 0) return null
  return kg
}

const initialForm: OrderFormState = {
  name: '',
  phone: '',
  address: '',

  orangeType: 'type1',

  packageKey: '10kg',
  otherKg: '',

  time: '',
  note: '',
  payment: 'cod',
}

export function OrderForm() {
  const [form, setForm] = useState<OrderFormState>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // honeypot (bot hay tự điền). input hidden này user thường không thấy/không điền
  const [hp, setHp] = useState('')

  // listen event từ PricingSection
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<PricingPickEvent>

      setForm((prev) => {
        const next: OrderFormState = { ...prev }

        if (detail.orangeType) next.orangeType = detail.orangeType
        if (detail.packageKey) {
          next.packageKey = detail.packageKey
          if (detail.packageKey !== 'other') next.otherKg = ''
        }

        return next
      })
    }

    window.addEventListener('pricing:pick', handler)
    return () => window.removeEventListener('pricing:pick', handler)
  }, [])

  const unitPrice = useMemo(() => PRICE_PER_KG[form.orangeType], [form.orangeType])
  const kg = useMemo(
    () => computeKg(form.packageKey, form.otherKg),
    [form.packageKey, form.otherKg]
  )
  const totalPrice = useMemo(() => (kg ? kg * unitPrice : 0), [kg, unitPrice])

  const orderSummary = useMemo(() => {
    const pkg =
      form.packageKey === 'other'
        ? `${form.otherKg || '...'}kg`
        : form.packageKey.replace('kg', ' kg')
    const pay = form.payment === 'cod' ? 'COD' : 'Chuyển khoản'
    const typeLabel = form.orangeType === 'type1' ? 'Loại I' : 'Loại II'
    return `${typeLabel} | ${pkg} | ${pay} | ${kg ? formatVND(totalPrice) : '...'}`
  }, [form.orangeType, form.packageKey, form.otherKg, form.payment, kg, totalPrice])

  const validate = () => {
    if (!form.name.trim()) return 'Vui lòng nhập họ tên.'
    if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại.'
    if (!form.address.trim()) return 'Vui lòng nhập địa chỉ.'

    if (form.packageKey === 'other') {
      if (!form.otherKg.trim()) return 'Vui lòng nhập số kg muốn đặt.'
      if (!kg) return 'Số kg không hợp lệ.'
    }

    return null
  }

  const submit = async () => {
    const err = validate()
    if (err) {
      alert(err)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/mktonline-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hp: hp || '',
          // không bắt buộc gửi totalPrice lên server (server nên tự tính)
          // nhưng nếu bạn muốn debug UI thì có thể thêm clientPreview:
          // clientPreview: { unitPrice, kg: kg ?? null, totalPrice: kg ? totalPrice : null },
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.ok) {
        alert(data?.message || 'Gửi đơn thất bại. Vui lòng thử lại.')
        return
      }

      alert('Đã nhận đơn! Mình sẽ liên hệ xác nhận sớm nhé.')
      setForm(initialForm)
      setHp('')
    } catch (e: any) {
      alert(e?.message || 'Server error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="form-dat-cam" className="bg-white">
      <div className={`${containerClass} py-12 md:py-16`}>
        <div className="max-w-3xl mx-auto rounded-3xl border border-orange-100 bg-white shadow-sm p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Đặt cam online</h2>
              <p className="mt-2 text-slate-600 text-sm">
                Điền thông tin, chọn loại cam & combo. Mình sẽ gọi lại xác nhận trước khi giao.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={`tel:${PHONE}`} className={secondaryBtn}>
                <PhoneCall className="w-4 h-4" />
                Gọi nhanh
              </a>
              <a
                href={ZALO_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryBtn}
              >
                <MessageCircle className="w-4 h-4" />
                Nhắn Zalo
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className={labelClass}>Họ tên</p>
              <input
                className={inputBase}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ví dụ: Anh Hùng"
              />
            </div>

            <div>
              <p className={labelClass}>Số điện thoại</p>
              <input
                className={inputBase}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Ví dụ: 09xx xxx xxx"
                inputMode="tel"
              />
            </div>

            <div className="md:col-span-2">
              <p className={labelClass}>Địa chỉ nhận hàng</p>
              <input
                className={inputBase}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Số nhà, đường, xã/phường, quận/huyện, tỉnh/thành"
              />
            </div>

            <div>
              <p className={labelClass}>Chọn loại cam</p>
              <select
                className={inputBase}
                value={form.orangeType}
                onChange={(e) =>
                  setForm((p) => ({ ...p, orangeType: e.target.value as OrangeTypeKey }))
                }
              >
                <option value="type1">Cam Sành Hữu Cơ Loại I - 36.000₫/kg</option>
                <option value="type2">Cam Sành Hữu Cơ Loại II - 27.000₫/kg</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Đơn giá hiện tại:{' '}
                <span className="font-medium text-slate-700">{formatVND(unitPrice)}/kg</span>
              </p>
            </div>

            <div>
              <p className={labelClass}>Chọn gói</p>
              <select
                className={inputBase}
                value={form.packageKey}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    packageKey: e.target.value as PackageKey,
                    otherKg: e.target.value === 'other' ? p.otherKg : '',
                  }))
                }
              >
                <option value="5kg">Combo 5kg</option>
                <option value="10kg">Combo 10kg</option>
                <option value="20kg">Combo 20kg</option>
                <option value="other">Khác (nhập số kg)</option>
              </select>

              {form.packageKey === 'other' && (
                <div className="mt-2">
                  <input
                    className={inputBase}
                    value={form.otherKg}
                    onChange={(e) => setForm((p) => ({ ...p, otherKg: e.target.value }))}
                    placeholder="Ví dụ: 12"
                    inputMode="decimal"
                  />
                  <p className="mt-1 text-xs text-slate-500">Nhập số kg bạn muốn đặt.</p>
                </div>
              )}
            </div>

            <div>
              <p className={labelClass}>Thời gian nhận (tuỳ chọn)</p>
              <input
                className={inputBase}
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                placeholder="Ví dụ: Chiều 3–5h"
              />
            </div>

            <div>
              <p className={labelClass}>Thanh toán</p>
              <select
                className={inputBase}
                value={form.payment}
                onChange={(e) => setForm((p) => ({ ...p, payment: e.target.value as PaymentKey }))}
              >
                <option value="cod">COD (nhận hàng trả tiền)</option>
                <option value="bank">Chuyển khoản</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <p className={labelClass}>Ghi chú (tuỳ chọn)</p>
              <textarea
                className={`${inputBase} min-h-[96px]`}
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Ví dụ: Giao giờ hành chính, lựa trái đều…"
              />
            </div>

            {/* honeypot hidden */}
            <div className="hidden">
              <input value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>
          </div>

          {/* summary + total */}
          <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/40 p-4 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Tóm tắt đơn</p>
                <p className="mt-1 text-slate-700 break-words">{orderSummary}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">
                    Tạm tính ={' '}
                    <span className="font-medium text-slate-800">
                      kg × {formatVND(unitPrice)}/kg
                    </span>
                  </p>
                  <p className="text-base font-bold text-orange-700">
                    {kg ? formatVND(totalPrice) : 'Chưa xác định'}
                  </p>
                </div>

                {!kg && form.packageKey === 'other' ? (
                  <p className="mt-2 text-xs text-slate-600">
                    *Vui lòng nhập số kg hợp lệ để hiển thị tổng tạm tính.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting}
              className={`${primaryBtn} w-full justify-center`}
            >
              {isSubmitting ? 'Đang gửi…' : 'Xác nhận đặt hàng'}
            </button>

            <a
              href={ZALO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={`${secondaryBtn} w-full justify-center`}
            >
              <MessageCircle className="w-4 h-4" />
              Nhắn Zalo nhanh
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
