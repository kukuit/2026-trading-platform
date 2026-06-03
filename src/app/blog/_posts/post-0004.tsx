import Image from 'next/image'
import Link from 'next/link'

import { getPostById } from '../posts'

const p2 = getPostById('post-0002')
const p3 = getPostById('post-0003')

export default function Post0004() {
  return (
    <>
      <h2 className="mt-4">
        So sánh Vitamin C: cam sành và các thực phẩm “giàu C” như ổi, việt quất…
      </h2>

      <p className="mt-4">
        Nhắc đến Vitamin C, nhiều người nghĩ ngay tới <b className="italic">cam</b>. Nhưng thực tế,
        có những loại trái cây khác cũng rất nổi bật như <b className="italic">ổi</b>,{' '}
        <b className="italic">dâu tây</b>, hay một số loại quả mọng. Vậy cam sành đứng ở đâu trong
        “bảng xếp hạng” Vitamin C, và dùng sao cho hợp lý để tốt cho sức khoẻ mỗi ngày?
      </p>

      {/* Ảnh 1 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0004/so-sanh-vitamin-c.jpg"
          alt="So sánh Vitamin C giữa cam sành và các thực phẩm giàu Vitamin C"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        Trước hết, cần hiểu một điều đơn giản: <b className="italic">“giàu Vitamin C”</b> không chỉ
        là con số, mà còn là <b className="italic">thói quen dùng được đều</b>. Cam sành có lợi thế
        là dễ ăn, dễ vắt nước, dễ phối cùng bữa sáng — nhờ vậy bạn có thể duy trì lâu dài. Trong khi
        đó, ổi rất giàu C nhưng không phải ai cũng ăn mỗi ngày với lượng ổn định.
      </p>

      <p className="mt-4">
        Dưới đây là cách nhìn “thực tế” hơn khi so sánh (không cần quá ám ảnh con số tuyệt đối):
      </p>

      <ul className="mt-4 space-y-2 list-disc pl-5">
        <li>
          <b className="italic">Ổi:</b> thường được nhắc là nhóm rất giàu Vitamin C. Hợp nếu bạn ăn
          trực tiếp, nhai kỹ và không bị “ngại” vị chát nhẹ ở một số trái.
        </li>
        <li>
          <b className="italic">Cam sành:</b> mức Vitamin C tốt, đặc biệt tiện để uống dạng nước cam
          hoặc dùng kèm bữa ăn. Điểm mạnh là “dễ duy trì” và hương vị quen thuộc.
        </li>
        <li>
          <b className="italic">Việt quất/quả mọng:</b> nổi bật ở nhóm chất chống oxy hoá khác;
          Vitamin C có thể không phải lúc nào cũng cao bằng ổi tuỳ loại/khẩu phần, nhưng rất hợp để
          mix cùng sữa chua/yogurt và yến mạch.
        </li>
      </ul>

      {/* Ảnh 2 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0004/oi-giau-vitamin-c.jpg"
          alt="Ổi là một trong những loại trái cây thường được nhắc đến vì giàu Vitamin C"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        Nếu mục tiêu của bạn là <b className="italic">bổ sung Vitamin C đều đặn</b>, bạn có thể chọn
        một trong 3 “kịch bản” dễ áp dụng:
      </p>

      <ul className="mt-4 space-y-2 list-disc pl-5">
        <li>
          <b className="italic">Kịch bản 1 (đơn giản nhất):</b> uống 1 ly nước cam sành vào buổi
          sáng hoặc sau bữa ăn.
        </li>
        <li>
          <b className="italic">Kịch bản 2 (đa dạng hơn):</b> 2–3 ngày/tuần ăn ổi, các ngày còn lại
          duy trì cam sành.
        </li>
        <li>
          <b className="italic">Kịch bản 3 (cho bữa sáng healthy):</b> yogurt + trái cây (việt
          quất/quả mọng) và thêm cam sành ở ngày bạn cần “tươi tỉnh” hơn.
        </li>
      </ul>

      <p className="mt-4">
        Một lưu ý nhỏ để dùng “êm” hơn: nếu bạn có <b className="italic">dạ dày nhạy cảm</b>, hãy ưu
        tiên dùng cam <b className="italic">sau bữa ăn</b> thay vì lúc đói; và không cần ép uống quá
        nhiều trong một lần — đều đặn mới là quan trọng.
      </p>

      {/* Ảnh 3 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0004/cam-sanh-huu-co.jpg"
          alt="Cam sành hữu cơ – lựa chọn dễ dùng mỗi ngày"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

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
