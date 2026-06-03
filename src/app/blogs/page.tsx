import Link from 'next/link'
import Image from 'next/image'
import { POSTS } from './../blog/posts'

export default function BlogPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-orange-600 font-semibold">BLOG CAM HỮU CƠ</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">
          Kiến thức về cam sành, Vitamin C & sức khoẻ
        </h1>
        <p className="mt-3 text-gray-600">
          Chia sẻ ngắn gọn, dễ hiểu từ vườn cam ở Vĩnh Long: dinh dưỡng, cách dùng cam đúng, và câu
          chuyện hữu cơ.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p) => (
          <article
            key={p.slug}
            className="rounded-2xl border bg-white overflow-hidden hover:shadow-sm transition-shadow"
          >
            <Link href={`/blog/${p.slug}`} className="block">
              <div className="relative w-full aspect-[4/3] bg-gray-100">
                <Image
                  src={p.thumbnail}
                  alt={p.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            </Link>

            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  {p.tag || 'Blog'}
                </span>
                <time className="text-xs text-gray-500">{p.date}</time>
              </div>

              <h2 className="mt-3 text-lg font-bold text-gray-900 line-clamp-2">
                <Link href={`/blog/${p.slug}`} className="hover:underline">
                  {p.title}
                </Link>
              </h2>

              <p className="mt-2 text-gray-600 text-sm leading-relaxed line-clamp-3">{p.excerpt}</p>

              <div className="mt-4">
                <Link
                  href={`/blog/${p.slug}`}
                  className="text-orange-600 font-semibold hover:underline"
                >
                  Đọc tiếp →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10 max-w-3xl">
        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-5">
          <div className="font-semibold text-gray-900">
            🍊 Cam sành hữu cơ đang thu hoạch –{' '}
            <Link href="/products" className="text-orange-600 hover:underline">
              Xem sản phẩm
            </Link>
          </div>
          <div className="mt-2 text-gray-600">
            Bạn muốn mua cam trực tiếp từ vườn?{' '}
            <Link href="/contact" className="text-orange-600 hover:underline">
              → Liên hệ
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
