// src/app/blog/posts.ts

export type Post = {
  id: string // 'post-0001'
  title: string
  slug: string
  excerpt: string
  date: string // YYYY-MM-DD
  tag?: string
  thumbnail: string
  hero?: string
}

export const getPostById = (id: string) => POSTS.find((p) => p.id === id)

export const POSTS: Post[] = [
  {
    id: 'post-0001',
    title: 'Vitamin C trong cam sành: lợi ích & cách dùng đúng',
    slug: 'vitamin-c-trong-cam-sanh-loi-ich-va-cach-dung-dung',
    excerpt:
      'Vitamin C hỗ trợ miễn dịch, hấp thu sắt và chống oxy hoá. Bài viết tổng hợp cách dùng phù hợp và lưu ý khi ăn cam hằng ngày.',
    date: '2025-12-26',
    tag: 'Dinh dưỡng',
    thumbnail: '/images/blogs/post-0001/thumbnail.jpg',
    hero: '/images/blogs/post-0001/hero.jpg',
  },
  {
    id: 'post-0002',
    title: 'Cam hữu cơ khác cam thường như thế nào?',
    slug: 'cam-huu-co-khac-cam-thuong-nhu-the-nao',
    excerpt:
      'Không chỉ là “không thuốc”. Hữu cơ còn là cách chăm đất, nước và hệ sinh thái để cây khoẻ tự nhiên, trái ngon theo mùa.',
    date: '2025-12-26',
    tag: 'Hữu cơ',
    thumbnail: '/images/blogs/post-0002/thumbnail.jpg',
    hero: '/images/blogs/post-0002/hero.jpg',
  },
  {
    id: 'post-0003',
    title: 'Ăn cam mỗi ngày có tốt không? Ai nên lưu ý?',
    slug: 'an-cam-moi-ngay-co-tot-khong-ai-nen-luu-y',
    excerpt:
      'Cam tốt nhưng không phải ai cũng dùng giống nhau. Người đau dạ dày, tiểu đường, trẻ nhỏ… nên chú ý cách ăn và thời điểm.',
    date: '2025-12-26',
    tag: 'Sức khoẻ',
    thumbnail: '/images/blogs/post-0003/thumbnail.jpg',
    hero: '/images/blogs/post-0003/hero.jpg',
  },
  {
    id: 'post-0004',
    title: 'So sánh Vitamin C: cam sành và các thực phẩm “giàu C” như ổi, việt quất…',
    slug: 'so-sanh-vitamin-c-cam-sanh-oi-viet-quat',
    excerpt:
      'Cam sành nổi bật vì dễ dùng mỗi ngày. Bài viết so sánh Vitamin C giữa cam sành và một số thực phẩm giàu C (ổi, việt quất…), kèm gợi ý ăn/uống hợp lý.',
    date: '2026-01-05',
    tag: 'Dinh dưỡng',
    thumbnail: '/images/blogs/post-0004/thumbnail.jpg',
    hero: '/images/blogs/post-0004/hero.jpg',
  },
  {
    id: 'post-0005',
    title: 'Vitamin C là gì? Tác dụng chính và vì sao cơ thể không tự tạo được',
    slug: 'vitamin-c-la-gi-tac-dung-chinh-va-vi-sao-co-the-khong-tu-tao-duoc',
    excerpt:
      'Vitamin C không chỉ “đỡ cảm”. Bài viết giải thích Vitamin C là gì, các tác dụng chính (collagen, chống oxy hoá, miễn dịch, hấp thu sắt) và vì sao cơ thể phải bổ sung từ thực phẩm.',
    date: '2026-01-06',
    tag: 'Dinh dưỡng',
    thumbnail: '/images/blogs/post-0005/thumbnail.jpg',
    hero: '/images/blogs/post-0005/hero.jpg',
  },
  {
    id: 'post-0006',
    title: 'Nhu cầu Vitamin C mỗi ngày bao nhiêu là đủ? (theo độ tuổi)',
    slug: 'nhu-cau-vitamin-c-moi-ngay-bao-nhieu-la-du-theo-do-tuoi',
    excerpt:
      'Vitamin C tan trong nước nên cần bổ sung đều mỗi ngày. Bài viết tổng hợp nhu cầu Vitamin C khuyến nghị theo độ tuổi/giới tính (kể cả mang thai, cho con bú), lưu ý cho người hút thuốc và ngưỡng tối đa nên tránh.',
    date: '2026-01-08',
    tag: 'Dinh dưỡng',
    thumbnail: '/images/blogs/post-0006/thumbnail.jpg',
    hero: '/images/blogs/post-0006/hero.jpg',
  },
]
