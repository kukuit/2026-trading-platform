'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, type Variants } from 'framer-motion'
import {
  Leaf,
  Droplets,
  Scissors,
  ShieldCheck,
  Bug,
  Sprout,
  PlayCircle,
  FileCheck,
  ChevronRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
function LazyGoogleMap({
  embedSrc,
  title = 'Bản đồ Vườn Cam 7 Hùng',
}: {
  embedSrc: string
  title?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || loaded) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoaded(true)
          obs.disconnect()
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [loaded])

  return (
    <div
      ref={ref}
      className="relative rounded-3xl overflow-hidden border border-orange-100 bg-orange-50/60 aspect-video"
    >
      {loaded ? (
        <iframe
          title={title}
          src={embedSrc}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <p className="text-sm font-medium text-slate-800">Đang tải bản đồ…</p>
            <p className="mt-1 text-xs text-slate-600">
              Bản đồ sẽ hiển thị khi bạn kéo tới khu vực này.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AboutOrganicOrangePage() {
  return (
    <main className="">
      {/* SECTION 1 – HERO GIỚI THIỆU (bg cam rất nhạt) */}
      <section className="bg-orange-50/20">
        <div className={`${containerClass} pt-10 pb-12`}>
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr,1fr] gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs md:text-sm tracking-wide uppercase text-orange-600 font-semibold">
                Cam sành hữu cơ - Hành trình từ vườn đến bạn
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold leading-tight text-slate-900">
                Câu chuyện vườn cam sành hữu cơ Organic Orange
              </h1>
              <p className="mt-4 text-slate-600 max-w-prose">
                Từ mảnh vườn ở Vĩnh Long, chúng tôi chọn con đường canh tác hữu cơ: tôn trọng đất,
                nguồn nước và hệ sinh thái tự nhiên. Mỗi trái cam mang theo hương vị ngọt thanh,
                chua dịu, an toàn cho sức khỏe gia đình bạn.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm">
                    <Leaf className="w-3.5 h-3.5 text-orange-500" />
                  </span>
                  Không thuốc trừ sâu hóa học
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm">
                    <Sprout className="w-3.5 h-3.5 text-orange-500" />
                  </span>
                  Phân hữu cơ ủ hoai từ phụ phẩm nông nghiệp
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition"
                >
                  Xem sản phẩm từ vườn cam
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:underline"
                >
                  Liên hệ đặt mua
                </Link>
              </div>
            </motion.div>

            {/* Ảnh hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.1 }}
              className="relative"
            >
              <div className="relative w-full max-w-md mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-md ring-4 ring-orange-100/70 bg-white">
                <Image
                  src="/images/about/about-banner.jpg"
                  alt="Vườn cam sành hữu cơ"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 420px"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-4 left-6 hidden md:block rounded-xl bg-white/85 backdrop-blur px-4 py-2 shadow-sm border border-orange-100 text-xs text-slate-700">
                Vườn cam tại Xã Trà Côn - Vĩnh Long - Đất, nước và giống đều được chọn lọc
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2 – QUY TRÌNH CANH TÁC HỮU CƠ (bg trắng) */}
      <section className="bg-white">
        <div className={`${containerClass} py-12 md:py-16`}>
          <div className="max-w-3xl">
            <motion.h2
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="text-2xl md:text-3xl font-bold text-slate-900"
            >
              Quy trình trồng & chăm sóc cam sành hữu cơ
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mt-3 text-slate-600 leading-relaxed"
            >
              Thay vì chạy theo năng suất, chúng tôi tập trung nuôi dưỡng đất và cây. Mỗi bước đều
              được ghi chép, kiểm soát và điều chỉnh dựa trên thời tiết, tuổi cây và chu kỳ sinh
              trưởng tự nhiên.
            </motion.p>
          </div>

          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm">
                  <Sprout className="w-4 h-4 text-orange-500" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">Chuẩn bị đất & giống</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Đất được xới tơi, bổ sung phân hữu cơ ủ hoai 6–8 tháng, kiểm tra pH trước khi trồng.
                Giống cam sành khỏe, không bệnh, nguồn gốc rõ ràng.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm">
                  <Droplets className="w-4 h-4 text-orange-500" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  Tưới nước & bón phân hữu cơ
                </h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Tưới nước sạch từ mạch nước tự nhiên, hạn chế lãng phí. Bón phân hữu cơ ủ từ vỏ trái
                cây, phụ phẩm nông nghiệp, bổ sung vi sinh có lợi.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm">
                  <Scissors className="w-4 h-4 text-orange-500" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">Cắt cỏ & tỉa cành</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Cỏ trong vườn được cắt định kỳ, không dùng thuốc diệt cỏ. Cành sâu, cành già được
                tỉa để cây thông thoáng, hạn chế nấm bệnh tự nhiên.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm">
                  <Bug className="w-4 h-4 text-orange-500" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  Kiến vàng & phòng trừ sâu bệnh sinh học
                </h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Sử dụng đàn kiến vàng làm “người gác vườn”, hạn chế sâu hại. Khi cần, dùng chế phẩm
                sinh học thay vì thuốc hóa học, đảm bảo an toàn cho trái cam.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3 – MỘT NGÀY Ở VƯỜN CAM (bg cam rất nhạt) */}
      <section className="bg-orange-50/15">
        <div className={`${containerClass} py-12 md:py-16`}>
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-2xl md:text-3xl font-bold text-slate-900"
          >
            Một ngày ở vườn cam sành hữu cơ
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-3 text-slate-600 max-w-3xl"
          >
            Hoạt động mỗi ngày đều xoay quanh cây: quan sát lá, kiểm tra đất, theo dõi côn trùng,
            ghi chép lượng nước và phân bón. Mục tiêu là giữ cây khỏe thay vì xử lý bệnh khi đã
            muộn.
          </motion.p>

          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl overflow-hidden border border-orange-100 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-orange-50">
                <Image
                  src="/images/about/sang-kiem-tra-vuon.jpg"
                  alt="Buổi sáng kiểm tra vườn cam"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 320px"
                  loading="lazy"
                />
              </div>
              <div className="p-4 text-sm text-slate-700">
                <p className="font-semibold">Sáng: đi một vòng vườn</p>
                <p className="mt-1">
                  Kiểm tra lá non, quan sát sâu bệnh, đo độ ẩm đất để quyết định tưới nước.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl overflow-hidden border border-orange-100 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-orange-50">
                <Image
                  src="/images/about/tuoi-phan-huu-co.jpg"
                  alt="Tưới nước và bón phân hữu cơ cho cam"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 320px"
                  loading="lazy"
                />
              </div>
              <div className="p-4 text-sm text-slate-700">
                <p className="font-semibold">Trưa: tưới nước & bón phân</p>
                <p className="mt-1">
                  Phân hữu cơ hoai mục được bổ sung quanh tán, tưới kèm chế phẩm vi sinh để nuôi
                  đất.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl overflow-hidden border border-orange-100 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-orange-50">
                <Image
                  src="/images/about/chieu-thu-hoach-cam.jpg"
                  alt="Thu hoạch cam sành vào buổi chiều"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 320px"
                  loading="lazy"
                />
              </div>
              <div className="p-4 text-sm text-slate-700">
                <p className="font-semibold">Chiều: thu hoạch & phân loại</p>
                <p className="mt-1">
                  Chỉ những trái đạt độ chín, vỏ đẹp, không dập nát mới được chọn để đưa lên xe về
                  kho.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 4 – HÌNH ẢNH & VIDEO (bg trắng) */}
      <section className="bg-white">
        <div className={`${containerClass} py-12 md:py-16`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-8 items-center">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                Hình ảnh & video từ vườn cam
              </h2>
              <p className="text-slate-600">
                Chúng tôi ghi lại quá trình chăm sóc, thu hoạch và đóng gói cam sành hữu cơ để bạn
                có thể “đi tham quan” vườn cam ngay tại nhà.
              </p>
              <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                <li>Video giới thiệu vườn cam và quy trình hữu cơ.</li>
                <li>Hình ảnh từ lúc cây ra hoa đến khi trái chín.</li>
                <li>Quy trình phân loại, đóng gói và giao hàng.</li>
              </ul>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              {/* Khung video – bạn thay bằng iframe YouTube sau */}
              <div className="relative rounded-3xl overflow-hidden border border-orange-100 bg-orange-50/60 aspect-video flex items-center justify-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow-md"
                >
                  <PlayCircle className="w-5 h-5 text-orange-500" />
                  Xem video vườn cam (sẽ nhúng sau)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-orange-50 border border-orange-100">
                  <Image
                    src="/images/about/gallery-1.jpg"
                    alt="Vườn cam nhìn từ xa"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 160px"
                    loading="lazy"
                  />
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-orange-50 border border-orange-100">
                  <Image
                    src="/images/about/gallery-2.jpg"
                    alt="Cận cảnh trái cam sành hữu cơ"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 160px"
                    loading="lazy"
                  />
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-orange-50 border border-orange-100">
                  <Image
                    src="/images/about/gallery-3.jpg"
                    alt="Thu hoạch cam và đóng thùng"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 160px"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5 – GIẤY CHỨNG NHẬN (bg cam rất nhạt) */}
      <section className="bg-orange-50/15">
        <div className={`${containerClass} py-12 md:py-16`}>
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-2xl md:text-3xl font-bold text-slate-900"
          >
            Giấy chứng nhận cam sạch & kiểm định chất lượng
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-3 text-slate-600 max-w-3xl"
          >
            Bên cạnh việc tự quản lý vườn cam theo hướng hữu cơ, chúng tôi còn hợp tác với đơn vị
            kiểm định độc lập để đo dư lượng thuốc bảo vệ thực vật, chất lượng nước tưới và tiêu
            chuẩn an toàn thực phẩm.
          </motion.p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-[1.1fr,1fr] gap-8">
            <motion.div
              variants={staggerParent}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="space-y-4"
            >
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-orange-100 bg-white/90 p-4 flex items-start gap-3"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
                  <FileCheck className="w-4 h-4 text-orange-600" />
                </span>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">Chứng nhận VietGAP / GlobalGAP (khi có)</p>
                  <p className="mt-1">
                    Hồ sơ canh tác, nhật ký vườn và kết quả kiểm định được lưu lại định kỳ hằng năm.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-orange-100 bg-white/90 p-4 flex items-start gap-3"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                </span>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">Kiểm tra dư lượng thuốc BVTV</p>
                  <p className="mt-1">
                    Mẫu cam được gửi đến phòng thí nghiệm để đảm bảo không vượt ngưỡng cho phép và
                    phù hợp tiêu chuẩn an toàn.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-orange-100 bg-white/90 p-4 flex items-start gap-3"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
                  <Droplets className="w-4 h-4 text-orange-600" />
                </span>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">Kiểm định nguồn nước & đất</p>
                  <p className="mt-1">
                    Định kỳ kiểm tra độ pH, kim loại nặng trong nước tưới và đất để đảm bảo canh tác
                    bền vững.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="relative rounded-3xl overflow-hidden border border-orange-100 bg-white"
            >
              <Image
                src="/images/about/certificate-sample.jpg"
                alt="Giấy chứng nhận cam sạch (đang cập nhật)"
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 360px"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 7 – GOOGLE MAP (bg trắng hoặc cam nhạt) */}
      <section className="bg-white">
        <div className={`${containerClass} py-12 md:py-16`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1fr] gap-8 items-center">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Vị trí vườn cam</h2>
              <p className="text-slate-600 leading-relaxed">
                Bạn có thể xem vị trí vườn và bấm chỉ đường trực tiếp trên Google Maps. Nếu cần hẹn
                tham quan hoặc lấy hàng, cứ nhắn/gọi cho chúng tôi nhé.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="https://share.google/lFVzm0BDKhvkeWCag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition"
                >
                  Mở trên Google Maps
                  <ChevronRight className="w-4 h-4" />
                </a>

                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 transition"
                >
                  Liên hệ đặt mua
                </Link>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 text-sm text-slate-700">
                <p className="font-semibold">Gợi ý</p>
                <p className="mt-1">
                  Khi bạn bấm “Chỉ đường”, Google Maps sẽ tự chọn tuyến đường nhanh nhất từ vị trí
                  hiện tại.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <LazyGoogleMap
                title="Bản đồ Vườn Cam 7 Hùng"
                embedSrc="https://www.google.com/maps?q=V%C6%B0%E1%BB%9Dn%20Cam%207%20H%C3%B9ng&output=embed"
              />
              <p className="mt-2 text-xs text-slate-500">
                *Nếu bản đồ hiển thị sai điểm, nói mình biết để mình đổi sang embed theo Place ID
                (chuẩn tuyệt đối).
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 6 – CTA (bg trắng) */}
      <section className="bg-orange-50/15">
        <div className={`${containerClass} py-12 md:py-16 text-center`}>
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="text-2xl md:text-3xl font-bold text-slate-900"
          >
            Sẵn sàng thưởng thức cam sành hữu cơ từ vườn?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mt-3 text-slate-600 max-w-xl mx-auto"
          >
            Hãy đặt thử một thùng cam cho gia đình hoặc làm quà biếu. Chúng tôi sẽ tư vấn chọn loại
            phù hợp và giao tận nơi.
          </motion.p>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mt-6 flex flex-wrap justify-center gap-3"
          >
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-orange-600 transition"
            >
              Xem danh sách sản phẩm
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-50 transition"
            >
              Đặt cam online
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
