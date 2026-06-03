import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cam 7 Hùng | Liên hệ & đặt cam sành hữu cơ Vĩnh Long - giao nhanh từ vườn',
  description:
    'Liên hệ Cam 7 Hùng để đặt cam sành hữu cơ Vĩnh Long trực tiếp từ vườn. Gọi điện/Zalo/Facebook hoặc điền form đặt hàng online. Cam hữu cơ sạch, giàu vitamin C, hỗ trợ giao nhanh.',
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

    // theo ý định tìm kiếm trang contact
    'liên hệ cam 7 hùng',
    'liên hệ cam hữu cơ',
    'đặt cam sành hữu cơ',
    'mua cam hữu cơ',
    'mua cam sành vĩnh long',
    'giao cam tươi',
    'đặt hàng cam online',
    'đặt cam từ vườn',
    'zalo đặt cam',
  ],
  alternates: {
    canonical: 'https://camhuuco.vn/contact',
  },
  openGraph: {
    title: 'Cam 7 Hùng | Liên hệ đặt cam sành hữu cơ Vĩnh Long',
    description:
      'Đặt cam sành hữu cơ Vĩnh Long trực tiếp từ vườn Cam 7 Hùng: gọi điện/Zalo/Facebook hoặc điền form. Cam sạch, giàu vitamin C, giao nhanh.',
    url: 'https://camhuuco.vn/contact',
    siteName: 'Cam 7 Hùng',
    images: [
      {
        url: 'https://camhuuco.vn/images/banner-orange-1.png',
        width: 1200,
        height: 630,
        alt: 'Liên hệ đặt cam sành hữu cơ Vĩnh Long - Cam 7 Hùng',
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

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
