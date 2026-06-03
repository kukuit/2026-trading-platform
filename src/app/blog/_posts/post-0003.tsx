import Link from 'next/link'

export default function Post0003() {
  return (
    <>
      <h2 className="mt-4">Ăn cam mỗi ngày có tốt không?</h2>
      <p>
        Với đa số người, ăn cam đều đặn giúp bổ sung vitamin C và chất chống oxy hoá. Tuy nhiên, nên
        ăn lượng vừa phải và phù hợp cơ địa.
      </p>

      <h2 className="mt-4">Nên ăn bao nhiêu là hợp lý?</h2>
      <ul>
        <li>Người lớn: thường 1 quả/ngày hoặc chia 2 lần</li>
        <li>Trẻ nhỏ: ăn lượng vừa, ưu tiên ăn sau bữa</li>
      </ul>

      <h2 className="mt-4">Ai nên lưu ý khi ăn cam?</h2>
      <ul>
        <li>Dạ dày nhạy cảm: tránh ăn lúc đói</li>
        <li>Đang kiểm soát đường: ưu tiên ăn nguyên múi, cân đối trái cây trong ngày</li>
        <li>Trẻ nhỏ: theo dõi phản ứng, tránh ăn quá nhiều một lúc</li>
      </ul>

      <p className="mt-4">
        Xem thêm:{' '}
        <Link
          href="/blog/cam-huu-co-khac-cam-thuong-nhu-the-nao"
          className="text-orange-600 hover:underline"
        >
          Cam hữu cơ khác cam thường như thế nào?
        </Link>
      </p>
    </>
  )
}
