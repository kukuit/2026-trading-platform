// src/app/blog/post-0005/page.tsx
import Image from 'next/image'
import Link from 'next/link'

import { getPostById } from '../posts'

const p2 = getPostById('post-0003')
const p3 = getPostById('post-0004')

export default function Post0005() {
  return (
    <>
      <h2 className="mt-4">Vitamin C là gì? Tác dụng chính và vì sao cơ thể không tự tạo được</h2>

      <p className="mt-4">
        Vitamin C là một trong những vi chất quen thuộc nhất — nhưng nhiều người chỉ nhớ “uống để đỡ
        cảm”. Thực ra, Vitamin C còn liên quan tới <b className="italic">collagen</b>,{' '}
        <b className="italic">chống oxy hoá</b>, <b className="italic">hấp thu sắt</b> và nhiều hoạt
        động quan trọng khác trong cơ thể.
      </p>

      {/* Ảnh 1 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0005/vitamin-c-la-gi.jpg"
          alt="Vitamin C là gì – hình minh hoạ trái cây giàu Vitamin C"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        Vậy Vitamin C là gì, tác dụng chính ra sao, và vì sao cơ thể chúng ta{' '}
        <b className="italic">không tự tạo</b> được Vitamin C mà phải bổ sung từ thực phẩm hằng
        ngày? Bài viết này sẽ giải thích theo cách dễ hiểu, thực tế và dễ áp dụng.
      </p>

      <p className="mt-4">
        <b className="italic">Vitamin C (axit ascorbic)</b> là vitamin tan trong nước. Điều này có
        nghĩa là cơ thể không “dự trữ” được quá nhiều như một số vitamin tan trong dầu. Vì vậy, cách
        tốt nhất là bổ sung <b className="italic">đều đặn</b> mỗi ngày thay vì dồn vào một lần.
      </p>

      <p className="mt-4">Dưới đây là những vai trò nổi bật nhất của Vitamin C mà bạn nên biết:</p>

      <ul className="mt-4 space-y-2 list-disc pl-5">
        <li>
          <b className="italic">Hỗ trợ tạo collagen:</b> nền tảng cho da, mạch máu, mô liên kết; góp
          phần giúp vết thương lành tốt hơn.
        </li>
        <li>
          <b className="italic">Chống oxy hoá:</b> hỗ trợ bảo vệ tế bào khỏi tác động của “gốc tự
          do” trong quá trình chuyển hoá.
        </li>
        <li>
          <b className="italic">Hỗ trợ hệ miễn dịch:</b> giúp cơ thể duy trì hàng rào bảo vệ tự
          nhiên.
        </li>
        <li>
          <b className="italic">Tăng hấp thu sắt:</b> đặc biệt hữu ích với sắt từ thực vật (rau,
          đậu, ngũ cốc…).
        </li>
      </ul>

      {/* Ảnh 2 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0005/tac-dung-vitamin-c.jpg"
          alt="Các tác dụng chính của Vitamin C như collagen, miễn dịch, chống oxy hoá"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        <b className="italic">Vì sao cơ thể không tự tạo được Vitamin C?</b> Đây là điểm thú vị:
        nhiều loài động vật có thể tự tổng hợp Vitamin C, nhưng con người (và một số loài khác) lại
        thiếu một “mắt xích” quan trọng trong chuỗi phản ứng tạo ra Vitamin C. Nói đơn giản, cơ thể
        chúng ta <b className="italic">không có đủ enzyme cần thiết</b> để tự sản xuất Vitamin C,
        nên phải lấy từ thực phẩm.
      </p>

      <p className="mt-4">
        Vì vậy, thay vì hỏi “có cần Vitamin C không?”, câu hỏi thực tế hơn là:{' '}
        <b className="italic">mình bổ sung đều chưa?</b> Và bổ sung theo cách nào để dễ duy trì?
      </p>

      <p className="mt-4">
        <b className="italic">Gợi ý dùng hằng ngày (dễ áp dụng):</b>
      </p>

      <ul className="mt-4 space-y-2 list-disc pl-5">
        <li>Ăn trái cây giàu Vitamin C trong ngày (cam, ổi, kiwi, dâu… tuỳ mùa và khẩu vị).</li>
        <li>
          Nếu bạn hay ăn rau/đậu/ngũ cốc (nguồn sắt thực vật), hãy kết hợp thêm trái cây giàu
          Vitamin C để hỗ trợ hấp thu sắt.
        </li>
        <li>
          Nếu dạ dày nhạy cảm, ưu tiên dùng trái cây họ cam quýt{' '}
          <b className="italic">sau bữa ăn</b> thay vì lúc đói.
        </li>
      </ul>

      <p className="mt-4">
        Xem thêm:{' '}
        {p2 ? (
          <Link href={`/blog/${p2.slug}`} className="text-orange-600 hover:underline">
            {p2.title}
          </Link>
        ) : null}
        {p2 && p3 ? <>{' • '}</> : null}
        {p3 ? (
          <Link href={`/blog/${p3.slug}`} className="text-orange-600 hover:underline">
            {p3.title}
          </Link>
        ) : null}
      </p>
    </>
  )
}
