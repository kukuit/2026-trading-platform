'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ShoppingCart, ChevronRight } from 'lucide-react'

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

const products = [
  {
    name: 'Cam sành hữu cơ loại I',
    desc: 'Trái to, vỏ mỏng, ngọt thanh, canh tác 100% theo tiêu chuẩn hữu cơ.',
    price: '65.000đ / kg',
    img: '/images/products/orange-1.jpg',
    badge: 'Bán chạy',
  },
  {
    name: 'Nước ép cam sành tươi',
    desc: 'Ép lạnh từ cam sành hữu cơ, giữ trọn vitamin C, không chất bảo quản.',
    price: '35.000đ / chai 330ml',
    img: '/images/products/orange-2.jpg',
    badge: 'Ưa chuộng',
  },
  {
    name: 'Mứt cam sành nguyên vỏ',
    desc: 'Mứt cam sành dẻo, ít đường, giữ hương thơm tự nhiên của vỏ cam.',
    price: '75.000đ / hũ 250g',
    img: '/images/products/orange-3.jpg',
    badge: 'Mùa lễ Tết',
  },
  {
    name: 'Siro cam sành nguyên chất',
    desc: 'Nấu từ nước ép cam sành hữu cơ, cô đặc, không màu tổng hợp, pha nước hoặc soda.',
    price: '95.000đ / chai 500ml',
    img: '/images/products/orange-syrup.jpg',
    badge: 'Pha chế',
  },
  {
    name: 'Rượu cam sành ủ thảo mộc',
    desc: 'Rượu nếp ủ cùng cam sành, vỏ cam và thảo mộc, hương thơm dịu, dùng trong bữa ăn.',
    price: '180.000đ / chai 750ml',
    img: '/images/products/orange-wine.jpg',
    badge: 'Quà biếu',
  },
  {
    name: 'Cam sấy dẻo hữu cơ',
    desc: 'Miếng cam sành sấy dẻo, giữ màu tự nhiên, không chất bảo quản, ăn vặt hoặc pha trà.',
    price: '85.000đ / túi 200g',
    img: '/images/products/orange-dried.jpg',
    badge: 'Snack lành mạnh',
  },
]

export default function ProductsPage() {
  return (
    <main className="bg-white pb-20">
      {/* HERO / TITLE */}
      <section className="bg-orange-50/20 border-b border-orange-100">
        <div className={`${containerClass} py-10`}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <p className="text-xs md:text-sm tracking-wide uppercase text-orange-600 font-semibold">
              Sản phẩm từ cam sành hữu cơ
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
              Danh sách sản phẩm Organic Orange
            </h1>
            <p className="mt-4 text-slate-600">
              Tất cả sản phẩm đều được làm từ cam sành hữu cơ tại vườn, thu hoạch đúng vụ, chế biến
              với quy trình rõ ràng. Phù hợp dùng hằng ngày, làm quà biếu hoặc cho sự kiện.
            </p>
          </motion.div>
        </div>
      </section>

      {/* GRID PRODUCTS */}
      <section>
        <div className={`${containerClass} pt-10 md:pt-12`}>
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {products.map((p) => (
              <motion.article
                key={p.name}
                variants={fadeInUp}
                className="flex flex-col rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden"
              >
                <div className="relative w-full aspect-[4/3] bg-orange-50">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 320px"
                    loading="lazy"
                  />
                  {p.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-orange-500/90 text-white text-[11px] font-semibold px-3 py-1">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h2 className="text-base font-semibold text-slate-900">{p.name}</h2>
                  <p className="mt-2 text-sm text-slate-600 flex-1">{p.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-orange-600">{p.price}</span>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/contact"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Đặt hàng sản phẩm này
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {/* CTA bên dưới */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-10 text-center"
          >
            <p className="text-sm text-slate-600">
              Cần tư vấn chọn sản phẩm phù hợp để làm quà hoặc cho sự kiện?
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-orange-600 transition"
              >
                Liên hệ đặt hàng
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:underline"
              >
                Quay lại trang chủ
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
