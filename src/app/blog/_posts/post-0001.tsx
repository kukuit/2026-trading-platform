import Image from 'next/image'
import Link from 'next/link'

export default function Post0001() {
  return (
    <>
      {/* Hook SEO mở bài */}
      <p className="mt-4">
        Nhắc tới <strong>vitamin C</strong>, nhiều người nghĩ ngay đến cam — nhưng{' '}
        <strong>cam sành</strong> có thật sự là nguồn bổ sung “đáng tiền” mỗi ngày không? Bài này sẽ
        giúp bạn hiểu vitamin C làm gì cho cơ thể, vì sao nên bổ sung đều đặn và cách ăn cam sành
        sao cho dạ dày vẫn dễ chịu.
      </p>

      <h2>Vitamin C là gì? Vì sao cơ thể cần mỗi ngày?</h2>
      <p className="mt-4">
        Vitamin C (ascorbic acid) là một vitamin <strong>tan trong nước</strong>. Cơ thể chúng ta
        không tự tổng hợp được và cũng <strong>không dự trữ lâu</strong>, nên cách đơn giản nhất là
        bổ sung đều đặn hằng ngày qua thực phẩm.
      </p>
      <p className="mt-4">
        Vitamin C tham gia vào nhiều “việc quan trọng”: hỗ trợ miễn dịch, góp phần tạo{' '}
        <strong>collagen</strong> (da – nướu – mạch máu), chống oxy hoá và giúp cơ thể{' '}
        <strong>hấp thu sắt</strong> tốt hơn từ bữa ăn.
      </p>

      <h2>Cam sành có nhiều vitamin C không?</h2>
      <p className="mt-4">
        Có, nhưng đừng quá ám ảnh con số. Hàm lượng vitamin C có thể thay đổi theo giống cam, độ
        chín và cách bảo quản. Điều “ăn điểm” nhất vẫn là:{' '}
        <strong>ăn cam tươi đúng cách và đều đặn</strong> — vậy là bạn đã bổ sung vitamin C tự nhiên
        mỗi ngày rồi.
      </p>

      <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
        <figure className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
          <Image
            src="/images/blogs/post-0001/vitamin-c.jpg"
            alt="Vitamin C trong cam sành giúp miễn dịch, tạo collagen và hỗ trợ hấp thu sắt"
            fill
            className="object-cover"
          />
        </figure>

        <div className="rounded-2xl border bg-white p-5">
          <div className="font-extrabold text-gray-900">Mẹo nhanh (dễ nhớ)</div>
          <ul className="mt-3 text-sm text-gray-700 space-y-2">
            <li>
              <strong>Ăn cam tươi</strong> là tốt nhất; hạn chế để lâu sau khi bóc.
            </li>
            <li>
              Nếu dạ dày nhạy: <strong>ăn sau bữa</strong> hoặc chia nhỏ lượng.
            </li>
            <li>Không cần “vitamin C liều cao” nếu bữa ăn đã cân đối.</li>
          </ul>
        </div>
      </div>

      <h2 className="mt-4">3 lợi ích nổi bật khi bổ sung vitamin C từ cam</h2>

      <h3 className="mt-3 font-bold italic">1- Hỗ trợ miễn dịch theo cách tự nhiên</h3>
      <p className="mt-4">
        Khi sinh hoạt bận rộn, ngủ thiếu hoặc thời tiết thất thường, việc bổ sung vitamin C đều đặn
        từ trái cây như cam giúp cơ thể “đỡ hụt” hơn trong nhịp sống hằng ngày.
      </p>

      <h3 className="mt-3 font-bold italic">2- Góp phần tạo collagen cho da – nướu – mạch máu</h3>
      <p className="mt-4">
        Collagen giống như “khung sườn” của mô liên kết. Vitamin C là một mắt xích quan trọng để cơ
        thể tổng hợp collagen hiệu quả, nhất là khi bạn ăn uống đủ chất.
      </p>

      <h3 className="mt-3 font-bold italic">3- Hỗ trợ hấp thu sắt tốt hơn</h3>

      <p className="mt-4">
        Nếu bữa ăn có rau, đậu, ngũ cốc hoặc thịt, vitamin C có thể hỗ trợ cơ thể hấp thu sắt tốt
        hơn. Một mẹo đơn giản: <strong>ăn cam sau bữa</strong> (hoặc ăn kèm bữa phụ) để dễ chịu hơn.
      </p>

      <h2>Cách ăn cam sành “đúng” để dạ dày dễ chịu</h2>
      <p className="mt-4">
        Nếu bạn dễ “xót ruột”, ợ chua hoặc dạ dày nhạy cảm: hãy ưu tiên ăn cam{' '}
        <strong>sau bữa ăn</strong> hoặc bữa phụ, tránh ăn khi quá đói. Khi mới tập thói quen, bạn
        có thể <strong>chia nhỏ</strong> (mỗi lần vài múi) để cơ thể thích nghi.
      </p>

      <div className="not-prose mt-6 relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
        <Image
          src="/images/blogs/post-0001/cach-an.jpg"
          alt="Cách ăn cam sành đúng: ăn sau bữa, tránh lúc đói nếu dạ dày nhạy cảm"
          fill
          className="object-cover"
        />
      </div>

      <h2 className="mt-4">Ai nên lưu ý khi ăn cam?</h2>
      <ul>
        <li>
          <strong>Dạ dày nhạy cảm</strong>: tránh ăn lúc đói, chia nhỏ lượng, ưu tiên sau bữa.
        </li>
        <li>
          <strong>Đang kiểm soát đường</strong>: ưu tiên <strong>ăn nguyên múi</strong>, cân đối
          tổng lượng trái cây trong ngày.
        </li>
        <li>
          <strong>Trẻ nhỏ</strong>: ăn lượng vừa phải, nên ăn sau bữa; tránh để bé ăn quá nhiều một
          lúc.
        </li>
      </ul>

      <h2>FAQ nhanh</h2>

      <h3>Ăn cam hay vắt nước cam tốt hơn?</h3>
      <p className="mt-4">
        Nếu có thể, <strong>ăn nguyên múi</strong> thường lợi hơn vì có chất xơ. Nước cam dễ uống
        nhanh, nhưng nếu lọc kỹ thì chất xơ giảm đi — vì vậy hãy cân đối theo thói quen và mục tiêu
        của bạn.
      </p>

      {/* Kết bài (không HR, không CTA) */}
      <p className="mt-6">
        Tóm lại, vitamin C rất cần cho cơ thể và cam sành là một cách bổ sung đơn giản, dễ duy trì.
        Bạn chỉ cần ưu tiên ăn cam tươi, ăn đều đặn; nếu dạ dày nhạy cảm thì ăn sau bữa và chia nhỏ
        lượng để luôn “dễ chịu”.
      </p>

      <p className="mt-6">
        Xem thêm:{' '}
        <Link
          href="/blog/an-cam-moi-ngay-co-tot-khong-ai-nen-luu-y"
          className="text-orange-600 hover:underline"
        >
          Ăn cam mỗi ngày có tốt không? Ai nên lưu ý?
        </Link>
      </p>
    </>
  )
}
