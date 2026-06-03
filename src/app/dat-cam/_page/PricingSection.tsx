'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { CreditCard, Package, Truck, CheckCircle2, Dot } from 'lucide-react'

const containerClass = 'max-w-6xl mx-auto px-4 md:px-6'
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition'
const cardBase = 'rounded-3xl border border-orange-100 bg-white shadow-sm p-6 md:p-7'

type OrangeTypeKey = 'type1' | 'type2'
type PackageKey = '5kg' | '10kg' | '20kg' | 'other'

type PricingPickEvent = {
  orangeType?: OrangeTypeKey
  packageKey?: PackageKey
}

const ORANGE_TYPES: Array<{
  key: OrangeTypeKey
  title: string
  subtitle: string
  pricePerKg: number
  image: string
}> = [
  {
    key: 'type1',
    title: 'Cam Sành Hữu Cơ Loại I',
    subtitle: 'Vỏ đẹp – hợp biếu tặng',
    pricePerKg: 36000,
    image: '/images/dat-cam/orange-type-1.png',
  },
  {
    key: 'type2',
    title: 'Cam Sành Hữu Cơ Loại II',
    subtitle: 'Ngon để ăn/vắt nước',
    pricePerKg: 27000,
    image: '/images/dat-cam/orange-type-2.png',
  },
]

const COMBOS: Array<{
  key: Exclude<PackageKey, 'other'>
  title: string
  kg: number
  desc: string
}> = [
  { key: '5kg', title: 'Combo 5kg', kg: 5, desc: 'Gọn nhẹ – dùng thử/nhà ít người' },
  { key: '10kg', title: 'Combo 10kg', kg: 10, desc: 'Phổ biến nhất – tối ưu chi phí' },
  { key: '20kg', title: 'Combo 20kg', kg: 20, desc: 'Gia đình đông/đặt chung' },
]

function formatVND(v: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(v))}₫`
}

function emitPick(detail: PricingPickEvent) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<PricingPickEvent>('pricing:pick', { detail }))
}

export function PricingSection() {
  const [orangeType, setOrangeType] = useState<OrangeTypeKey>('type1')

  const selected = useMemo(
    () => ORANGE_TYPES.find((x) => x.key === orangeType) || ORANGE_TYPES[0],
    [orangeType]
  )

  const onPickOrange = (key: OrangeTypeKey) => {
    setOrangeType(key)
    emitPick({ orangeType: key })
  }

  const onPickCombo = (pkg: Exclude<PackageKey, 'other'>) => {
    // gửi cả loại cam + combo để form sync chắc chắn
    emitPick({ orangeType, packageKey: pkg })
    document.querySelector('#form-dat-cam')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="bg-orange-50/15">
      <div className={`${containerClass} py-12 md:py-16`}>
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Giá & Combo</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Chọn <span className="font-medium text-slate-800">1 trong 2 loại cam</span> (Loại I/II),
            hệ thống sẽ tự tính giá cho các combo bên dưới.
          </p>
        </div>

        {/* chọn loại cam */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {ORANGE_TYPES.map((t) => {
            const active = t.key === orangeType
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onPickOrange(t.key)}
                className={[
                  'text-left rounded-3xl overflow-hidden border shadow-sm transition focus:outline-none',
                  active
                    ? 'border-orange-200 ring-4 ring-orange-100/70 bg-orange-50/40'
                    : 'border-orange-100 bg-white hover:bg-orange-50/20',
                ].join(' ')}
              >
                <div className="grid grid-cols-[110px,1fr] gap-4 p-5">
                  <div className="relative w-[110px] h-[84px] rounded-2xl overflow-hidden border border-orange-100 bg-orange-50">
                    <Image
                      src={t.image}
                      alt={t.title}
                      fill
                      className="object-cover"
                      sizes="110px"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{t.subtitle}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-orange-700">
                          {formatVND(t.pricePerKg)}/kg
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                          {active ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-orange-600" />
                              Đang chọn
                            </>
                          ) : (
                            <>
                              <Dot className="w-5 h-5 text-slate-400" />
                              Chọn
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600">
                      Giá combo bên dưới sẽ tính theo{' '}
                      <span className="font-medium text-slate-800">
                        ({formatVND(selected.pricePerKg)}/kg)
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* combo */}
        <div className="mt-10 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700">
            <Package className="w-4 h-4" />
            Đang tính theo: {selected.title} • {formatVND(selected.pricePerKg)}/kg
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {COMBOS.map((c) => {
            const total = c.kg * selected.pricePerKg
            return (
              <div key={c.key} className={cardBase}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{c.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-700">{formatVND(total)}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {c.kg}kg × {formatVND(selected.pricePerKg)}/kg
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPickCombo(c.key)}
                  className={`${primaryBtn} mt-5 w-full justify-center`}
                >
                  Chọn combo này
                </button>
              </div>
            )
          })}
        </div>

        {/* vận chuyển & thanh toán */}
        <div className="mt-8 rounded-3xl border border-orange-100 bg-white shadow-sm p-6 md:p-7">
          <h3 className="text-sm font-semibold text-slate-900">Vận chuyển & thanh toán</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
            <div className="flex gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 border border-orange-100">
                <Truck className="w-4 h-4 text-orange-600" />
              </span>
              <div>
                <p className="font-medium">Giao hàng</p>
                <p className="mt-0.5 text-xs text-slate-600">Phí ship tùy khu vực, sẽ báo trước.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 border border-orange-100">
                <Package className="w-4 h-4 text-orange-600" />
              </span>
              <div>
                <p className="font-medium">Hẹn giờ nhận</p>
                <p className="mt-0.5 text-xs text-slate-600">Bạn có thể ghi chú thời gian nhận.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 border border-orange-100">
                <CreditCard className="w-4 h-4 text-orange-600" />
              </span>
              <div>
                <p className="font-medium">Thanh toán</p>
                <p className="mt-0.5 text-xs text-slate-600">COD hoặc chuyển khoản.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          *Bạn có thể đổi lựa chọn Loại I/II ở trên, giá combo sẽ tự cập nhật.
        </p>
      </div>
    </section>
  )
}
