import { CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react'

const containerClass = 'max-w-6xl mx-auto px-4 md:px-6'
const cardBase = 'rounded-3xl border border-orange-100 bg-white shadow-sm p-6 md:p-7'
const iconBadge =
  'inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 border border-orange-100'

export function TrustFaqSection() {
  return (
    <section className="bg-white">
      <div className={`${containerClass}`}>
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <div className={cardBase}>
            <div className="flex items-center gap-3">
              <span className={iconBadge}>
                <ShieldCheck className="w-4 h-4 text-orange-600" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Vì sao nên đặt cam từ vườn?</h2>
            </div>

            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Tươi hơn: thu hoạch theo ngày, giao nhanh.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Chọn kỹ: phân loại rõ ràng, đóng gói chắc tay.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Minh bạch: có nhật ký chăm sóc, ưu tiên sinh học.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 mt-0.5" />
                <span>Phù hợp: ăn tươi, vắt nước, hoặc làm quà biếu.</span>
              </li>
            </ul>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-3">
              <span className={iconBadge}>
                <HelpCircle className="w-4 h-4 text-orange-600" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Câu hỏi thường gặp</h2>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Cam có ngọt không?</p>
                <p className="mt-1 text-slate-600">
                  Cam sành thường ngọt thanh, chua dịu. Vị có thể thay đổi nhẹ theo lứa thu hoạch.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Bảo quản được bao lâu?</p>
                <p className="mt-1 text-slate-600">
                  Ở nhiệt độ phòng mát: 3–5 ngày. Để ngăn mát: khoảng 7–10 ngày (tùy độ chín).
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Hàng bị dập/hư thì sao?</p>
                <p className="mt-1 text-slate-600">
                  Bạn chụp ảnh tình trạng cam trong ngày nhận hàng, mình sẽ hỗ trợ đổi/hoàn nhanh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
