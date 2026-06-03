import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cam 7 Hùng | Sản phẩm cam sành hữu cơ Vĩnh Long - sạch, giàu Vitamin C',
  description:
    'Danh sách sản phẩm từ cam sành hữu cơ Vĩnh Long của Cam 7 Hùng: cam tươi, nước ép cam, mứt cam, siro cam. Cam hữu cơ sạch, giàu vitamin C, giao hàng nhanh từ vườn.',
  keywords: [
    // Ưu tiên theo bộ keyword mới
    'cam 7 hùng',
    'cam 7 hung',
    'cam hữu cơ',
    'cam sành hữu cơ',
    'cam sanh hữu cơ',
    'cam vĩnh long',
    'cam sành vĩnh long',
    'cam sanh vĩnh long',

    // theo nội dung trang products
    'sản phẩm cam sành hữu cơ',
    'cam tươi vĩnh long',
    'nước ép cam',
    'nước ép cam hữu cơ',
    'mứt cam',
    'mứt cam hữu cơ',
    'siro cam',
    'siro cam hữu cơ',
    'vitamin c',
  ],
  alternates: {
    canonical: 'https://camhuuco.vn/products',
  },
  openGraph: {
    title: 'Sản phẩm Cam 7 Hùng | Cam sành hữu cơ Vĩnh Long',
    description:
      'Các sản phẩm từ cam sành hữu cơ Vĩnh Long: cam tươi, nước ép, mứt cam, siro – giàu vitamin C, an toàn cho gia đình.',
    url: 'https://camhuuco.vn/products',
    siteName: 'Cam 7 Hùng',
    images: [
      {
        url: 'https://camhuuco.vn/images/products/orange-1.jpg',
        width: 1200,
        height: 630,
        alt: 'Sản phẩm cam sành hữu cơ Vĩnh Long - Cam 7 Hùng',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
