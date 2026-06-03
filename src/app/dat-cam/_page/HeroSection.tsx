import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronRight,
  CheckCircle2,
  PhoneCall,
  MessageCircle,
  ClipboardList,
  Leaf,
  Sprout,
} from 'lucide-react'
import { ORANGE, ZALO_LINK, PHONE } from './constants'

const containerClass = 'max-w-6xl mx-auto px-4 md:px-6'
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition'
const secondaryBtn =
  'inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 transition'

export function HeroSection() {
  return (
    <section className="bg-orange-50/20">
      <div className={`${containerClass} pt-10`}>
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr,1fr] gap-8 items-center">
          <div>
            <p className="text-xs md:text-sm tracking-wide uppercase text-orange-600 font-semibold">
              Cam sành hữu cơ • Thu hoạch theo ngày • Giao tận nhà
            </p>

            <h1 className="mt-3 text-3xl md:text-4xl font-bold leading-tight text-slate-900">
              Đặt Cam Sành Hữu Cơ – Giao Tận Nhà
            </h1>

            <p className="mt-4 text-slate-600 max-w-prose">
              Cam từ vườn Vĩnh Long, chăm sóc theo hướng hữu cơ – ưu tiên hệ sinh thái tự nhiên
              (kiến vàng), hạn chế tối đa hóa chất. Đặt nhanh, chọn gói phù hợp, giao tận nơi.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm">
                  <Leaf className="w-3.5 h-3.5 text-orange-500" />
                </span>
                Canh tác sạch, minh bạch
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm">
                  <Sprout className="w-3.5 h-3.5 text-orange-500" />
                </span>
                Thu hoạch theo ngày
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Chọn trái kỹ, đóng gói chắc tay, hạn chế dập.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Giao khu vực miền Tây, TP.HCM và vùng lân cận.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Có hỗ trợ đổi/hoàn nếu hàng hư theo ảnh.</span>
              </li>
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href={`tel:${PHONE}`} className={primaryBtn}>
                <PhoneCall className="w-4 h-4" />
                Gọi đặt nhanh
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
              <a href="#form-dat-cam" className={secondaryBtn}>
                <ClipboardList className="w-4 h-4" />
                Đặt online
                <ChevronRight className="w-4 h-4" />
              </a>

              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:underline"
              >
                Xem sản phẩm
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative w-full max-w-md mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-md ring-4 ring-orange-100/70 bg-white border border-orange-100">
              <Image
                src="/images/dat-cam/hero.png"
                alt="Cam sành hữu cơ từ vườn"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 420px"
              />
            </div>

            <div className="absolute -bottom-4 left-6 hidden md:flex items-center gap-2 rounded-xl bg-white/85 backdrop-blur px-4 py-2 shadow-sm border border-orange-100 text-xs text-slate-700">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: ORANGE }}
                aria-hidden
              />
              Thu hoạch theo ngày • Giao tận nhà
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
