import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { POSTS } from '../posts'
import { POST_COMPONENTS } from '../post-registry'

type Props = { params: { slug: string } }

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const post = POSTS.find((p) => p.slug === params.slug)
  if (!post) return {}

  const canonical = `https://camhuuco.vn/blog/${post.slug}`

  return {
    title: `${post.title} | Cam Hữu Cơ`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonical,
      type: 'article',
      images: [post.hero || post.thumbnail],
    },
  }
}

function ArticleJsonLd({
  slug,
  title,
  excerpt,
  date,
  image,
}: {
  slug: string
  title: string
  excerpt: string
  date: string
  image: string
}) {
  const canonical = `https://camhuuco.vn/blog/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    image: [`https://camhuuco.vn${image}`],
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: 'Cam Hữu Cơ' },
    publisher: { '@type': 'Organization', name: 'Cam Hữu Cơ' },
    mainEntityOfPage: canonical,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function BlogSlugPage({ params }: Props) {
  const post = POSTS.find((p) => p.slug === params.slug)
  if (!post) return notFound()

  const hero = post.hero || post.thumbnail
  const Render = POST_COMPONENTS[post.id]

  return (
    <article className="prose prose-gray max-w-none">
      <ArticleJsonLd
        slug={post.slug}
        title={post.title}
        excerpt={post.excerpt}
        date={post.date}
        image={hero}
      />

      <header className="not-prose">
        <p className="text-orange-600 font-semibold">{post.tag || 'Blog'}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">{post.title}</h1>
        <div className="mt-3 text-sm text-gray-500">Cập nhật: {post.date}</div>
        <p className="mt-3 text-gray-600">{post.excerpt}</p>

        <div className="mt-6 relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
          <Image src={hero} alt={post.title} fill className="object-cover" priority />
        </div>
      </header>

      {Render ? <Render /> : <p>Nội dung đang cập nhật.</p>}
    </article>
  )
}
