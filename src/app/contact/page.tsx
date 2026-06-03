'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { Phone, MessageCircle, Facebook, MapPin, Send, ShoppingCart } from 'lucide-react'

const containerClass = 'max-w-6xl mx-auto px-4 md:px-6'

// cubic-bezier để hợp TypeScript
const easeOutExpo = [0.16, 1, 0.3, 1] as const

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutExpo },
  },
}

const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: sau này gọi API / gửi email ở đây
    setTimeout(() => {
      alert('Đã gửi thông tin đặt hàng! Chúng tôi sẽ liên hệ lại sớm nhất.')
      setIsSubmitting(false)
      ;(e.target as HTMLFormElement).reset()
    }, 800)
  }

  return (
    <main className="bg-white">
      {/* HERO / INFO */}
      <section className="bg-orange-50/20 border-b border-orange-100">
        <div className={`${containerClass} py-10`}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <p className="text-xs md:text-sm tracking-wide uppercase text-orange-600 font-semibold">
              Liên hệ & đặt cam sành hữu cơ
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
              Đặt cam sành hữu cơ trực tiếp với vườn
            </h1>
            <p className="mt-4 text-slate-600">
              Bạn có thể gọi điện, nhắn Zalo, Facebook hoặc điền form đặt online bên dưới. Chúng tôi
              sẽ xác nhận đơn hàng, tư vấn loại cam phù hợp và sắp xếp giao trong thời gian sớm
              nhất.
            </p>
          </motion.div>

          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl"
          >
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-white/90 p-4 flex items-start gap-3"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
                <Phone className="w-4 h-4 text-orange-600" />
              </span>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Gọi trực tiếp</p>
                <p className="mt-1">SĐT: 0981 353 619 (Diễm)</p>
                <p className="mt-1">SĐT: 0838 222 902 (Khang)</p>
                <p className="mt-1 text-xs text-slate-500">
                  Thời gian: 7h30 – 21h00 (tất cả các ngày trong tuần)
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-white/90 p-4 flex items-start gap-3"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
                <MessageCircle className="w-4 h-4 text-orange-600" />
              </span>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Zalo / Chat</p>
                <p className="mt-1">Zalo: 0981 353 619 (Diễm)</p>
                <p className="mt-1">Zalo: 0932 912 524 (Khang)</p>
                <p className="mt-1 text-xs text-slate-500">
                  Nhắn tin để nhận bảng giá mới nhất & hình ảnh sản phẩm.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-white/90 p-4 flex items-start gap-3"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
                <Facebook className="w-4 h-4 text-orange-600" />
              </span>
              <div className="text-sm text-slate-700">
                <p className="font-semibold">Fanpage Facebook</p>
                <p className="mt-1">fb.com/camhuuco</p>
                <p className="mt-1 text-xs text-slate-500">
                  Bạn có thể inbox để đặt hàng hoặc xem thêm hình feedback.
                </p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-8 flex items-center gap-3 text-sm text-slate-600"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
              <MapPin className="w-4 h-4 text-orange-600" />
            </span>
            <span>Vườn cam: Xã Trà Côn - Tỉnh Vĩnh Long · Store tại TP. Hồ Chí Minh</span>
          </motion.div>
        </div>
      </section>

      {/* FORM ĐẶT ONLINE */}
      <section>
        <div className={`${containerClass} py-10 md:py-14`}>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Đặt cam sành hữu cơ online
            </h2>
            <p className="mt-3 text-slate-600">
              Điền thông tin bên dưới, chúng tôi sẽ gọi hoặc nhắn Zalo để xác nhận đơn hàng, thống
              nhất thời gian giao và hình thức thanh toán.
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-8 max-w-2xl mx-auto rounded-2xl border border-orange-100 bg-orange-50/40 p-5 md:p-6 shadow-sm"
          >
            {/* Thông tin khách */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  name="phone"
                  required
                  className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
                  placeholder="09xx xxx xxx"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-800">
                Địa chỉ giao hàng <span className="text-red-500">*</span>
              </label>
              <input
                name="address"
                required
                className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              />
            </div>

            {/* Thông tin đơn hàng */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Sản phẩm muốn đặt <span className="text-red-500">*</span>
                </label>
                <select
                  name="product"
                  required
                  className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Chọn sản phẩm
                  </option>
                  <option value="Cam sành hữu cơ loại I">Cam sành hữu cơ loại I</option>
                  <option value="Nước ép cam sành tươi">Nước ép cam sành tươi</option>
                  <option value="Mứt cam sành nguyên vỏ">Mứt cam sành nguyên vỏ</option>
                  <option value="Siro cam sành nguyên chất">Siro cam sành nguyên chất</option>
                  <option value="Rượu cam sành ủ thảo mộc">Rượu cam sành ủ thảo mộc</option>
                  <option value="Cam sấy dẻo hữu cơ">Cam sấy dẻo hữu cơ</option>
                  <option value="Khác">Khác (ghi rõ ở ghi chú)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Số lượng dự kiến <span className="text-red-500">*</span>
                </label>
                <input
                  name="quantity"
                  required
                  className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
                  placeholder="Ví dụ: 5 kg, 2 thùng, 10 chai..."
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-800">Kênh liên hệ ưu tiên</label>
              <select
                name="channel"
                className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
                defaultValue="phone"
              >
                <option value="phone">Gọi điện</option>
                <option value="zalo">Zalo</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-800">Ghi chú thêm</label>
              <textarea
                name="note"
                rows={4}
                className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300 resize-y"
                placeholder="Ví dụ: Thời gian giao mong muốn, loại cam ưu tiên, yêu cầu xuất hoá đơn..."
              />
            </div>

            {/* ACTIONS */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs md:text-sm text-slate-500">
                Chúng tôi sẽ xác nhận đơn trong vòng <span className="font-semibold">1–2 giờ</span>{' '}
                (trong khung giờ làm việc).
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:underline"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Xem bảng sản phẩm
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-orange-600 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu đặt cam'}
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      </section>
    </main>
  )
}
