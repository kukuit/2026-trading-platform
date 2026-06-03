import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cam 7 Hùng | Quy trình trồng cam sành hữu cơ Vĩnh Long & câu chuyện vườn cam',
  description:
    'Tìm hiểu quy trình canh tác cam sành hữu cơ tại vườn Vĩnh Long của Cam 7 Hùng: hạn chế hóa chất, không thuốc diệt cỏ, ưu tiên phân hữu cơ & biện pháp sinh học. Cam hữu cơ sạch, giàu vitamin C.',
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

    // bổ trợ theo nội dung trang About
    'quy trình trồng cam sành hữu cơ',
    'quy trình cam hữu cơ',
    'vườn cam vĩnh long',
    'vườn cam hữu cơ',
    'canh tác hữu cơ',
    'cam sạch',
    'vitamin c',
  ],
  alternates: {
    canonical: 'https://camhuuco.vn/about',
  },
  openGraph: {
    title: 'Cam 7 Hùng | Câu chuyện vườn cam sành hữu cơ Vĩnh Long',
    description:
      'Hành trình từ vườn đến bàn của Cam 7 Hùng: quy trình trồng & chăm sóc cam sành hữu cơ tại Vĩnh Long, an toàn cho gia đình, giàu vitamin C.',
    url: 'https://camhuuco.vn/about',
    siteName: 'Cam 7 Hùng',
    images: [
      {
        url: 'https://camhuuco.vn/images/about/hero-vuon-cam.jpg',
        width: 1200,
        height: 630,
        alt: 'Vườn cam sành hữu cơ Vĩnh Long - Cam 7 Hùng',
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

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
