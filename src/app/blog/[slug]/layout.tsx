import Link from 'next/link'
import Image from 'next/image'
import { POSTS } from '../posts'

export default function BlogSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const current = POSTS.find((p) => p.slug === params.slug)

  const latest = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3)

  const related = current
    ? POSTS.filter((p) => p.slug !== current.slug && p.tag && p.tag === current.tag).slice(0, 3)
    : []

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {children}

      {/* CTA cuối bài */}
      <section className="mt-10">
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

      {/* Bài mới nhất */}
      <section className="mt-10">
        <h3 className="text-lg font-extrabold text-gray-900">Bài mới nhất</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {latest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
              <div className="rounded-2xl border bg-white overflow-hidden hover:shadow-sm transition-shadow">
                <div className="relative w-full aspect-[4/3] bg-gray-100">
                  <Image
                    src={p.thumbnail}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                <div className="p-3">
                  <div className="text-xs text-gray-500">{p.date}</div>
                  <div className="mt-1 font-bold text-gray-900 line-clamp-2 group-hover:underline">
                    {p.title}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bài liên quan */}
      {related.length > 0 && (
        <section className="mt-10">
          <h3 className="text-lg font-extrabold text-gray-900">Bài liên quan</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
                <div className="rounded-2xl border bg-white overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="relative w-full aspect-[4/3] bg-gray-100">
                    <Image
                      src={p.thumbnail}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-gray-500">{p.date}</div>
                    <div className="mt-1 font-bold text-gray-900 line-clamp-2 group-hover:underline">
                      {p.title}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
